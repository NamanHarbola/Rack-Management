from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import re

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection configuration
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME')

if not mongo_url or not db_name:
    raise RuntimeError("MONGO_URL and DB_NAME must be set in the .env file")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI(title="Madan Store Inventory API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# --- Models ---

class RackCreate(BaseModel):
    rackNumber: str
    floor: str
    items: List[str] = Field(default_factory=list)

class RackUpdate(BaseModel):
    rackNumber: Optional[str] = None
    floor: Optional[str] = None
    items: Optional[List[str]] = None

class Rack(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rackNumber: str
    floor: str
    items: List[str] = Field(default_factory=list)
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class RackSearchResponse(BaseModel):
    racks: List[Rack]
    matchedItems: Dict[str, List[str]]  # rack_id -> matched items

class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# --- Endpoints ---

@api_router.post("/racks", response_model=Rack)
async def create_rack(rack_data: RackCreate):
    """Create a new rack entry in the database."""
    try:
        rack_obj = Rack(**rack_data.model_dump())
        await db.racks.insert_one(rack_obj.model_dump())
        return rack_obj
    except Exception as e:
        logging.error(f"Error creating rack: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@api_router.get("/racks", response_model=Dict[str, List[Rack]])
async def get_all_racks(
    page: int = Query(1, ge=1),
    limit: int = Query(5, ge=1, le=20)
):
    """Get racks grouped by floor using a database-side aggregation pipeline."""
    try:
        skip = (page - 1) * limit
        
        # 1. Get distinct floors to handle pagination correctly
        all_floors = await db.racks.distinct("floor")
        all_floors.sort()
        paginated_floors = all_floors[skip : skip + limit]
        
        if not paginated_floors:
            return {}

        # 2. Aggregation pipeline to group racks by floor
        pipeline = [
            {"$match": {"floor": {"$in": paginated_floors}}},
            {"$sort": {"rackNumber": 1}},
            {
                "$group": {
                    "_id": "$floor",
                    "racks": {"$push": "$$ROOT"}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        cursor = db.racks.aggregate(pipeline)
        results = await cursor.to_list(length=limit)
        
        # 3. Format response into { "floor_name": [RackObjects] }
        return {res["_id"]: [Rack(**r) for r in res["racks"]] for res in results}
    except Exception as e:
        logging.error(f"Error fetching aggregated racks: {e}")
        raise HTTPException(status_code=500, detail="Database query failed")

@api_router.get("/racks/search", response_model=RackSearchResponse)
async def search_racks(q: str = Query(..., min_length=1)):
    """Full-text search across rack numbers, floors, and items."""
    try:
        query = { "$text": { "$search": q } }
        cursor = db.racks.find(query).limit(100)
        racks = await cursor.to_list(length=100)
        
        rack_objects = [Rack(**rack) for rack in racks]
        
        # Regex for highlighting matched items in the frontend
        search_regex = re.compile(re.escape(q), re.IGNORECASE)
        matched_items = {}
        for rack in rack_objects:
            matches = [item for item in rack.items if search_regex.search(item)]
            if matches:
                matched_items[rack.id] = matches
        
        return RackSearchResponse(racks=rack_objects, matchedItems=matched_items)
    except Exception as e:
        logging.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail="Search operation failed")

@api_router.put("/racks/{rack_id}", response_model=Rack)
async def update_rack(rack_id: str, rack_update: RackUpdate):
    """Update existing rack details."""
    try:
        update_data = {k: v for k, v in rack_update.model_dump().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
            
        update_data["updatedAt"] = datetime.utcnow()
        
        result = await db.racks.update_one({"id": rack_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Rack not found")
            
        updated_rack = await db.racks.find_one({"id": rack_id})
        return Rack(**updated_rack)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Update error for {rack_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update rack")

@api_router.delete("/racks/{rack_id}")
async def delete_rack(rack_id: str):
    """Delete a rack by its unique UUID."""
    try:
        result = await db.racks.delete_one({"id": rack_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Rack not found")
        return {"message": "Rack successfully removed"}
    except Exception as e:
        logging.error(f"Delete error for {rack_id}: {e}")
        raise HTTPException(status_code=500, detail="Deletion failed")

# --- Middleware & Lifecycle ---

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"], # In production, replace with your frontend URL
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db():
    """Ensure indexes exist for performance and search capability."""
    try:
        # Full-text index for the search endpoint
        await db.racks.create_index([
            ("rackNumber", "text"),
            ("floor", "text"),
            ("items", "text")
        ])
        # Compound index for the primary grouped view
        await db.racks.create_index([("floor", 1), ("rackNumber", 1)])
        logger.info("Madan Store database indexes verified.")
    except Exception as e:
        logger.error(f"Startup index creation failed: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
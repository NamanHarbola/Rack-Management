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


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models for Rack Management
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

# Legacy models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Rack Management Endpoints
@api_router.post("/racks", response_model=Rack)
async def create_rack(rack_data: RackCreate):
    """Create a new rack"""
    try:
        rack_dict = rack_data.dict()
        rack_obj = Rack(**rack_dict)
        await db.racks.insert_one(rack_obj.dict())
        return rack_obj
    except Exception as e:
        logging.error(f"Error creating rack: {e}")
        raise HTTPException(status_code=500, detail="Failed to create rack")

@api_router.get("/racks", response_model=Dict[str, List[Rack]])
async def get_all_racks(
    page: int = Query(1, ge=1),
    limit: int = Query(5, ge=1, le=20) # Load 5 floors at a time
):
    """Get racks grouped by floor, with pagination by floor."""
    try:
        skip = (page - 1) * limit
        
        # 1. Get *all* distinct floors and sort them
        all_floors = await db.racks.distinct("floor")
        all_floors.sort()
        
        # 2. Paginate the list of floors
        paginated_floors = all_floors[skip : skip + limit]
        
        if not paginated_floors:
            return {} # No more floors

        # 3. Find all racks for *only those floors*
        query = {"floor": {"$in": paginated_floors}}
        # Note: Increased to_list limit, as we are already filtered by floor
        racks_cursor = db.racks.find(query).sort("floor", 1)
        racks = await racks_cursor.to_list(10000) 
        
        # 4. Group them
        floors = {floor: [] for floor in paginated_floors}
        for rack in racks:
            rack_obj = Rack(**rack)
            # This check is needed in case a floor was in paginated_floors but had 0 racks
            if rack_obj.floor in floors:
                floors[rack_obj.floor].append(rack_obj)
                
        return floors
    except Exception as e:
        logging.error(f"Error getting racks: {e}")
        raise HTTPException(status_code=500, detail="Failed to get racks")

@api_router.get("/racks/search", response_model=RackSearchResponse)
async def search_racks(q: str = Query(..., min_length=1)):
    """Search racks by rack number, floor, or items"""
    try:
        # Use $text index for fast search
        query = { "$text": { "$search": q } }
        
        racks = await db.racks.find(query).to_list(1000)
        rack_objects = [Rack(**rack) for rack in racks]
        
        # Find matched items for highlighting
        # We still need regex here just to find *which* item matched
        search_regex = re.compile(re.escape(q), re.IGNORECASE)
        matched_items = {}
        for rack in rack_objects:
            matches = []
            for item in rack.items:
                if search_regex.search(item):
                    matches.append(item)
            if matches:
                matched_items[rack.id] = matches
        
        return RackSearchResponse(racks=rack_objects, matchedItems=matched_items)
    except Exception as e:
        logging.error(f"Error searching racks: {e}")
        raise HTTPException(status_code=500, detail="Failed to search racks")

@api_router.get("/racks/{rack_id}", response_model=Rack)
async def get_rack(rack_id: str):
    """Get a specific rack by ID"""
    try:
        rack = await db.racks.find_one({"id": rack_id})
        if not rack:
            raise HTTPException(status_code=404, detail="Rack not found")
        return Rack(**rack)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting rack {rack_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get rack")

@api_router.put("/racks/{rack_id}", response_model=Rack)
async def update_rack(rack_id: str, rack_update: RackUpdate):
    """Update a rack"""
    try:
        rack = await db.racks.find_one({"id": rack_id})
        if not rack:
            raise HTTPException(status_code=404, detail="Rack not found")
        
        update_data = {k: v for k, v in rack_update.dict().items() if v is not None}
        update_data["updatedAt"] = datetime.utcnow()
        
        await db.racks.update_one({"id": rack_id}, {"$set": update_data})
        updated_rack = await db.racks.find_one({"id": rack_id})
        return Rack(**updated_rack)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating rack {rack_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update rack")

@api_router.delete("/racks/{rack_id}")
async def delete_rack(rack_id: str):
    """Delete a rack"""
    try:
        result = await db.racks.delete_one({"id": rack_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Rack not found")
        return {"message": "Rack deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting rack {rack_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete rack")

# Legacy routes
@api_router.get("/")
async def root():
    return {"message": "MADAN STORE - Rack & Inventory Management System"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db():
    """Create indexes for better search performance"""
    try:
        # Create text index for full-text search
        await db.racks.create_index([
            ("rackNumber", "text"),
            ("floor", "text"),
            ("items", "text")
        ])
        # Create regular indexes for performance
        await db.racks.create_index("floor")
        await db.racks.create_index("rackNumber")
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.warning(f"Index creation failed: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

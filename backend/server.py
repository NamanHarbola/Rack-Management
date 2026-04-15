import os
import logging
import uuid
import re
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict

from fastapi import FastAPI, APIRouter, HTTPException, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# --- Initialization & Environment ---
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Render and local environment variables
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME')
# Get ALLOWED_ORIGINS from env, fallback to wildcard for initial testing
allowed_origins = os.environ.get('ALLOWED_ORIGINS', '*').split(',')

if not mongo_url or not db_name:
    raise RuntimeError("Missing environment variables: MONGO_URL and DB_NAME must be set.")

# Initialize MongoDB Client
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI(title="Madan Store Inventory API")
api_router = APIRouter(prefix="/api")

# --- Pydantic Models ---
class Rack(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rackNumber: str
    floor: str
    items: List[str] = Field(default_factory=list)
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class RackCreate(BaseModel):
    rackNumber: str
    floor: str
    items: List[str] = Field(default_factory=list)

class RackUpdate(BaseModel):
    rackNumber: Optional[str] = None
    floor: Optional[str] = None
    items: Optional[List[str]] = None

class RackSearchResponse(BaseModel):
    racks: List[Rack]
    matchedItems: Dict[str, List[str]]

# --- Endpoints ---

@api_router.get("/racks", response_model=Dict[str, List[Rack]])
async def get_all_racks(page: int = Query(1, ge=1), limit: int = Query(5, ge=1)):
    """Fetch racks grouped by floor with pagination."""
    try:
        skip = (page - 1) * limit
        # Get distinct floors to determine pagination order
        all_floors = await db.racks.distinct("floor")
        all_floors.sort()
        paginated_floors = all_floors[skip : skip + limit]
        
        if not paginated_floors: 
            return {}

        # Aggregate query to group by floor
        pipeline = [
            {"$match": {"floor": {"$in": paginated_floors}}},
            {"$sort": {"rackNumber": 1}},
            {"$group": {"_id": "$floor", "racks": {"$push": "$$ROOT"}}},
            {"$sort": {"_id": 1}}
        ]
        results = await db.racks.aggregate(pipeline).to_list(length=limit)
        return {res["_id"]: [Rack(**r) for r in res["racks"]] for res in results}
    except Exception as e:
        logging.error(f"Fetch error: {e}")
        raise HTTPException(status_code=500, detail="Database fetch failed")

@api_router.post("/racks", response_model=Rack)
async def create_rack(rack_data: RackCreate):
    """Create a new rack entry."""
    rack_obj = Rack(**rack_data.model_dump())
    await db.racks.insert_one(rack_obj.model_dump())
    return rack_obj

@api_router.get("/racks/search", response_model=RackSearchResponse)
async def search_racks(q: str = Query(..., min_length=1)):
    """Search for racks or items using text indexing."""
    query = {"$text": {"$search": q}}
    cursor = db.racks.find(query).limit(100)
    racks = await cursor.to_list(length=100)
    rack_objects = [Rack(**rack) for rack in racks]
    
    # Identify which specific items matched the search query for highlighting
    search_regex = re.compile(re.escape(q), re.IGNORECASE)
    matched_items = {r.id: [i for i in r.items if search_regex.search(i)] for r in rack_objects}
    # Filter out empty results
    matched_items = {k: v for k, v in matched_items.items() if v}
    
    return RackSearchResponse(racks=rack_objects, matchedItems=matched_items)

@api_router.put("/racks/{rack_id}", response_model=Rack)
async def update_rack(rack_id: str, rack_update: RackUpdate):
    """Update an existing rack by its unique ID."""
    update_data = {k: v for k, v in rack_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data provided for update")
        
    update_data["updatedAt"] = datetime.utcnow()
    result = await db.racks.update_one({"id": rack_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rack not found")
        
    updated = await db.racks.find_one({"id": rack_id})
    return Rack(**updated)

@api_router.delete("/racks/{rack_id}")
async def delete_rack(rack_id: str):
    """Remove a rack from the database."""
    result = await db.racks.delete_one({"id": rack_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rack not found")
    return {"message": "Deleted successfully"}

# --- Middleware & Setup ---

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db():
    """Create necessary text indexes for search functionality."""
    await db.racks.create_index([
        ("rackNumber", "text"), 
        ("floor", "text"), 
        ("items", "text")
    ])
    await db.racks.create_index([("floor", 1), ("rackNumber", 1)])

# Required for Render Deployment
if __name__ == "__main__":
    import uvicorn
    # Render sets the PORT environment variable automatically
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
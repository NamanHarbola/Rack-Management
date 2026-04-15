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

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME')

if not mongo_url or not db_name:
    raise RuntimeError("Check your .env file for MONGO_URL and DB_NAME")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI(title="Madan Store Inventory API")
api_router = APIRouter(prefix="/api")

# --- Models ---
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
    try:
        skip = (page - 1) * limit
        all_floors = await db.racks.distinct("floor")
        all_floors.sort()
        paginated_floors = all_floors[skip : skip + limit]
        
        if not paginated_floors: return {}

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
    rack_obj = Rack(**rack_data.model_dump())
    await db.racks.insert_one(rack_obj.model_dump())
    return rack_obj

@api_router.get("/racks/search", response_model=RackSearchResponse)
async def search_racks(q: str = Query(..., min_length=1)):
    query = {"$text": {"$search": q}}
    cursor = db.racks.find(query).limit(100)
    racks = await cursor.to_list(length=100)
    rack_objects = [Rack(**rack) for rack in racks]
    
    search_regex = re.compile(re.escape(q), re.IGNORECASE)
    matched_items = {r.id: [i for i in r.items if search_regex.search(i)] for r in rack_objects}
    matched_items = {k: v for k, v in matched_items.items() if v}
    
    return RackSearchResponse(racks=rack_objects, matchedItems=matched_items)

@api_router.put("/racks/{rack_id}", response_model=Rack)
async def update_rack(rack_id: str, rack_update: RackUpdate):
    update_data = {k: v for k, v in rack_update.model_dump().items() if v is not None}
    update_data["updatedAt"] = datetime.utcnow()
    await db.racks.update_one({"id": rack_id}, {"$set": update_data})
    updated = await db.racks.find_one({"id": rack_id})
    return Rack(**updated)

@api_router.delete("/racks/{rack_id}")
async def delete_rack(rack_id: str):
    await db.racks.delete_one({"id": rack_id})
    return {"message": "Deleted"}

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup_db():
    await db.racks.create_index([("rackNumber", "text"), ("floor", "text"), ("items", "text")])
    await db.racks.create_index([("floor", 1), ("rackNumber", 1)])
from fastapi import APIRouter
from fraud_engine.graph_builder import get_graph_data

router = APIRouter()

@router.get("/graph-data")
async def fetch_graph_data():
    data = get_graph_data()
    return data

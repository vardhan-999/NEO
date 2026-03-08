from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.models import Transaction, get_db
from fraud_engine.graph_builder import build_graph_from_db

router = APIRouter()

@router.post("/build-graph")
async def build_knowledge_graph(db: Session = Depends(get_db)):
    # Fetch all transactions
    tx_records = db.query(Transaction).all()
    
    if not tx_records:
        return {"message": "No transactions found. Upload dataset first."}
        
    # Convert ORM objects to dicts for the graph builder
    transactions_dict = [
        {
            "seller": tx.seller,
            "buyer": tx.buyer,
            "director": tx.director,
            "amount": tx.amount,
            "gst": tx.gst
        }
        for tx in tx_records
    ]
    
    # Build Graph in memory using NetworkX
    stats = build_graph_from_db(transactions_dict)
    
    return {
        "message": "Knowledge Graph built successfully",
        "nodes": stats["nodes"],
        "edges": stats["edges"]
    }

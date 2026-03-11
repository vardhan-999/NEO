from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from sqlalchemy.orm import Session
from database.models import Transaction, get_db, Base, engine
import pandas as pd
import io

router = APIRouter()

@router.post("/upload")
async def upload_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    content = await file.read()
    try:
        # Create tables if not exists
        Base.metadata.create_all(bind=engine)
        
        df = pd.read_csv(io.BytesIO(content), comment='#')
        df = df.dropna(subset=['seller', 'buyer', 'amount'])

        # Expected columns: seller, buyer, amount, gst, director
        expected_cols = {'seller', 'buyer', 'amount', 'gst', 'director'}
        if not expected_cols.issubset(df.columns):
            raise HTTPException(status_code=400, detail=f"CSV must contain columns: {expected_cols}")
        
        # Clear existing table for hackathon
        db.query(Transaction).delete()
        
        # Insert records
        records = df.to_dict(orient="records")
        db_transactions = []
        for r in records:
            tx = Transaction(
                seller=r["seller"],
                buyer=r["buyer"],
                amount=float(r["amount"]),
                gst=float(r["gst"]),
                director=r.get("director", "")
            )
            db_transactions.append(tx)
            
        if db_transactions:
            db.bulk_save_objects(db_transactions)
            db.commit()
            
        return {"message": f"Successfully uploaded {len(records)} transactions", "count": len(records)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/simulate")
async def simulate_data(db: Session = Depends(get_db)):
    Base.metadata.create_all(bind=engine)
    db.query(Transaction).delete()
    
    import random
    
    companies = [f"COMP-{i:03d}" for i in range(1, 41)]
    directors = [f"DIR-{i:02d}" for i in range(1, 11)]
    
    records = []
    for _ in range(150):
        records.append({
            "seller": random.choice(companies),
            "buyer": random.choice(companies),
            "director": random.choice(directors),
            "amount": random.randint(10000, 50000),
            "gst": random.randint(1800, 9000)
        })
        
    # Circular Trading
    ring = ["COMP-001", "COMP-002", "COMP-003", "COMP-004"]
    for i in range(len(ring)):
        s = ring[i]
        b = ring[(i+1)%len(ring)]
        records.append({"seller": s, "buyer": b, "director": "DIR-01", "amount": 850000, "gst": 153000})

    # Shared Director
    sd_companies = ["COMP-035", "COMP-036", "COMP-037", "COMP-038", "COMP-039"]
    for c in sd_companies:
        records.append({"seller": c, "buyer": "COMP-040", "director": "DIR-09", "amount": 10000, "gst": 1800})

    # High Volume
    records.append({"seller": "COMP-020", "buyer": "COMP-021", "director": "DIR-04", "amount": 9500000, "gst": 1710000})

    # Repeated Amounts
    for _ in range(6):
        records.append({"seller": "COMP-030", "buyer": "COMP-031", "director": "DIR-05", "amount": 49999, "gst": 8999})
        
    db_transactions = []
    for r in records:
        if r["seller"] != r["buyer"]:
            db_transactions.append(Transaction(**r))
            
    if db_transactions:
        db.bulk_save_objects(db_transactions)
        db.commit()
            
    return {"message": "Simulation generated", "count": len(db_transactions)}

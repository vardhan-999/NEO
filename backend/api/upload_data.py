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
        
        df = pd.read_csv(io.BytesIO(content))
        
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

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from fraud_engine.fraud_rules import run_fraud_detection
from fraud_engine.risk_scoring import calculate_risk_scores
from database.models import Transaction, Alert, get_db

router = APIRouter()

@router.post("/detect-fraud")
async def detect_fraud(db: Session = Depends(get_db)):
    tx_records = db.query(Transaction).all()
    
    if not tx_records:
        return {"message": "No transactions data. Upload first."}
    
    # Format identically to old dicts
    transactions_dict = [
        {"seller": tx.seller, "buyer": tx.buyer, "director": tx.director, "amount": tx.amount, "gst": tx.gst}
        for tx in tx_records
    ]

    # 1. Run Rules
    alerts, suspicious_companies = run_fraud_detection(transactions_dict)
    
    # 2. Add alerts to database for persistence
    db.query(Alert).delete()
    db_alerts = []
    for a in alerts:
        db_alert = Alert(
            alert_id=a["alert_id"],
            fraud_type=a["fraud_type"],
            details=a["details"],
            risk_level=a["risk_level"]
        )
        db_alerts.append(db_alert)
    if db_alerts:
        db.bulk_save_objects(db_alerts)
        db.commit()
    
    # 3. Risk Scoring
    risk_scores = calculate_risk_scores(alerts, suspicious_companies)
    
    # Summarize top risk companies
    high_risk = sorted(risk_scores.items(), key=lambda x: x[1], reverse=True)[:10]
    high_risk_list = [{"company": k, "risk": v} for k, v in high_risk]

    return {
        "message": "Fraud detection complete",
        "alerts": alerts,
        "suspicious_companies": high_risk_list
    }

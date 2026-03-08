import os
import urllib.parse
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import sessionmaker, declarative_base

password = urllib.parse.quote_plus('Anji@521')
DATABASE_URL = os.getenv("DATABASE_URL", f"postgresql://postgres:{password}@localhost:5432/gst_fraud")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    seller = Column(String, index=True)
    buyer = Column(String, index=True)
    amount = Column(Float)
    gst = Column(Float)
    director = Column(String, index=True, default="")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String, index=True)
    fraud_type = Column(String)
    details = Column(String)
    risk_level = Column(String)

# Dependency to get db session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

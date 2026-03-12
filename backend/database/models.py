import os
import urllib.parse
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, Text, Date
from sqlalchemy.orm import sessionmaker, declarative_base

password = urllib.parse.quote_plus('password')
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./gst_fraud.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)

    # Core identifiers (new 16-field format)
    seller_gstin = Column(String, index=True, default="")
    buyer_gstin = Column(String, index=True, default="")
    invoice_number = Column(String, index=True, default="")
    invoice_date = Column(String, default="")

    # Financials
    invoice_value = Column(Float, default=0.0)
    taxable_value = Column(Float, default=0.0)
    cgst = Column(Float, default=0.0)
    sgst = Column(Float, default=0.0)
    igst = Column(Float, default=0.0)

    # Product/commodity
    hsn_code = Column(String, default="")
    product_description = Column(Text, default="")
    quantity = Column(Float, default=0.0)
    unit_price = Column(Float, default=0.0)

    # Geography
    seller_state = Column(String, default="")
    buyer_state = Column(String, default="")

    # Status
    payment_status = Column(String, default="")

    # Derived / compatibility fields (populated from above)
    seller = Column(String, index=True, default="")   # derived: seller_gstin or old 'seller'
    buyer = Column(String, index=True, default="")    # derived: buyer_gstin or old 'buyer'
    amount = Column(Float, default=0.0)               # = invoice_value
    gst = Column(Float, default=0.0)                  # = cgst + sgst + igst
    director = Column(String, index=True, default="") # old field kept for compatibility

    # Validation flags (set during upload)
    has_gstin_error = Column(Boolean, default=False)
    has_tax_mismatch = Column(Boolean, default=False)
    has_duplicate_invoice = Column(Boolean, default=False)
    is_abnormal_value = Column(Boolean, default=False)


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

from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from sqlalchemy.orm import Session
from database.models import Transaction, get_db, Base, engine
from services.gst_validator import validate_gstin, validate_dataset
import pandas as pd
import io
import random

router = APIRouter()

# ──────────────────────────────────────────────────────────────
# New 16-column format
NEW_REQUIRED_COLS = {
    'seller_gstin', 'buyer_gstin', 'invoice_number', 'invoice_date',
    'invoice_value', 'taxable_value', 'cgst', 'sgst', 'igst',
    'hsn_code', 'product_description', 'quantity', 'unit_price',
    'seller_state', 'buyer_state', 'payment_status'
}
# Legacy 5-column format (backward compat)
OLD_REQUIRED_COLS = {'seller', 'buyer', 'amount', 'gst'}


def _float(val, default=0.0):
    try:
        return float(val or 0)
    except (ValueError, TypeError):
        return default


def _build_transaction_new(r: dict, validation_report: dict, inv_dupes: set) -> Transaction:
    """Build a Transaction record from a 16-field CSV row."""
    inv_num = str(r.get("invoice_number", "")).strip()
    seller_g = str(r.get("seller_gstin", "")).strip()
    buyer_g = str(r.get("buyer_gstin", "")).strip()
    iv = _float(r.get("invoice_value"))
    cgst = _float(r.get("cgst"))
    sgst = _float(r.get("sgst"))
    igst = _float(r.get("igst"))
    tax_v = _float(r.get("taxable_value"))

    return Transaction(
        seller_gstin=seller_g,
        buyer_gstin=buyer_g,
        invoice_number=inv_num,
        invoice_date=str(r.get("invoice_date", "")),
        invoice_value=iv,
        taxable_value=tax_v,
        cgst=cgst,
        sgst=sgst,
        igst=igst,
        hsn_code=str(r.get("hsn_code", "")),
        product_description=str(r.get("product_description", "")),
        quantity=_float(r.get("quantity")),
        unit_price=_float(r.get("unit_price")),
        seller_state=str(r.get("seller_state", "")),
        buyer_state=str(r.get("buyer_state", "")),
        payment_status=str(r.get("payment_status", "")),
        # Compatibility fields
        seller=seller_g or str(r.get("seller", "")),
        buyer=buyer_g or str(r.get("buyer", "")),
        amount=iv,
        gst=cgst + sgst + igst,
        director=str(r.get("director", "")),
        # Validation flags
        has_gstin_error=(
            not validate_gstin(seller_g)["valid"] or
            not validate_gstin(buyer_g)["valid"]
        ) if seller_g or buyer_g else False,
        has_tax_mismatch=abs(iv - (tax_v + cgst + sgst + igst)) > 1.0,
        has_duplicate_invoice=inv_num in inv_dupes,
        is_abnormal_value=(
            iv > validation_report.get("avg_invoice_value", 0) * 10
            and validation_report.get("avg_invoice_value", 0) > 0
        )
    )


def _build_transaction_old(r: dict) -> Transaction:
    """Build a Transaction from old 5-field format for backward compat."""
    return Transaction(
        seller=str(r.get("seller", "")),
        buyer=str(r.get("buyer", "")),
        amount=_float(r.get("amount")),
        gst=_float(r.get("gst")),
        director=str(r.get("director", "")),
        invoice_value=_float(r.get("amount")),
        gst_total=_float(r.get("gst")),
    )


# ──────────────────────────────────────────────────────────────
@router.post("/upload")
async def upload_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    content = await file.read()
    try:
        Base.metadata.drop_all(bind=engine, tables=[Transaction.__table__])
        Base.metadata.create_all(bind=engine)

        df = pd.read_csv(io.BytesIO(content), comment='#', dtype=str)
        df.columns = [c.strip().lower() for c in df.columns]
        df = df.where(pd.notnull(df), None)

        records = df.to_dict(orient="records")

        is_new_format = NEW_REQUIRED_COLS.issubset(set(df.columns))
        is_old_format = OLD_REQUIRED_COLS.issubset(set(df.columns))

        if not is_new_format and not is_old_format:
            missing = NEW_REQUIRED_COLS - set(df.columns)
            raise HTTPException(
                status_code=400,
                detail=f"CSV is missing required columns: {sorted(missing)}"
            )

        validation_report = {}
        db_transactions = []

        if is_new_format:
            # Run full validation
            validation_report = validate_dataset(records)
            # Find duplicate invoice numbers for flagging
            inv_counts: dict = {}
            for r in records:
                inv = str(r.get("invoice_number", "")).strip()
                if inv:
                    inv_counts[inv] = inv_counts.get(inv, 0) + 1
            inv_dupes = {k for k, v in inv_counts.items() if v > 1}

            for r in records:
                if r.get("seller_gstin") and r.get("buyer_gstin"):
                    tx = _build_transaction_new(r, validation_report, inv_dupes)
                    db_transactions.append(tx)
        else:
            # Legacy format
            df = df.dropna(subset=["seller", "buyer", "amount"])
            records = df.to_dict(orient="records")
            for r in records:
                if r.get("seller") != r.get("buyer"):
                    db_transactions.append(Transaction(
                        seller=str(r.get("seller", "")),
                        buyer=str(r.get("buyer", "")),
                        amount=_float(r.get("amount")),
                        gst=_float(r.get("gst")),
                        director=str(r.get("director", "") or ""),
                        invoice_value=_float(r.get("amount")),
                    ))
            validation_report = {
                "total_rows": len(records),
                "valid_rows": len(records),
                "gstin_errors": [],
                "invoice_errors": [],
                "duplicate_invoices": [],
                "total_errors": 0,
                "format": "legacy"
            }

        if db_transactions:
            db.bulk_save_objects(db_transactions)
            db.commit()

        return {
            "message": f"Successfully uploaded {len(db_transactions)} transactions",
            "count": len(db_transactions),
            "format": "full_gstin" if is_new_format else "legacy",
            "validation": validation_report,
            "preview": records[:10]
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────
@router.post("/validate-preview")
async def validate_preview(file: UploadFile = File(...)):
    """
    Quick preview + validation endpoint - does NOT write to DB.
    Returns first 10 rows + validation report.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content), comment='#', dtype=str)
        df.columns = [c.strip().lower() for c in df.columns]
        df = df.where(pd.notnull(df), None)
        records = df.to_dict(orient="records")

        is_new_format = NEW_REQUIRED_COLS.issubset(set(df.columns))

        if not is_new_format:
            return {
                "format": "legacy",
                "preview": records[:10],
                "validation": {
                    "total_rows": len(records),
                    "valid_rows": len(records),
                    "gstin_errors": [],
                    "invoice_errors": [],
                    "duplicate_invoices": [],
                    "total_errors": 0
                }
            }

        validation_report = validate_dataset(records[:500])  # Limit for quick preview
        return {
            "format": "full_gstin",
            "preview": records[:10],
            "validation": validation_report
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────
@router.post("/simulate")
async def simulate_data(db: Session = Depends(get_db)):
    """Generate realistic 16-field GST invoice simulation data."""
    Base.metadata.drop_all(bind=engine, tables=[Transaction.__table__])
    Base.metadata.create_all(bind=engine)

    # Company GSTINs: state 27 (MH) and 29 (KA)
    def make_gstin(state, idx):
        pan = f"ABCDE{idx:04d}F"
        return f"{state}{pan}1Z5"

    mh_cos = {f"MH_CO_{i:02d}": make_gstin("27", i) for i in range(1, 21)}
    ka_cos = {f"KA_CO_{i:02d}": make_gstin("29", i + 100) for i in range(1, 11)}
    all_cos = {**mh_cos, **ka_cos}
    names = list(all_cos.keys())
    gstins = all_cos

    directors = [f"DIR-{i:02d}" for i in range(1, 8)]
    hsn_codes = ["8471", "8517", "2710", "3004", "7208", "6201"]
    products = ["Computer Parts", "Mobile Phones", "Petroleum", "Medicines", "Steel Plates", "Garments"]
    statuses = ["Paid", "Unpaid", "Partial"]
    states_mh = [("MH", "27")] * 15 + [("KA", "29")] * 5

    records = []
    inv_counter = 1

    def make_invoice(seller_name, buyer_name, amount, gst_type="intra"):
        nonlocal inv_counter
        seller_gstin = gstins[seller_name]
        buyer_gstin = gstins[buyer_name]
        taxable = round(amount * 0.9, 2)
        if gst_type == "intra":
            cgst = round(taxable * 0.09, 2)
            sgst = round(taxable * 0.09, 2)
            i_gst = 0.0
            s_state = "MH"
            b_state = "MH"
        else:
            cgst = 0.0
            sgst = 0.0
            i_gst = round(taxable * 0.18, 2)
            s_state = "MH"
            b_state = "KA"
        iv = taxable + cgst + sgst + i_gst
        qty = random.randint(1, 100)
        hsn = random.choice(hsn_codes)
        prod = products[hsn_codes.index(hsn)]
        inv_num = f"INV{inv_counter:05d}"
        inv_counter += 1
        return {
            "seller_gstin": seller_gstin, "buyer_gstin": buyer_gstin,
            "invoice_number": inv_num, "invoice_date": f"2024-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
            "invoice_value": round(iv, 2), "taxable_value": taxable,
            "cgst": cgst, "sgst": sgst, "igst": i_gst,
            "hsn_code": hsn, "product_description": prod,
            "quantity": qty, "unit_price": round(amount / qty, 2),
            "seller_state": s_state, "buyer_state": b_state,
            "payment_status": random.choice(statuses),
            "seller": seller_gstin, "buyer": buyer_gstin,
            "amount": iv, "gst": cgst + sgst + i_gst, "director": random.choice(directors)
        }

    # Normal transactions
    for _ in range(120):
        s, b = random.sample(names[:20], 2)
        amt = random.randint(10000, 200000)
        records.append(make_invoice(s, b, amt, "intra"))

    # Cross-state transactions (inter-state)
    for _ in range(20):
        s = random.choice(names[:20])    # MH company
        b = random.choice(names[20:])    # KA company
        amt = random.randint(50000, 300000)
        records.append(make_invoice(s, b, amt, "inter"))

    # Circular Trading Ring
    ring = ["MH_CO_01", "MH_CO_02", "MH_CO_03", "MH_CO_04"]
    for i in range(len(ring)):
        records.append(make_invoice(ring[i], ring[(i+1)%len(ring)], 850000, "intra"))

    # Shared Director (all sell to same company)
    sd_sellers = ["MH_CO_05", "MH_CO_06", "MH_CO_07", "MH_CO_08", "MH_CO_09"]
    for s in sd_sellers:
        r = make_invoice(s, "MH_CO_10", 50000, "intra")
        r["director"] = "DIR-01"
        records.append(r)

    # High volume transaction
    records.append(make_invoice("MH_CO_11", "MH_CO_12", 9500000, "intra"))

    # Repeated identical invoices (pattern)
    for _ in range(5):
        r = make_invoice("MH_CO_13", "MH_CO_14", 49999, "intra")
        r["invoice_number"] = "INV_REPEAT_001"  # Duplicate!
        records.append(r)

    # Tax mismatch record
    bad = make_invoice("MH_CO_15", "MH_CO_16", 100000, "intra")
    bad["cgst"] = bad["cgst"] + 5000  # Intentional mismatch
    records.append(bad)

    db_transactions = []
    for r in records:
        if r["seller"] != r["buyer"]:
            db_transactions.append(Transaction(**{k: v for k, v in r.items() if k in Transaction.__table__.columns.keys()}))

    if db_transactions:
        db.bulk_save_objects(db_transactions)
        db.commit()

    return {"message": "GST simulation generated", "count": len(db_transactions)}

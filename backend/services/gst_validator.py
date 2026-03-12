"""
GSTIN and Invoice Validation Service
"""
import re
from typing import List, Dict, Any


# Indian state codes 01-38 (including J&K UTs)
VALID_STATE_CODES = {
    "01","02","03","04","05","06","07","08","09","10",
    "11","12","13","14","15","16","17","18","19","20",
    "21","22","23","24","25","26","27","28","29","30",
    "31","32","33","34","35","36","37","38"
}

STATE_CODE_MAP = {
    "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
    "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
    "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
    "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
    "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
    "16": "Tripura", "17": "Meghalaya", "18": "Assam",
    "19": "West Bengal", "20": "Jharkhand", "21": "Odisha",
    "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "25": "Daman & Diu", "26": "Dadra & Nagar Haveli", "27": "Maharashtra",
    "28": "Andhra Pradesh (old)", "29": "Karnataka", "30": "Goa",
    "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
    "34": "Puducherry", "35": "Andaman & Nicobar", "36": "Telangana",
    "37": "Andhra Pradesh", "38": "Ladakh"
}

# State abbreviation to code mapping (for seller_state/buyer_state columns)
STATE_ABBR_MAP = {
    "MH": "27", "KA": "29", "DL": "07", "GJ": "24", "RJ": "08",
    "TN": "33", "TS": "36", "AP": "37", "KL": "32", "WB": "19",
    "UP": "09", "MP": "23", "HR": "06", "PB": "03", "OR": "21",
    "BR": "10", "AS": "18", "JH": "20", "CG": "22", "UK": "05",
    "HP": "02", "JK": "01", "GA": "30", "MN": "14", "ML": "17",
    "MZ": "15", "NL": "13", "TR": "16", "SK": "11", "AR": "12",
    "LA": "38", "CH": "04", "DD": "25", "DN": "26", "PY": "34",
    "AN": "35", "LD": "31"
}

_GSTIN_PATTERN = re.compile(
    r'^([0-9]{2})'           # 2-digit state code
    r'([A-Z]{5}[0-9]{4}[A-Z])' # PAN: 5 alpha + 4 num + 1 alpha
    r'([1-9A-Z])'            # entity number
    r'Z'                     # fixed Z
    r'[0-9A-Z]$'             # checksum
)


def validate_gstin(gstin: str) -> Dict[str, Any]:
    """Validate a GSTIN string. Returns {valid, error, state_code, state_name}."""
    if not gstin or not isinstance(gstin, str):
        return {"valid": False, "error": "GSTIN is empty or missing"}

    gstin = gstin.strip().upper()

    if len(gstin) != 15:
        return {"valid": False, "error": f"GSTIN must be 15 characters, got {len(gstin)}"}

    m = _GSTIN_PATTERN.match(gstin)
    if not m:
        return {"valid": False, "error": "GSTIN format invalid (expected: 2-digit state + PAN + entity + Z + checksum)"}

    state_code = m.group(1)
    if state_code not in VALID_STATE_CODES:
        return {"valid": False, "error": f"Invalid state code '{state_code}' in GSTIN"}

    return {
        "valid": True,
        "error": None,
        "state_code": state_code,
        "state_name": STATE_CODE_MAP.get(state_code, "Unknown")
    }


def validate_invoice_row(row: Dict[str, Any], row_num: int, avg_value: float) -> List[str]:
    """Run multiple validation checks on a single invoice row. Returns list of error strings."""
    errors = []
    prefix = f"Row {row_num}"

    try:
        invoice_value = float(row.get("invoice_value", 0) or 0)
        taxable_value = float(row.get("taxable_value", 0) or 0)
        cgst = float(row.get("cgst", 0) or 0)
        sgst = float(row.get("sgst", 0) or 0)
        igst = float(row.get("igst", 0) or 0)

        # Tax calculation mismatch
        computed_total = taxable_value + cgst + sgst + igst
        if abs(invoice_value - computed_total) > 1.0:  # Allow ₹1 rounding
            errors.append(
                f"{prefix}: Tax mismatch — invoice_value ₹{invoice_value:.0f} ≠ "
                f"taxable+cgst+sgst+igst ₹{computed_total:.0f}"
            )

        # Negative values
        for field in ("invoice_value", "taxable_value", "cgst", "sgst", "igst", "quantity", "unit_price"):
            val = float(row.get(field, 0) or 0)
            if val < 0:
                errors.append(f"{prefix}: Negative value in '{field}': {val}")

        # Abnormal value (>10x average)
        if avg_value > 0 and invoice_value > avg_value * 10:
            errors.append(
                f"{prefix}: Abnormal invoice value ₹{invoice_value:,.0f} "
                f"is {invoice_value/avg_value:.1f}x the average"
            )

        # Cross-state: if seller_state != buyer_state, should use IGST not CGST+SGST
        seller_state = str(row.get("seller_state", "")).strip().upper()
        buyer_state = str(row.get("buyer_state", "")).strip().upper()
        if seller_state and buyer_state and seller_state != buyer_state:
            if cgst > 0 or sgst > 0:
                errors.append(
                    f"{prefix}: Cross-state transaction (seller: {seller_state} → buyer: {buyer_state}) "
                    f"should use IGST, not CGST/SGST"
                )

        # Intra-state: should use CGST+SGST not IGST
        if seller_state and buyer_state and seller_state == buyer_state:
            if igst > 0:
                errors.append(
                    f"{prefix}: Intra-state transaction should use CGST+SGST, not IGST"
                )

    except (ValueError, TypeError) as e:
        errors.append(f"{prefix}: Could not parse numeric fields — {e}")

    return errors


def validate_dataset(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Run all validations on the full dataset.
    Returns validation report dict.
    """
    gstin_errors: List[str] = []
    invoice_errors: List[str] = []
    duplicate_invoices: List[str] = []
    seen_invoice_numbers: Dict[str, int] = {}

    # Calculate average invoice value for abnormal detection
    values = []
    for r in rows:
        try:
            v = float(r.get("invoice_value", 0) or 0)
            if v > 0:
                values.append(v)
        except (ValueError, TypeError):
            pass
    avg_value = sum(values) / len(values) if values else 0

    valid_count = 0

    for i, row in enumerate(rows):
        row_num = i + 1
        has_error = False

        # GSTIN validation
        for field in ("seller_gstin", "buyer_gstin"):
            gstin = str(row.get(field, "")).strip()
            if gstin:
                result = validate_gstin(gstin)
                if not result["valid"]:
                    gstin_errors.append(f"Row {row_num} [{field}] '{gstin}': {result['error']}")
                    has_error = True

        # Duplicate invoice number check
        inv_num = str(row.get("invoice_number", "")).strip()
        if inv_num:
            if inv_num in seen_invoice_numbers:
                duplicate_invoices.append(
                    f"Invoice '{inv_num}' appears in rows {seen_invoice_numbers[inv_num]} and {row_num}"
                )
                has_error = True
            else:
                seen_invoice_numbers[inv_num] = row_num

        # Invoice financial validation
        inv_errs = validate_invoice_row(row, row_num, avg_value)
        invoice_errors.extend(inv_errs)
        if inv_errs:
            has_error = True

        if not has_error:
            valid_count += 1

    return {
        "total_rows": len(rows),
        "valid_rows": valid_count,
        "gstin_errors": gstin_errors,
        "invoice_errors": invoice_errors,
        "duplicate_invoices": duplicate_invoices,
        "total_errors": len(gstin_errors) + len(invoice_errors) + len(duplicate_invoices),
        "avg_invoice_value": round(avg_value, 2)
    }

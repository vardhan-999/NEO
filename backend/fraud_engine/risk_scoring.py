from typing import Dict, List, Any


# Score weights per fraud type
FRAUD_SCORE_MAP = {
    "Circular Trading":            30,
    "Shared Director":             25,
    "Duplicate Invoice":           25,
    "Tax Calculation Mismatch":    20,
    "Cross-State GST Abuse":       18,
    "High ITC Claim":              20,
    "High Volume Transaction":     15,
    "Abnormal Invoice Value":      20,
    "Suspicious Transaction Pattern": 12,
    "Suspicious Loop":             10,
    "AI Anomaly Detected":         15,
    "Future Fraud Prediction":     18,
}

FRAUD_REASON_MAP = {
    "Circular Trading":            "Involved in a circular trading loop — invoices cycling through entities.",
    "Shared Director":             "Part of a high-risk shared-director cluster.",
    "Duplicate Invoice":           "Same invoice number reused across different buyer/seller pairs.",
    "Tax Calculation Mismatch":    "Invoice value does not match taxable value + CGST + SGST + IGST.",
    "Cross-State GST Abuse":       "Inter-state transaction uses CGST/SGST instead of IGST.",
    "High ITC Claim":              "Suspiciously high Input Tax Credit claim detected.",
    "High Volume Transaction":     "Unusually large single transaction volume.",
    "Abnormal Invoice Value":      "Invoice value is 10× or more above dataset average.",
    "Suspicious Transaction Pattern": "Repeated identical transaction amounts between same entities.",
    "Suspicious Loop":             "Participates in a two-entity suspicious transaction loop.",
    "AI Anomaly Detected":         "Machine learning (Isolation Forest) flagged abnormal trading behaviour.",
    "Future Fraud Prediction":     "Logistic regression model predicts high probability of future fraud.",
}


def calculate_risk_scores(
    alerts: List[Dict[str, Any]],
    companies: List[str]
) -> tuple:
    scores: Dict[str, int] = {c: 0 for c in companies}
    reasons: Dict[str, List[str]] = {c: [] for c in companies}

    for alert in alerts:
        fraud_type = alert.get("fraud_type", "")
        score_add = FRAUD_SCORE_MAP.get(fraud_type, 5)
        reason = FRAUD_REASON_MAP.get(fraud_type, "")

        for c in alert.get("entities", []):
            if c in scores:
                scores[c] = min(100, scores[c] + score_add)
                if reason and reason not in reasons[c]:
                    reasons[c].append(reason)

    return scores, reasons


def get_risk_level(score: int) -> str:
    if score >= 80:
        return "Critical"
    if score >= 60:
        return "High"
    if score >= 30:
        return "Medium"
    return "Low"

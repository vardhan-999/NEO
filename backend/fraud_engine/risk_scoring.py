from typing import Dict, List, Any

def calculate_risk_scores(alerts: List[Dict[str, Any]], companies: List[str]) -> tuple[Dict[str, int], Dict[str, List[str]]]:
    scores: Dict[str, int] = {c: 0 for c in companies}
    reasons: Dict[str, List[str]] = {c: [] for c in companies}
    
    for alert in alerts:
        score_add = 0
        reason = ""
        if alert["fraud_type"] == "Circular Trading":
            score_add = 30
            reason = "Involved in a Circular Trading loop."
        elif alert["fraud_type"] == "Shared Director":
            score_add = 25
            reason = "Part of a high-risk Shared Director cluster."
        elif alert["fraud_type"] == "High ITC Claim":
            score_add = 20
            reason = "Suspiciously high ITC Claim / Mismatch."
        elif alert["fraud_type"] == "High Volume":
            score_add = 15
            reason = "High transaction volume."
        elif alert["fraud_type"] == "Suspicious Loop":
            score_add = 10
            reason = "Participates in suspicious transaction loops."

        for c in companies:
            if c in alert.get("entities", []):
                scores[c] += score_add
                if reason and reason not in reasons[c]:
                    reasons[c].append(reason)
                
    # Cap to 100
    for c in scores:
        if scores[c] > 100:
            scores[c] = 100
            
    return scores, reasons



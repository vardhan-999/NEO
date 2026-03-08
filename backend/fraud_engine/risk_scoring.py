def calculate_risk_scores(alerts, companies):
    risk_scores = {c: 0 for c in companies}
    
    for alert in alerts:
        score_add = 0
        if alert["fraud_type"] == "Circular Trading":
            score_add = 50
        elif alert["fraud_type"] == "Shared Director":
            score_add = 30
        elif alert["fraud_type"] == "High ITC Claim":
            score_add = 20
            
        # Add risk purely based on presence in alert details
        for c in companies:
            if c in alert["details"]:
                risk_scores[c] += score_add
                
    # Normalize or cap to 100 if preferred, but for scoring keep it absolute
    return risk_scores

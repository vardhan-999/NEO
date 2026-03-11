import networkx as nx
from fraud_engine.graph_builder import G

def run_fraud_detection(transactions):
    alerts = []
    suspicious_companies = set()
    
    # 1. Circular Trading Detection (Cycles length 3+)
    trade_edges = [(u, v) for u, v, d in G.edges(data=True) if d.get("type") == "trades_with"]
    trade_graph = nx.DiGraph()
    trade_graph.add_edges_from(trade_edges)
    
    try:
        cycles = list(nx.simple_cycles(trade_graph, length_bound=4))
        for cycle in cycles:
            if len(cycle) >= 3:
                alerts.append({
                    "alert_id": f"CT-{cycle[0]}",
                    "fraud_type": "Circular Trading",
                    "details": " -> ".join(cycle + [cycle[0]]),
                    "risk_level": "High",
                    "entities": cycle
                })
                suspicious_companies.update(cycle)
            elif len(cycle) == 2:
                alerts.append({
                    "alert_id": f"SL-{cycle[0]}",
                    "fraud_type": "Suspicious Loop",
                    "details": " <-> ".join(cycle),
                    "risk_level": "Medium",
                    "entities": cycle
                })
                suspicious_companies.update(cycle)
    except:
        pass
        
    # 2. Shared Director Detection
    director_nodes = [n for n, d in G.nodes(data=True) if d.get("type") == "Director"]
    for d in director_nodes:
        owned_companies = [v for u, v in G.out_edges(d)]
        if len(owned_companies) > 3:
            alerts.append({
                "alert_id": f"SD-{d}",
                "fraud_type": "Shared Director",
                "details": f"Director {d} controls {len(owned_companies)} companies: {', '.join(owned_companies[:5])}...",
                "risk_level": "High",
                "entities": owned_companies
            })
            suspicious_companies.update(owned_companies)
            
    # 3. ITC Anomalies and High Volume
    for u, v, d in G.edges(data=True):
        if d.get("type") == "trades_with":
            if d.get("gst", 0) > 1000000:
                alerts.append({
                    "alert_id": f"ITC-{u}-{v}",
                    "fraud_type": "High ITC Claim",
                    "details": f"Suspiciously high GST transaction between {u} and {v}: ₹{d['gst']}",
                    "risk_level": "Medium",
                    "entities": [u, v]
                })
                suspicious_companies.update([u, v])
            if d.get("amount", 0) > 500000:
                alerts.append({
                    "alert_id": f"HV-{u}-{v}",
                    "fraud_type": "High Volume",
                    "details": f"High volume transaction between {u} and {v}: ₹{d['amount']}",
                    "risk_level": "Medium",
                    "entities": [u, v]
                })
                suspicious_companies.update([u, v])

    # 4. Repeated Identical Amounts (Transaction Pattern Detector)
    amount_counts = {}
    for tx in transactions:
        amount = tx.get("amount", 0)
        pair = (tx.get("seller"), tx.get("buyer"))
        if amount > 0:
            key = (pair, amount)
            amount_counts[key] = amount_counts.get(key, 0) + 1
            
    for (pair, amount), count in amount_counts.items():
        if count >= 3:
            u, v = pair
            alerts.append({
                "alert_id": f"PAT-{u}-{v}-{int(amount)}",
                "fraud_type": "Suspicious Transaction Pattern",
                "details": f"Detected {count} identical transactions of ₹{amount} between {u} and {v}",
                "risk_level": "Medium",
                "entities": [u, v]
            })
            suspicious_companies.update([u, v])

    # 5. ML Anomaly Detection (Isolation Forest)
    try:
        from sklearn.ensemble import IsolationForest
        import numpy as np
        
        features = []
        company_list = []
        for n, data in G.nodes(data=True):
            if data.get("type", "Unknown") == "Company":
                in_edges = list(G.in_edges(n, data=True))
                out_edges = list(G.out_edges(n, data=True))
                
                total_in = sum(d.get("amount", 0) for u, v, d in in_edges)
                total_out = sum(d.get("amount", 0) for u, v, d in out_edges)
                
                distinct_partners = set([u for u, v, d in in_edges] + [v for u, v, d in out_edges])
                num_partners = len(distinct_partners)
                
                total_tx = len(in_edges) + len(out_edges)
                avg_tx_size = (total_in + total_out) / max(1, total_tx)
                
                features.append([total_in + total_out, num_partners, avg_tx_size])
                company_list.append(n)
                
        if len(features) > 10:
            X = np.array(features)
            clf = IsolationForest(contamination=0.05, random_state=42)
            preds = clf.fit_predict(X)
            
            for i, p in enumerate(preds):
                if p == -1:
                    comp = company_list[i]
                    f = features[i]
                    alerts.append({
                        "alert_id": f"ML-{comp}",
                        "fraud_type": "AI Anomaly Detected",
                        "details": f"Isolation Forest flagged {comp} due to unusual behavior. Volume ₹{f[0]:.0f}, Partners {f[1]}, Avg Tx ₹{f[2]:.0f}",
                        "risk_level": "Medium",
                        "entities": [comp]
                    })
                    suspicious_companies.update([comp])
    except Exception as e:
        print("ML Anomaly Error:", e)

    # 6. Fraud Prediction (Logistic Regression)
    try:
        from sklearn.linear_model import LogisticRegression
        import numpy as np
        
        # Simple mock training set
        # Features: [Volume, Partners, Avg Tx]
        X_train = np.array([
            [50000, 2, 25000], [10000, 1, 10000], [800000, 15, 53000], # Normal
            [5000000, 5, 1000000], [900000, 10, 90000], [1500000, 2, 750000] # Fraud
        ])
        y_train = np.array([0, 0, 0, 1, 1, 1])
        
        lr_clf = LogisticRegression(random_state=42)
        lr_clf.fit(X_train, y_train)
        
        if 'features' in locals() and len(features) > 0:
            X_test = np.array(features)
            probs = lr_clf.predict_proba(X_test)[:, 1] # Probability of fraud (class=1)
            
            for i, prob in enumerate(probs):
                if prob > 0.65: # High probability threshold
                    comp = company_list[i]
                    f = features[i]
                    alerts.append({
                        "alert_id": f"PRED-{comp}",
                        "fraud_type": "Future Fraud Prediction",
                        "details": f"AI Prediction: {prob*100:.1f}% probability of future fraud based on trading patterns.",
                        "risk_level": "High" if prob > 0.85 else "Medium",
                        "entities": [comp],
                        "probability": float(prob)
                    })
                    suspicious_companies.update([comp])
    except Exception as e:
        print("ML Prediction Error:", e)

    return alerts, list(suspicious_companies)

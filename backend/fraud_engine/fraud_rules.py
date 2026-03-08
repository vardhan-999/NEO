import networkx as nx
from fraud_engine.graph_builder import G

def run_fraud_detection(transactions):
    alerts = []
    suspicious_companies = set()
    
    # 1. Circular Trading Detection (Cycles length 3+)
    # We only look at 'trades_with' edges by extracting a subgraph
    trade_edges = [(u, v) for u, v, d in G.edges(data=True) if d.get("type") == "trades_with"]
    trade_graph = nx.DiGraph()
    trade_graph.add_edges_from(trade_edges)
    
    try:
        cycles = list(nx.simple_cycles(trade_graph))
        for cycle in cycles:
            if len(cycle) >= 3:
                alerts.append({
                    "alert_id": f"CT-{cycle[0]}",
                    "fraud_type": "Circular Trading",
                    "details": " -> ".join(cycle + [cycle[0]]),
                    "risk_level": "High"
                })
                suspicious_companies.update(cycle)
    except:
        pass
        
    # 2. Shared Director Detection
    director_nodes = [n for n, d in G.nodes(data=True) if d.get("type") == "Director"]
    for d in director_nodes:
        # Out edges from director are 'owns' company
        owned_companies = [v for u, v in G.out_edges(d)]
        if len(owned_companies) > 3:
            alerts.append({
                "alert_id": f"SD-{d}",
                "fraud_type": "Shared Director",
                "details": f"Director {d} controls {len(owned_companies)} companies: {', '.join(owned_companies[:5])}...",
                "risk_level": "High"
            })
            suspicious_companies.update(owned_companies)
            
    # 3. ITC Anomalies (Simple proxy: huge transactions)
    for u, v, d in G.edges(data=True):
        if d.get("type") == "trades_with":
            if d.get("gst", 0) > 1000000: # Arbitrary high threshold for Hackathon
                alerts.append({
                    "alert_id": f"ITC-{u}-{v}",
                    "fraud_type": "High ITC Claim",
                    "details": f"Suspiciously high GST transaction between {u} and {v}: ₹{d['gst']}",
                    "risk_level": "Medium"
                })
                suspicious_companies.add(u)
                suspicious_companies.add(v)

    return alerts, list(suspicious_companies)

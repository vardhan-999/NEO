from fastapi import APIRouter, HTTPException
import networkx as nx
from fraud_engine.graph_builder import G
from fraud_engine.fraud_rules import run_fraud_detection
from fraud_engine.risk_scoring import calculate_risk_scores

router = APIRouter()

@router.get("/investigate/{node_id}")
async def investigate_node(node_id: str):
    if not G.has_node(node_id):
        raise HTTPException(status_code=404, detail="Node not found in graph")
    
    node_data = G.nodes[node_id]
    node_type = node_data.get("type", "Unknown")
    
    # Run the detection rules to get fresh alerts and risk scores
    trade_edges = [(u, v, d) for u, v, d in G.edges(data=True) if d.get("type") == "trades_with"]
    transactions_dict = []
    for u, v, d in trade_edges:
        transactions_dict.append({
            "seller": u,
            "buyer": v,
            "director": "", # We'll just rely on the existing graph relationships rather than rebuilding perfectly
            "amount": d.get("amount", 0),
            "gst": d.get("gst", 0)
        })
        
    alerts, _ = run_fraud_detection(transactions_dict)
    
    # Re-calculate suspicious companies so we can get risk score
    # Note: For simplicity in the hackathon, we'll quickly recalculate
    # However fraud_rules expects just the dicts from the DB. 
    # Let's just find alerts matching our node
    node_alerts = []
    suspicious_companies_involved = set()
    for alert in alerts:
        if node_id in alert["details"]:
            node_alerts.append(alert)
        if "High ITC" in alert["fraud_type"] and alert.get("alert_id").startswith("ITC"):
            _, s, b = alert["alert_id"].split("-", 2)
            if s == node_id or b == node_id:
                if alert not in node_alerts:
                    node_alerts.append(alert)
                    
    # Circular paths specific to this node
    circular_paths = []
    trade_graph = nx.DiGraph()
    trade_graph.add_edges_from([(u, v) for u, v, d in trade_edges])
    try:
        cycles = list(nx.simple_cycles(trade_graph, length_bound=4))
        for cycle in cycles:
            if node_id in cycle and len(cycle) >= 3:
                circular_paths.append(cycle)
    except Exception as e:
        print("Cycle error", e)

    # Risk Score approximation based on connected alerts (now using real scoring)
    scores, reasons = calculate_risk_scores(alerts, [node_id])
    risk_score = scores.get(node_id, 0)
    ai_explanations = reasons.get(node_id, [])

    # Neighborhood Data for Local Graph
    neighborhood_nodes = {node_id}
    neighborhood_edges = []
    
    transactions = []
    director_relationships = []
    
    # Outgoing edges
    for u, v, data in G.out_edges(node_id, data=True):
        neighborhood_nodes.add(v)
        neighborhood_edges.append({"source": u, "target": v, "label": data.get("type", ""), "amount": data.get("amount", 0), "gst": data.get("gst", 0)})
        if data.get("type") == "trades_with":
            transactions.append({"date": "2024-03-01", "seller": u, "buyer": v, "amount": data.get("amount", 0), "gst": data.get("amount", 0)})
        elif data.get("type") == "owns":
            director_relationships.append({"director": u, "company": v})
            
    # Incoming edges
    for u, v, data in G.in_edges(node_id, data=True):
        neighborhood_nodes.add(u)
        neighborhood_edges.append({"source": u, "target": v, "label": data.get("type", ""), "amount": data.get("amount", 0), "gst": data.get("gst", 0)})
        if data.get("type") == "trades_with":
            transactions.append({"date": "2024-03-01", "seller": u, "buyer": v, "amount": data.get("amount", 0), "gst": data.get("amount", 0)})
        elif data.get("type") == "owns":
            director_relationships.append({"director": u, "company": v})

    # Prepare local graph
    local_graph = {
        "nodes": [{"id": n, "group": G.nodes[n].get("type", "Unknown")} for n in neighborhood_nodes],
        "links": neighborhood_edges
    }
    
    # Also fetch full cycles so we can render the whole loop if necessary
    for cycle in circular_paths:
        for i in range(len(cycle)):
            u = cycle[i]
            v = cycle[(i + 1) % len(cycle)]
            # Add to local graph if not already there
            if u not in neighborhood_nodes:
                neighborhood_nodes.add(u)
                local_graph["nodes"].append({"id": u, "group": G.nodes[u].get("type", "Unknown")})
            if v not in neighborhood_nodes:
                neighborhood_nodes.add(v)
                local_graph["nodes"].append({"id": v, "group": G.nodes[v].get("type", "Unknown")})
            
            # Check if edge already in local_graph
            edge_exists = any(e["source"] == u and e["target"] == v for e in local_graph["links"])
            if not edge_exists:
                # Get edge details if possible
                if G.has_edge(u, v):
                    data = G.get_edge_data(u, v)
                    # Handle MultiDiGraph by fetching first edge key usually 0
                    if isinstance(data, dict) and 0 in data:
                        d = data[0]
                    else:
                        d = data
                    local_graph["links"].append({"source": u, "target": v, "label": d.get("type", "trades_with"), "amount": d.get("amount", 0), "gst": d.get("gst", 0)})

    profile = {
        "name": node_id,
        "type": node_type,
        "gstin": f"{node_id[:5].upper()}{1234 + len(node_id)}XYZ",
        "registration_date": "2019-06-12",
        "risk_level": "Critical" if risk_score > 80 else "High" if risk_score > 60 else "Medium" if risk_score > 30 else "Normal",
        "risk_score": risk_score,
        "ai_explanations": ai_explanations
    }
    
    return {
        "profile": profile,
        "alerts": node_alerts,
        "circular_paths": circular_paths,
        "transactions": transactions,
        "director_relationships": director_relationships,
        "local_graph": local_graph
    }

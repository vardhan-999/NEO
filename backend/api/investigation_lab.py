from fastapi import APIRouter
import networkx as nx
from fraud_engine.graph_builder import G
from fraud_engine.fraud_rules import run_fraud_detection
from fraud_engine.risk_scoring import calculate_risk_scores
from services.anomaly_detector import detector

router = APIRouter()


def _gstin_for(name: str) -> str:
    """Generate a fake GSTIN for demo purposes."""
    prefix = name.replace(" ", "")[:5].upper().ljust(5, "X")
    return f"{prefix}{1000 + len(name)}IN"


def _get_risk_for_node(node_id: str) -> dict:
    """Compute rule-based risk and try to get AI anomaly score."""
    trade_edges = [(u, v, d) for u, v, d in G.edges(data=True) if d.get("type") == "trades_with"]
    transactions_dict = [
        {"seller": u, "buyer": v, "director": "", "amount": d.get("amount", 0), "gst": d.get("gst", 0)}
        for u, v, d in trade_edges
    ]
    alerts, _ = run_fraud_detection(transactions_dict)
    scores, reasons = calculate_risk_scores(alerts, [node_id])
    risk_score = scores.get(node_id, 0)
    risk_level = ("Critical" if risk_score > 80 else "High" if risk_score > 60
                  else "Medium" if risk_score > 30 else "Normal")
    return {"risk_score": risk_score, "risk_level": risk_level, "reasons": reasons.get(node_id, [])}


def _get_ai_score_for(seller: str, buyer: str) -> float:
    """Try to get AI anomaly score for a specific pair."""
    try:
        results = detector.detect()
        for r in results:
            if r["seller"] == seller and r["buyer"] == buyer:
                return r["anomaly_score"]
        # If the company appears anywhere as seller/buyer, take max score
        max_score = 0.0
        for r in results:
            if r["seller"] == seller or r["buyer"] == buyer:
                max_score = max(max_score, r["anomaly_score"])
        return round(max_score, 3)
    except Exception:
        return 0.0


@router.get("/lab/search")
async def lab_search(q: str = ""):
    """Search companies, GSTINs, directors in the graph."""
    if not q or len(q) < 2:
        return {"results": []}

    q_lower = q.lower()
    results = []
    for node, data in G.nodes(data=True):
        node_lower = node.lower()
        if q_lower in node_lower:
            results.append({
                "id": node,
                "type": data.get("type", "Company"),
                "gstin": _gstin_for(node) if data.get("type") != "Director" else None,
                "name": node
            })
        if len(results) >= 15:
            break

    return {"results": results}


@router.get("/lab/company/{name:path}")
async def lab_company(name: str):
    """Return full investigation profile for a company or director."""
    if not G.has_node(name):
        return {"error": f"'{name}' not found in graph. Upload a dataset first."}

    node_data = G.nodes[name]
    node_type = node_data.get("type", "Company")

    # Risk scores
    risk_info = _get_risk_for_node(name)

    # AI anomaly score – best score involving this entity
    ai_score = _get_ai_score_for(name, name)
    ai_level = ("High" if ai_score > 0.7 else "Medium" if ai_score > 0.4 else "Normal")

    # Transactions
    transactions = []
    for u, v, d in G.out_edges(name, data=True):
        if d.get("type") == "trades_with":
            transactions.append({"seller": u, "buyer": v, "amount": d.get("amount", 0), "gst": d.get("gst", 0)})
    for u, v, d in G.in_edges(name, data=True):
        if d.get("type") == "trades_with":
            transactions.append({"seller": u, "buyer": v, "amount": d.get("amount", 0), "gst": d.get("gst", 0)})

    # Local network graph
    neighborhood_nodes = {name}
    neighborhood_edges = []
    for u, v, d in G.out_edges(name, data=True):
        neighborhood_nodes.add(v)
        neighborhood_edges.append({"source": u, "target": v, "label": d.get("type", ""), "amount": d.get("amount", 0)})
    for u, v, d in G.in_edges(name, data=True):
        neighborhood_nodes.add(u)
        neighborhood_edges.append({"source": u, "target": v, "label": d.get("type", ""), "amount": d.get("amount", 0)})

    local_graph = {
        "nodes": [{"id": n, "group": G.nodes[n].get("type", "Company")} for n in neighborhood_nodes],
        "links": neighborhood_edges
    }

    # Director relationships
    directors = []
    for u, v, d in G.in_edges(name, data=True):
        if d.get("type") == "owns":
            directors.append(u)

    profile = {
        "name": name,
        "type": node_type,
        "gstin": _gstin_for(name),
        "registration_date": "2019-06-12",
        "risk_score": risk_info["risk_score"],
        "risk_level": risk_info["risk_level"],
        "ai_anomaly_score": ai_score,
        "ai_anomaly_level": ai_level,
        "risk_reasons": risk_info["reasons"],
        "directors": directors,
        "transaction_count": len(transactions)
    }

    return {
        "profile": profile,
        "transactions": transactions,
        "local_graph": local_graph
    }


@router.get("/lab/chain/{start:path}")
async def lab_chain(start: str, end: str = ""):
    """Find shortest invoice chain path between two companies."""
    if not end:
        return {"error": "Provide 'end' query parameter", "path": []}

    if not G.has_node(start):
        return {"error": f"'{start}' not found in graph", "path": []}
    if not G.has_node(end):
        return {"error": f"'{end}' not found in graph", "path": []}

    try:
        # Build trade-only subgraph for path finding
        trade_graph = nx.DiGraph()
        for u, v, d in G.edges(data=True):
            if d.get("type") == "trades_with":
                trade_graph.add_edge(u, v, **d)

        path = nx.shortest_path(trade_graph, source=start, target=end)
        
        # Build edges along the path
        edges = []
        for i in range(len(path) - 1):
            u, v = path[i], path[i + 1]
            edge_data = G.get_edge_data(u, v) or {}
            edges.append({
                "source": u,
                "target": v,
                "amount": edge_data.get("amount", 0),
                "gst": edge_data.get("gst", 0)
            })

        return {"path": path, "edges": edges, "length": len(path)}

    except nx.NetworkXNoPath:
        return {"error": f"No transaction path found from '{start}' to '{end}'", "path": []}
    except nx.NodeNotFound as e:
        return {"error": str(e), "path": []}
    except Exception as e:
        return {"error": str(e), "path": []}


@router.get("/lab/network-map")
async def lab_network_map():
    """Return full fraud network map with risk-colored nodes."""
    if G.number_of_nodes() == 0:
        return {"nodes": [], "links": []}

    # Get all anomalies to enrich node risk
    try:
        anomalies = detector.detect()
        anomaly_map = {}
        for a in anomalies:
            score = a["anomaly_score"]
            anomaly_map[a["seller"]] = max(anomaly_map.get(a["seller"], 0), score)
            anomaly_map[a["buyer"]] = max(anomaly_map.get(a["buyer"], 0), score)
    except Exception:
        anomaly_map = {}

    # Rule-based risk scores
    trade_edges = [(u, v, d) for u, v, d in G.edges(data=True) if d.get("type") == "trades_with"]
    tx_dicts = [{"seller": u, "buyer": v, "director": "", "amount": d.get("amount", 0), "gst": d.get("gst", 0)} for u, v, d in trade_edges]
    if tx_dicts:
        alerts, suspicious = run_fraud_detection(tx_dicts)
        companies = list(G.nodes())
        scores, _ = calculate_risk_scores(alerts, companies)
    else:
        scores = {}

    nodes = []
    for n, data in G.nodes(data=True):
        node_type = data.get("type", "Company")
        rule_score = scores.get(n, 0)
        ai_score = anomaly_map.get(n, 0)
        
        # Combined color decision
        if node_type == "Director":
            color = "purple"
        elif rule_score > 60 or ai_score > 0.7:
            color = "red"
        elif rule_score > 30 or ai_score > 0.4:
            color = "orange"
        else:
            color = "green"

        nodes.append({
            "id": n,
            "type": node_type,
            "color": color,
            "risk_score": rule_score,
            "ai_score": ai_score
        })

    links = []
    for u, v, d in G.edges(data=True):
        links.append({
            "source": u,
            "target": v,
            "label": d.get("type", ""),
            "amount": d.get("amount", 0),
            "suspicious": anomaly_map.get(u, 0) > 0.7 or anomaly_map.get(v, 0) > 0.7
        })

    return {"nodes": nodes, "links": links}

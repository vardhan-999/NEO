import networkx as nx

# Global in-memory graph
G = nx.DiGraph()

def build_graph_from_db(transactions):
    global G
    G.clear()
    
    for row in transactions:
        seller = row['seller']
        buyer = row['buyer']
        director = row.get('director', 'Unknown')
        amount = float(row['amount'])
        gst = float(row['gst'])

        # Nodes
        if not G.has_node(seller):
            G.add_node(seller, type="Company", label=seller, director=director)
        if not G.has_node(buyer):
            G.add_node(buyer, type="Company", label=buyer)
        if not G.has_node(director):
            G.add_node(director, type="Director", label=director)

        # Edges
        # Trade Edge
        if G.has_edge(seller, buyer):
            G[seller][buyer]['amount'] += amount
            G[seller][buyer]['gst'] += gst
        else:
            G.add_edge(seller, buyer, type="trades_with", amount=amount, gst=gst)

        # Ownership Edge
        G.add_edge(director, seller, type="owns")
        
    return {
        "nodes": G.number_of_nodes(),
        "edges": G.number_of_edges()
    }

def get_graph_data():
    nodes = []
    edges = []
    clusters: dict = {}
    
    # Compute Louvain communities
    try:

        import community.community_louvain as community_louvain
        undirected_G = nx.Graph(G) # Convert to simple undirected graph for Louvain
        partition = community_louvain.best_partition(undirected_G)
    except Exception as e:
        print("Louvain error:", e)
        partition = {}

    for n, data in G.nodes(data=True):
        cluster_id = partition.get(n, 0)
        group = data.get("type", "Unknown")
        nodes.append({"id": n, "group": group, "cluster": cluster_id})
        
        # Build cluster summaries
        if cluster_id not in clusters:
            clusters[cluster_id] = {"id": cluster_id, "companies": [], "directors": []}
        if group == "Director":
            clusters[cluster_id]["directors"].append(n)
        else:
            clusters[cluster_id]["companies"].append(n)
        
    for u, v, data in G.edges(data=True):
        edge_data = {"source": u, "target": v, "label": data.get("type", "")}
        if "amount" in data:
            edge_data["amount"] = data["amount"]
        if "gst" in data:
            edge_data["gst"] = data["gst"]
        edges.append(edge_data)
        
    # Format clusters list
    cluster_list = list(clusters.values())
        
    return {"nodes": nodes, "links": edges, "clusters": cluster_list}

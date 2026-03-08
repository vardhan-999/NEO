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
    
    for n, data in G.nodes(data=True):
        nodes.append({"id": n, "group": data.get("type", "Unknown")})
        
    for u, v, data in G.edges(data=True):
        edges.append({"source": u, "target": v, "label": data.get("type", "")})
        
    return {"nodes": nodes, "links": edges}

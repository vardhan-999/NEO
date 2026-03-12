import networkx as nx
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import StandardScaler
from fraud_engine.graph_builder import G
from typing import List, Dict, Any

class AnomalyDetector:
    def __init__(self):
        self.scaler = StandardScaler()
        # Hyperparameters tuned for fraud detection
        self.iso_forest = IsolationForest(n_estimators=100, contamination=0.1, random_state=42)
        # We will use a synthetic semi-supervised approach for RF if we don't have true labels
        self.rf = RandomForestClassifier(n_estimators=100, random_state=42) 
        self.lof = LocalOutlierFactor(n_neighbors=20, contamination=0.1, novelty=True)
        self.is_trained = False

    def extract_features(self) -> pd.DataFrame:
        """Extract features from the in-memory graph G."""
        if G.number_of_edges() == 0:
            return pd.DataFrame()

        # Build edge data
        edge_records = []
        company_freq = {}
        
        # Count frequency
        for u, v, d in G.edges(data=True):
            if d.get("type") == "trades_with":
                company_freq[u] = company_freq.get(u, 0) + 1
                company_freq[v] = company_freq.get(v, 0) + 1

        for u, v, d in G.edges(data=True):
            if d.get("type") == "trades_with":
                amount = float(d.get("amount", 0))
                gst = float(d.get("gst", 0))
                
                # Network features
                u_degree = G.degree(u) if G.has_node(u) else 0
                v_degree = G.degree(v) if G.has_node(v) else 0
                
                edge_records.append({
                    "seller": u,
                    "buyer": v,
                    "amount": amount,
                    "gst": gst,
                    "gst_ratio": gst / amount if amount > 0 else 0,
                    "seller_freq": company_freq.get(u, 1),
                    "buyer_freq": company_freq.get(v, 1),
                    "seller_degree": u_degree,
                    "buyer_degree": v_degree
                })

        return pd.DataFrame(edge_records)

    def train(self):
        """Train models on current graph data."""
        df = self.extract_features()
        if df.empty or len(df) < 10:
            self.is_trained = False
            return False

        # Features for ML
        features = df[['amount', 'gst', 'gst_ratio', 'seller_freq', 'buyer_freq', 'seller_degree', 'buyer_degree']]
        
        # Scale
        X_scaled = self.scaler.fit_transform(features)

        # 1. Train Isolation Forest
        self.iso_forest.fit(X_scaled)
        
        # 2. Train LOF (with novelty=True so we can predict later)
        self.lof.fit(X_scaled)
        
        # 3. Train RF using IF + LOF consensus as weak labels
        if_preds = self.iso_forest.predict(X_scaled) # -1 is outlier
        lof_preds = self.lof.predict(X_scaled)       # -1 is outlier
        
        # Create pseudo-labels: 1 if both think it's an outlier, else 0
        pseudo_labels = ((if_preds == -1) & (lof_preds == -1)).astype(int)
        
        # Only train if we found some outliers, otherwise skip RF
        if sum(pseudo_labels) > 0 and sum(pseudo_labels) < len(pseudo_labels):
            self.rf.fit(X_scaled, pseudo_labels)
        else:
            # Fallback dumb model that predicts 0
            self.rf.fit(X_scaled, np.zeros(len(X_scaled)))

        self.is_trained = True
        return True

    def detect(self) -> List[Dict[str, Any]]:
        """Run detection and return top anomalies."""
        if not self.is_trained:
            success = self.train()
            if not success:
                return []

        df = self.extract_features()
        if df.empty:
            return []

        features = df[['amount', 'gst', 'gst_ratio', 'seller_freq', 'buyer_freq', 'seller_degree', 'buyer_degree']]
        X_scaled = self.scaler.transform(features)

        # Get anomaly scores (lower is more anomalous for IF and LOF)
        if_scores = self.iso_forest.decision_function(X_scaled)
        lof_scores = self.lof.decision_function(X_scaled)
        
        # RF probability of being anomaly (class 1)
        try:
            rf_probs = self.rf.predict_proba(X_scaled)[:, 1]
        except IndexError:
            rf_probs = np.zeros(len(X_scaled))

        # Normalize IF and LOF scores to 0-1 range (1 = high anomaly)
        # IF decision function: negative implies anomaly. Reverse and normalize.
        if_norm = (if_scores.max() - if_scores) / (if_scores.max() - if_scores.min() + 1e-8)
        lof_norm = (lof_scores.max() - lof_scores) / (lof_scores.max() - lof_scores.min() + 1e-8)
        
        # Ensemble Score
        ensemble_score = (if_norm * 0.4) + (lof_norm * 0.4) + (rf_probs * 0.2)
        
        df['anomaly_score'] = ensemble_score
        
        # Filter top anomalies
        threshold = np.percentile(ensemble_score, 90) # Top 10%
        anomalies_df = df[df['anomaly_score'] > threshold].copy()
        
        # Sort by score descending
        anomalies_df = anomalies_df.sort_values('anomaly_score', ascending=False)
        
        results = []
        for _, row in anomalies_df.head(20).iterrows():
            score = float(row['anomaly_score'])
            
            # Formulate risk and reason
            risk_level = "Critical" if score > 0.8 else "High" if score > 0.6 else "Medium"
            
            details = []
            if row['amount'] > df['amount'].mean() * 3:
                details.append(f"Amount {row['amount']:,.0f} is unusually high.")
            if row['gst_ratio'] > df['gst_ratio'].mean() * 1.5:
                details.append("Suspiciously high GST ratio.")
            if row['seller_degree'] > df['seller_degree'].mean() * 3:
                details.append(f"Seller {row['seller']} has abnormal network activity.")
                
            reason = " ".join(details) if details else "Statistical anomaly detected across multiple dimensions."

            results.append({
                "seller": row['seller'],
                "buyer": row['buyer'],
                "amount": float(row['amount']),
                "anomaly_score": round(score, 3),
                "risk_level": risk_level,
                "reason": reason
            })
            
        return results

# Singleton instance
detector = AnomalyDetector()

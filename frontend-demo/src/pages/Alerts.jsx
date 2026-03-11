import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, CheckCircle2 } from 'lucide-react';

export default function Alerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setAlerts([
        { alert_id: 'CT-MegaCorp', risk_level: 'High', fraud_type: 'Circular Trading', details: 'Detected a 3-hop circular trading loop involving MegaCorp and 2 other entities.' },
        { alert_id: 'SD-Subhas Traders', risk_level: 'High', fraud_type: 'Shared Director Syndicate', details: 'A director associated with Subhas Traders manages 5 other entities with suspicious transaction volumes.' },
        { alert_id: 'FV-Ghost Shell Pvt Ltd', risk_level: 'Critical', fraud_type: 'Fake Invoice (No E-way Bill)', details: 'High volume of transactions without corresponding E-way bills detected for Ghost Shell Pvt Ltd.' },
        { alert_id: 'ML-ANOMALY-1', risk_level: 'High', fraud_type: 'AI Prediction: Future Fraud', details: 'ML models forecast an 89% probability that this entity will become a shell company in the next 30 days based on dormant behavior.' },
        { alert_id: 'ML-ANOMALY-2', risk_level: 'Critical', fraud_type: 'AI Anomaly: ITC Mismatch', details: 'Unusual spike in Input Tax Credit claims compared to historical baselines. Flagged for audit.' }
      ]);
      setLoading(false);
    }, 400);
  }, []);

  if (loading) return <div className="text-center mt-20 animate-pulse text-primary">Fetching logs...</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <AlertOctagon className="mr-3 text-red-500" /> 
            Comprehensive Alert Log
          </h1>
          <p className="text-textMuted mt-1">Detailed breakdown of all flagged incidents</p>
        </div>
        
        <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-surface border border-white/10">
          <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          <span className="text-sm font-bold text-red-400">{alerts.length} Active System Alerts</span>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center justify-center">
          <CheckCircle2 size={64} className="text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">System Clear</h2>
          <p className="text-textMuted">No fraudulent patterns detected in the current dataset.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert, idx) => (
            <div key={idx} className="glass-panel p-6 border-l-4 border-l-red-500 flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <span className="px-2 py-1 text-xs font-bold rounded bg-red-500/20 text-red-400 uppercase tracking-wider">
                    {alert.risk_level} Risk
                  </span>
                  <span className="text-xs text-textMuted font-mono bg-black/50 px-2 py-1 rounded">
                    ID: {alert.alert_id}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{alert.fraud_type}</h3>
                <p className="text-gray-300">
                  {alert.details}
                </p>
              </div>
              <button 
                onClick={() => {
                  // Extract node ID: CT-Subhas Traders -> Subhas Traders
                  let node = alert.alert_id;
                  if (node.startsWith("CT-") || node.startsWith("SD-")) {
                    node = node.substring(3);
                  } else if (node.startsWith("ITC-")) {
                    // Just investigate the first node in the ITC pair "ITC-A-B" -> A
                    const parts = node.split("-");
                    if (parts.length >= 2) node = parts[1];
                  }
                  navigate(`/investigate/${encodeURIComponent(node)}`);
                }}
                className="px-4 py-2 text-sm bg-surface hover:bg-white/10 border border-white/10 rounded-lg transition-colors font-medium">
                Investigate Node
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

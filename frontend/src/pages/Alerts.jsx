import { useState, useEffect } from 'react';
import { AlertOctagon, CheckCircle2 } from 'lucide-react';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/api/detect-fraud', { method: 'POST' })
      .then(res => res.json())
      .then(d => { setAlerts(d.alerts || []); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
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
              <button className="px-4 py-2 text-sm bg-surface hover:bg-white/10 border border-white/10 rounded-lg transition-colors font-medium">
                Investigate Node
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

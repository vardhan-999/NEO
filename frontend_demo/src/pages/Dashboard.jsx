import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Activity, Users, ShieldAlert } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';
import { mockFraudData } from '../mockData';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setData(mockFraudData);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-pulse-slow text-primary text-2xl font-bold flex items-center">
        <Activity className="animate-spin mr-3" /> Processing Risk Matrices...
      </div>
    </div>
  );

  if (!data || !data.alerts) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <AlertTriangle size={64} className="text-yellow-500 mb-4" />
      <h2 className="text-2xl font-bold">No Data Found</h2>
      <p className="text-textMuted mt-2">Please upload a dataset first.</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
          <Activity className="mr-3 text-primary" /> Risk Intelligence Dashboard
        </h1>
        <p className="text-textMuted">Enterprise GST Compliance & Fraud Exposure Overview</p>
      </header>
      
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 flex flex-col justify-center border-l-4 border-l-red-500">
          <div className="text-textMuted text-sm font-semibold uppercase tracking-wider mb-2 flex items-center">
            <ShieldAlert size={16} className="mr-2 text-red-500" /> High Risk Entities
          </div>
          <div className="text-4xl font-extrabold text-white">{data.suspicious_companies.filter(c => c.risk > 50).length}</div>
        </div>
        
        <div className="glass-panel p-6 flex flex-col justify-center border-l-4 border-l-primary">
          <div className="text-textMuted text-sm font-semibold uppercase tracking-wider mb-2 flex items-center">
            <Users size={16} className="mr-2 text-primary" /> Total Monitored
          </div>
          <div className="text-4xl font-extrabold text-white">{data.suspicious_companies.length}</div>
        </div>

        <div className="glass-panel p-6 flex flex-col justify-center border-l-4 border-l-yellow-500">
          <div className="text-textMuted text-sm font-semibold uppercase tracking-wider mb-2 flex items-center">
            <Activity size={16} className="mr-2 text-yellow-500" /> Detected Incidents
          </div>
          <div className="text-4xl font-extrabold text-white">{data.alerts.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        
        {/* Chart */}
        <div className="glass-panel p-6">
          <h3 className="text-lg font-bold mb-6 text-white">Top 10 High Risk Entities</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.suspicious_companies} margin={{ left: -20, bottom: 20 }}>
                <XAxis dataKey="company" stroke="#94a3b8" fontSize={12} angle={-45} textAnchor="end" />
                <YAxis stroke="#94a3b8" />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#12121a', border: '1px solid #334155', borderRadius: '8px' }}
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                />
                <Bar dataKey="risk" radius={[4, 4, 0, 0]}>
                  {data.suspicious_companies.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.risk >= 50 ? '#ef4444' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Alerts Stream */}
        <div className="glass-panel p-0 overflow-hidden flex flex-col h-[400px]">
          <div className="p-6 border-b border-white/10 bg-surface/50">
            <h3 className="text-lg font-bold text-white flex items-center">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-3" />
              Live Detection Stream
            </h3>
          </div>
          <div className="overflow-y-auto flex-1 p-6 space-y-4">
            {data.alerts.map((alert, i) => (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={i} 
                className="p-4 rounded-xl bg-surface border border-white/5 flex items-start space-x-4 hover:border-red-500/50 transition-colors"
              >
                <div className={`p-2 rounded-full mt-1 ${alert.risk_level === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{alert.fraud_type}</h4>
                  <p className="text-sm text-textMuted mt-1">{alert.details}</p>
                </div>
              </motion.div>
            ))}
            {data.alerts.length === 0 && <p className="text-textMuted">No anomalies detected.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

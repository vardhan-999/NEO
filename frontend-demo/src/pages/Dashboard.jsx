import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Activity, Users, ShieldAlert, UploadCloud, FileType, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Upload states
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [errorMSG, setErrorMSG] = useState('');

  const fetchData = () => {
    setLoading(true);
    setTimeout(() => {
      setData({
        suspicious_companies: [
          { company: 'MegaCorp', risk: 85 },
          { company: 'Subhas Traders', risk: 78 },
          { company: 'Ghost Shell Pvt Ltd', risk: 95 },
          { company: 'Circular Network A', risk: 65 },
          { company: 'Circular Network B', risk: 65 },
          { company: 'Normal Corp', risk: 20 },
          { company: 'Future Fraudster Ltd', risk: 70 },
          { company: 'Anomaly Corp Pvt', risk: 90 }
        ],
        alerts: [
          { alert_id: 'CT-MegaCorp', risk_level: 'High', fraud_type: 'Circular Trading', details: 'Detected a 3-hop circular trading loop involving MegaCorp and 2 other entities.', entities: ['MegaCorp'] },
          { alert_id: 'SD-Subhas Traders', risk_level: 'High', fraud_type: 'Shared Director Syndicate', details: 'A director associated with Subhas Traders manages 5 other entities with suspicious transaction volumes.', entities: ['Subhas Traders'] },
          { alert_id: 'FV-Ghost Shell Pvt Ltd', risk_level: 'Critical', fraud_type: 'Fake Invoice (No E-way Bill)', details: 'High volume of transactions without corresponding E-way bills detected for Ghost Shell Pvt Ltd.', entities: ['Ghost Shell Pvt Ltd'] },
          { alert_id: 'ML-ANOMALY-1', risk_level: 'High', fraud_type: 'AI Prediction: Future Fraud', details: 'ML models forecast an 89% probability that this entity will become a shell company in the next 30 days based on dormant behavior.', entities: ['Future Fraudster Ltd'] },
          { alert_id: 'ML-ANOMALY-2', risk_level: 'Critical', fraud_type: 'AI Anomaly', details: 'Unusual spike in Input Tax Credit claims compared to historical baselines.', entities: ['Anomaly Corp Pvt'] }
        ]
      });
      setLoading(false);
    }, 500);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.endsWith('.csv')) {
      setFile(droppedFile);
      setErrorMSG('');
    } else {
      setErrorMSG('Please upload a valid CSV file.');
    }
  };

  const processData = async () => {
    if (!file) return;
    try {
      setUploadStatus('uploading');
      await new Promise(r => setTimeout(r, 600));
      
      setUploadStatus('building');
      await new Promise(r => setTimeout(r, 800));
      
      setUploadStatus('detecting');
      await new Promise(r => setTimeout(r, 800));

      setUploadStatus('done');
      setTimeout(() => {
        setUploadStatus('idle');
        setFile(null);
        fetchData();
      }, 2000);

    } catch (err) {
      console.error(err);
      setErrorMSG('Processing Failed: ' + (err.message || 'Server Error'));
      setUploadStatus('idle');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="mb-4">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
          <Activity className="mr-3 text-primary" /> Risk Intelligence Dashboard
        </h1>
        <p className="text-textMuted">Enterprise GST Compliance & Fraud Exposure Overview</p>
      </header>

      {/* Upload Panel */}
      <div className="glass-panel p-6 border border-white/10">
        <h2 className="text-xl font-bold text-white mb-4">Upload Dataset</h2>
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => document.getElementById('dashboard-file-upload').click()}
            className={`flex-1 w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
              file ? 'border-primary/50 bg-primary/5' : 'border-white/20 hover:border-primary/50 bg-surface/30'
            }`}
          >
            <input 
              id="dashboard-file-upload" 
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={(e) => {
                if(e.target.files[0]) {
                  setFile(e.target.files[0]);
                  setErrorMSG('');
                }
              }} 
            />
            {file ? (
              <div className="flex flex-col items-center text-primary">
                <FileType size={32} className="mb-2" />
                <p className="text-md font-bold text-center break-all">{file.name}</p>
                <p className="text-xs mt-1">Ready for analysis</p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-textMuted text-center">
                <UploadCloud size={32} className="mb-2" />
                <p className="text-sm font-medium text-white mb-1">Drag and drop CSV here</p>
                <p className="text-xs">or click to browse</p>
                <p className="text-[10px] mt-2 text-textMuted/70">Required columns: seller, buyer, amount, gst, director</p>
              </div>
            )}
          </div>
          
          <div className="w-full md:w-1/3 flex flex-col gap-3">
            {errorMSG && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center shrink-0">
                <AlertCircle className="mr-2 shrink-0" size={14} />
                {errorMSG}
              </div>
            )}
            <button 
              onClick={processData}
              disabled={!file || uploadStatus !== 'idle'}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center space-x-2 ${
                !file 
                  ? 'bg-surface text-textMuted cursor-not-allowed border border-white/10' 
                  : uploadStatus === 'done' ? 'bg-green-600/20 text-green-400 border border-green-500/30' 
                  : 'bg-primary text-white neo-glow hover:bg-blue-600'
              }`}
            >
              {uploadStatus === 'idle' && <span>Start Processing Pipeline</span>}
              {uploadStatus !== 'idle' && uploadStatus !== 'done' && <Loader2 className="animate-spin" size={18} />}
              {uploadStatus === 'uploading' && <span>Uploading...</span>}
              {uploadStatus === 'building' && <span>Building Graph...</span>}
              {uploadStatus === 'detecting' && <span>Detecting Fraud...</span>}
              {uploadStatus === 'done' && (
                <>
                  <CheckCircle size={18} />
                  <span>Knowledge Graph Built Successfully</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="animate-pulse-slow text-primary text-xl font-bold flex items-center">
            <Activity className="animate-spin mr-3" /> Processing Risk Matrices...
          </div>
        </div>
      )}

      {!loading && (!data || !data.alerts) && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] glass-panel p-8">
          <AlertTriangle size={48} className="text-yellow-500 mb-4" />
          <h2 className="text-xl font-bold text-white">No Threat Intelligence Available</h2>
          <p className="text-textMuted text-sm mt-2 max-w-md text-center">
            Upload a transaction dataset via the panel above to initialize the NeoTrace detection engine and populate the dashboard.
          </p>
        </div>
      )}

      {/* Main Dashboard Content */}
      {!loading && data && data.alerts && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-2">
            <div className="glass-panel p-6 flex flex-col justify-center border-l-4 border-l-red-500">
              <div className="text-textMuted text-xs font-semibold uppercase tracking-wider mb-2 flex items-center">
                <ShieldAlert size={14} className="mr-2 text-red-500" /> High Risk Entities
              </div>
              <div className="text-3xl font-extrabold text-white">{data.suspicious_companies.filter(c => c.risk > 60).length}</div>
            </div>
            
            <div className="glass-panel p-6 flex flex-col justify-center border-l-4 border-l-primary">
              <div className="text-textMuted text-xs font-semibold uppercase tracking-wider mb-2 flex items-center">
                <Users size={14} className="mr-2 text-primary" /> Total Monitored
              </div>
              <div className="text-3xl font-extrabold text-white">{data.suspicious_companies.length}</div>
            </div>

            <div className="glass-panel p-6 flex flex-col justify-center border-l-4 border-l-yellow-500">
              <div className="text-textMuted text-xs font-semibold uppercase tracking-wider mb-2 flex items-center">
                <Activity size={14} className="mr-2 text-yellow-500" /> Detected Incidents
              </div>
              <div className="text-3xl font-extrabold text-white">{data.alerts.length}</div>
            </div>

            <div className="glass-panel p-6 flex flex-col justify-center border-l-4 border-l-orange-500">
              <div className="text-textMuted text-xs font-semibold uppercase tracking-wider mb-2 flex items-center">
                <Activity size={14} className="mr-2 text-orange-500" /> Fraud Networks
              </div>
              <div className="text-3xl font-extrabold text-white">{data.alerts.filter(a => a.fraud_type.includes('Circular') || a.fraud_type.includes('Shared')).length}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="glass-panel p-6 lg:col-span-2">
              <h3 className="text-lg font-bold mb-6 text-white">Top Risk Entities</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.suspicious_companies.slice(0, 15)} margin={{ left: -20, bottom: 20 }}>
                    <XAxis dataKey="company" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#12121a', border: '1px solid #334155', borderRadius: '8px' }}
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    />
                    <Bar dataKey="risk" radius={[4, 4, 0, 0]}>
                      {data.suspicious_companies.slice(0, 15).map((entry, index) => {
                        let fill = '#22c55e';
                        if (entry.risk > 80) fill = '#ef4444';
                        else if (entry.risk > 60) fill = '#f97316';
                        else if (entry.risk > 30) fill = '#eab308';
                        return <Cell key={`cell-${index}`} fill={fill} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel p-6 flex flex-col">
              <h3 className="text-lg font-bold mb-2 text-white">Risk Distribution</h3>
              <div className="flex-1 flex items-center justify-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Critical', value: data.suspicious_companies.filter(c => c.risk > 80).length, fill: '#ef4444' },
                        { name: 'High', value: data.suspicious_companies.filter(c => c.risk > 60 && c.risk <= 80).length, fill: '#f97316' },
                        { name: 'Medium', value: data.suspicious_companies.filter(c => c.risk > 30 && c.risk <= 60).length, fill: '#eab308' },
                        { name: 'Normal', value: data.suspicious_companies.filter(c => c.risk <= 30).length, fill: '#22c55e' }
                      ].filter(d => d.value > 0)}
                      cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value"
                    >
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#12121a', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} itemStyle={{color: '#fff'}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-3 text-xs mt-2">
                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-1" /> Critical</span>
                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-orange-500 mr-1" /> High</span>
                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-yellow-500 mr-1" /> Med</span>
                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-1" /> Low</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="glass-panel p-6">
              <h3 className="text-lg font-bold text-white mb-4">Risk Matrix Heatmap</h3>
              <p className="text-xs text-textMuted mb-4">Correlation between entities and detected fraud flags.</p>
              <div className="overflow-x-auto">
                 <table className="w-full text-xs text-left">
                    <thead>
                      <tr>
                        <th className="p-2 border-b border-white/10 text-white">Entity</th>
                        <th className="p-2 border-b border-white/10 text-center">Circ. Trading</th>
                        <th className="p-2 border-b border-white/10 text-center">Shared Dir.</th>
                        <th className="p-2 border-b border-white/10 text-center">High Vol.</th>
                        <th className="p-2 border-b border-white/10 text-center">Excess ITC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.suspicious_companies.slice(0, 6).map((comp, idx) => {
                        const hasCT = data.alerts.some(a => a.details.includes(comp.company) && a.fraud_type.includes('Circular'));
                        const hasSD = data.alerts.some(a => a.details.includes(comp.company) && a.fraud_type.includes('Shared'));
                        const hasHV = data.alerts.some(a => a.details.includes(comp.company) && a.fraud_type.includes('High Volume'));
                        const hasITC = data.alerts.some(a => a.details.includes(comp.company) && a.fraud_type.includes('ITC'));
                        
                        const renderCell = (active, intense) => (
                          <td className="p-1">
                            <div className={`w-full h-8 rounded ${active ? (intense ? 'bg-red-500/80' : 'bg-orange-500/80') : 'bg-surface/50 border border-white/5'} transition-colors`} />
                          </td>
                        );

                        return (
                          <tr key={idx}>
                            <td className="p-2 font-mono font-bold text-gray-300 border-b border-white/5">{comp.company}</td>
                            {renderCell(hasCT, true)}
                            {renderCell(hasSD, false)}
                            {renderCell(hasHV || comp.risk > 70, comp.risk > 80)}
                            {renderCell(hasITC || comp.risk > 50, comp.risk > 90)}
                          </tr>
                        );
                      })}
                    </tbody>
                 </table>
              </div>
            </div>

            <div className="glass-panel p-0 overflow-hidden flex flex-col h-[400px]">
              <div className="p-4 border-b border-white/10 bg-surface/50">
                <h3 className="text-lg font-bold text-white flex items-center">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-3" />
                  Live Detection Stream
                </h3>
              </div>
              <div className="overflow-y-auto flex-1 p-4 space-y-3">
                {data.alerts.map((alert, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={i} 
                    className="p-3 rounded-lg bg-surface border border-white/5 flex items-start space-x-3 hover:border-red-500/50 transition-colors"
                  >
                    <div className={`p-2 rounded-full shrink-0 ${alert.risk_level === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      <AlertTriangle size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{alert.fraud_type}</h4>
                      <p className="text-xs text-textMuted mt-1 leading-relaxed">{alert.details}</p>
                    </div>
                  </motion.div>
                ))}
                {data.alerts.length === 0 && <p className="text-textMuted text-sm p-4">No anomalies detected.</p>}
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 mt-6">
            <h3 className="text-lg font-bold text-white mb-4">AI Predictive Analysis (Future Fraud Forecast)</h3>
            <p className="text-xs text-textMuted mb-4">Entities with highest forecasted probability of engaging in fraudulent activities based on ML scoring.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.alerts
                .filter(a => a.fraud_type.includes('Prediction') || a.fraud_type.includes('Anomaly'))
                .slice(0, 3)
                .map((alert, i) => (
                  <div key={i} className="bg-surface/50 p-4 border border-white/10 rounded-lg hover:border-blue-500/50 transition-colors">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-white text-lg">{alert.entities?.[0] || 'Unknown'}</span>
                      <span className="text-xs font-mono font-bold bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                        {alert.fraud_type.includes('Prediction') ? 'FORECAST' : 'ANOMALY'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{alert.details}</p>
                  </div>
              ))}
              {data.alerts.filter(a => a.fraud_type.includes('Prediction') || a.fraud_type.includes('Anomaly')).length === 0 && (
                <div className="text-sm text-textMuted col-span-3 py-4 text-center">No high-probability future anomalies detected in the current pattern set.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

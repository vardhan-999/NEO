import { Download, FileText, AlertTriangle, Shield, Activity } from 'lucide-react';

export default function FraudReportExport({ data, anomalyData }) {
  const date = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const dateStamp = new Date().toISOString().slice(0, 10);

  const handlePrint = () => {
    // Set document title to control print filename
    const prev = document.title;
    document.title = `Fraud_Report_${dateStamp}`;
    window.print();
    document.title = prev;
  };

  if (!data) return null;

  const highRisk = (data.suspicious_companies || []).filter(c => c.risk >= 60).length;
  const totalAlerts = (data.alerts || []).length;
  const fraudTypes = [...new Set((data.alerts || []).map(a => a.fraud_type))];

  return (
    <>
      {/* Print trigger button */}
      <button
        onClick={handlePrint}
        className="flex items-center space-x-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/40 text-green-400 rounded-xl transition-all font-medium text-sm"
      >
        <Download size={16} />
        <span>Download Fraud Report</span>
      </button>

      {/* ── Print-only report section ─────────────────────────── */}
      <div id="fraud-report-printable" className="hidden print:block print:text-black print:bg-white p-8 font-sans">
        {/* Header */}
        <div className="text-center border-b-2 border-gray-800 pb-6 mb-6">
          <div className="text-3xl font-extrabold text-gray-900 mb-1">🛡 NeoTrace GST Fraud Intelligence Report</div>
          <div className="text-sm text-gray-500">Generated: {date} | Confidential — For Official Use Only</div>
        </div>

        {/* Executive Summary */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 border-l-4 border-red-600 pl-3 mb-4">Executive Summary</h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Alerts', value: totalAlerts, color: 'red' },
              { label: 'High Risk Entities', value: highRisk, color: 'orange' },
              { label: 'Fraud Types Detected', value: fraudTypes.length, color: 'purple' },
              { label: 'AI Anomalies', value: anomalyData?.summary?.total ?? 0, color: 'blue' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`border-2 border-${color}-400 rounded-lg p-4 text-center`}>
                <div className={`text-3xl font-extrabold text-${color}-600`}>{value}</div>
                <div className="text-sm text-gray-600 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Fraud Types Summary */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 border-l-4 border-orange-500 pl-3 mb-4">Detected Fraud Patterns</h2>
          <ul className="space-y-2">
            {fraudTypes.map(ft => {
              const count = data.alerts.filter(a => a.fraud_type === ft).length;
              return (
                <li key={ft} className="flex items-center justify-between border-b pb-1">
                  <span className="font-medium text-gray-700">⚠ {ft}</span>
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">{count} alert{count > 1 ? 's' : ''}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Suspicious Companies */}
        {data.suspicious_companies?.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 border-l-4 border-red-500 pl-3 mb-4">High-Risk Entity Register</h2>
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2 text-left">Entity / GSTIN</th>
                  <th className="border p-2 text-center">Risk Score</th>
                  <th className="border p-2 text-left">Status</th>
                  <th className="border p-2 text-left">Primary Reason</th>
                </tr>
              </thead>
              <tbody>
                {data.suspicious_companies.slice(0, 20).map((c, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border p-2 font-mono text-xs">{c.company}</td>
                    <td className="border p-2 text-center font-bold" style={{ color: c.risk >= 80 ? '#dc2626' : c.risk >= 60 ? '#ea580c' : c.risk >= 30 ? '#ca8a04' : '#16a34a' }}>
                      {c.risk}
                    </td>
                    <td className="border p-2 text-xs font-semibold" style={{ color: c.risk >= 80 ? '#dc2626' : c.risk >= 60 ? '#ea580c' : '#ca8a04' }}>
                      {c.risk >= 80 ? 'CRITICAL' : c.risk >= 60 ? 'HIGH' : 'MEDIUM'}
                    </td>
                    <td className="border p-2 text-xs text-gray-600">{c.reasons?.[0] || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* All Alerts */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 border-l-4 border-blue-500 pl-3 mb-4">Detailed Alert Log</h2>
          <table className="w-full border-collapse text-xs">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 text-left">Alert ID</th>
                <th className="border p-2 text-left">Type</th>
                <th className="border p-2 text-left">Details</th>
                <th className="border p-2 text-center">Risk</th>
              </tr>
            </thead>
            <tbody>
              {data.alerts.map((a, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border p-2 font-mono">{a.alert_id}</td>
                  <td className="border p-2 font-semibold">{a.fraud_type}</td>
                  <td className="border p-2">{a.details}</td>
                  <td className="border p-2 text-center font-bold" style={{ color: a.risk_level === 'High' ? '#dc2626' : '#ca8a04' }}>
                    {a.risk_level}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* AI Anomaly Section */}
        {anomalyData?.anomalies?.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-800 border-l-4 border-purple-500 pl-3 mb-4">AI Anomaly Detection Results</h2>
            <p className="text-xs text-gray-500 mb-3">Ensemble model: Isolation Forest + Local Outlier Factor + Random Forest</p>
            <table className="w-full border-collapse text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2 text-left">Seller</th>
                  <th className="border p-2 text-left">Buyer</th>
                  <th className="border p-2 text-right">Amount</th>
                  <th className="border p-2 text-center">Score</th>
                  <th className="border p-2 text-center">Risk</th>
                </tr>
              </thead>
              <tbody>
                {anomalyData.anomalies.slice(0, 15).map((a, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border p-2 font-mono">{a.seller}</td>
                    <td className="border p-2 font-mono">{a.buyer}</td>
                    <td className="border p-2 text-right">₹{(a.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="border p-2 text-center font-bold">{a.anomaly_score?.toFixed(3)}</td>
                    <td className="border p-2 text-center font-semibold" style={{ color: a.risk_level === 'High' ? '#dc2626' : '#ca8a04' }}>
                      {a.risk_level}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <footer className="mt-10 pt-4 border-t text-center text-xs text-gray-400">
          NeoTrace GST Fraud Intelligence Platform — Report generated {date}
        </footer>
      </div>
    </>
  );
}

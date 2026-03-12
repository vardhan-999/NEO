import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Activity, Users, ShieldAlert, UploadCloud, CheckCircle,
  AlertCircle, Loader2, Brain, Zap, FileText, XCircle, Eye, Download,
  ChevronDown, ChevronUp, Search
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RT, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import LiveFraudStream from '../components/LiveFraudStream';
import FraudReportExport from '../components/FraudReportExport';

const BASE = 'http://localhost:8000/api';
const FMT = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const fmtINR = (v) => FMT.format(v || 0);

// ── GSTIN validation (client-side mirror of backend) ─────────────────────────
const GSTIN_RE = /^([0-9]{2})[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
function isValidGSTIN(g) {
  if (!g) return false;
  return GSTIN_RE.test(g.trim().toUpperCase());
}

// ── Lightweight CSV parser ────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => !l.startsWith('#'));
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const rows = lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
  });
  return { headers, rows };
}

function detectRowStatus(row) {
  const errors = [];
  const warns = [];

  const sg = row.seller_gstin?.trim() ?? '';
  const bg = row.buyer_gstin?.trim() ?? '';
  if (sg && !isValidGSTIN(sg)) errors.push(`Invalid seller GSTIN: ${sg}`);
  if (bg && !isValidGSTIN(bg)) errors.push(`Invalid buyer GSTIN: ${bg}`);

  const iv = parseFloat(row.invoice_value || 0);
  const tv = parseFloat(row.taxable_value || 0);
  const cgst = parseFloat(row.cgst || 0);
  const sgst = parseFloat(row.sgst || 0);
  const igst = parseFloat(row.igst || 0);
  if (iv > 0 && tv > 0 && Math.abs(iv - (tv + cgst + sgst + igst)) > 1) {
    errors.push(`Tax mismatch: ₹${iv} ≠ ₹${(tv + cgst + sgst + igst).toFixed(0)}`);
  }

  const ss = (row.seller_state ?? '').trim().toUpperCase();
  const bs = (row.buyer_state ?? '').trim().toUpperCase();
  if (ss && bs && ss !== bs && (cgst > 0 || sgst > 0) && igst === 0) {
    warns.push(`Cross-state (${ss}→${bs}) should use IGST`);
  }
  if (ss && bs && ss === bs && igst > 0) {
    warns.push(`Intra-state (${ss}) should use CGST/SGST not IGST`);
  }

  return { errors, warns };
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'blue', icon: Icon }) {
  const colors = {
    blue: 'from-blue-600/20 to-blue-800/10 border-blue-500/30 text-blue-400',
    red: 'from-red-600/20 to-red-800/10 border-red-500/30 text-red-400',
    green: 'from-green-600/20 to-green-800/10 border-green-500/30 text-green-400',
    purple: 'from-purple-600/20 to-purple-800/10 border-purple-500/30 text-purple-400',
    orange: 'from-orange-600/20 to-orange-800/10 border-orange-500/30 text-orange-400',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-panel p-5 bg-gradient-to-br border ${colors[color]} flex items-center space-x-4`}
    >
      {Icon && <div className={`p-3 rounded-xl bg-current/10`}><Icon size={22} className={colors[color].match(/text-\S+/)[0]} /></div>}
      <div>
        <div className="text-2xl font-extrabold text-white">{value}</div>
        <div className="text-xs text-textMuted mt-0.5">{label}</div>
        {sub && <div className="text-xs text-textMuted/60 mt-0.5">{sub}</div>}
      </div>
    </motion.div>
  );
}

function ValidationBadge({ errors, warns }) {
  if (errors.length) return (
    <span title={errors.join('\n')} className="flex items-center text-xs text-red-400 font-semibold">
      <XCircle size={13} className="mr-1 shrink-0" /> Error
    </span>
  );
  if (warns.length) return (
    <span title={warns.join('\n')} className="flex items-center text-xs text-yellow-400 font-semibold">
      <AlertTriangle size={13} className="mr-1 shrink-0" /> Warning
    </span>
  );
  return (
    <span className="flex items-center text-xs text-green-400 font-semibold">
      <CheckCircle size={13} className="mr-1 shrink-0" /> Valid
    </span>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [anomalyData, setAnomalyData] = useState(null);
  const [anomalyLoading, setAnomalyLoading] = useState(false);

  // Upload states
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle|uploading|building|detecting|done
  const [errorMsg, setErrorMsg] = useState('');
  const [previewRows, setPreviewRows] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [validationSummary, setValidationSummary] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const fileInputRef = useRef(null);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchData = () => {
    setLoading(true);
    fetch(`${BASE}/detect-fraud`, { method: 'POST' })
      .then(r => r.json())
      .then(d => { setData(d?.alerts ? d : null); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const fetchAnomalies = () => {
    setAnomalyLoading(true);
    fetch(`${BASE}/anomaly-detect`, { method: 'POST' })
      .then(r => r.json())
      .then(d => { setAnomalyData(d); setAnomalyLoading(false); })
      .catch(() => setAnomalyLoading(false));
  };

  useEffect(() => { fetchData(); fetchAnomalies(); }, []);

  // ── Client-side CSV preview ────────────────────────────────────────────────
  const handleFilePick = useCallback((picked) => {
    if (!picked) return;
    setFile(picked);
    setErrorMsg('');
    setPreviewRows([]);
    setValidationSummary(null);
    setShowPreview(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      const { headers, rows } = parseCSV(e.target.result);
      setPreviewHeaders(headers);
      setPreviewRows(rows.slice(0, 10));
      setShowPreview(true);

      // Build client-side validation summary
      const allRows = rows;
      let errCount = 0, warnCount = 0, validCount = 0;
      const gstinErrors = [];
      const invoiceErrors = [];
      const invNums = new Map();
      const dupInvoices = [];

      allRows.forEach((row, i) => {
        const { errors, warns } = detectRowStatus(row);
        if (errors.length) { errCount++; gstinErrors.push(...errors.map(e => `Row ${i+1}: ${e}`)); }
        else if (warns.length) { warnCount++; invoiceErrors.push(...warns.map(w => `Row ${i+1}: ${w}`)); }
        else { validCount++; }

        const inv = (row.invoice_number || '').trim();
        if (inv) {
          if (invNums.has(inv)) dupInvoices.push(`Invoice '${inv}' appears in rows ${invNums.get(inv)} and ${i+1}`);
          else invNums.set(inv, i + 1);
        }
      });
      const isNewFmt = headers.includes('seller_gstin');
      setValidationSummary({
        total: allRows.length, valid: validCount, errors: errCount, warnings: warnCount,
        isNewFmt, gstinErrors: gstinErrors.slice(0, 20), invoiceErrors: invoiceErrors.slice(0, 20),
        dupInvoices: dupInvoices.slice(0, 10)
      });
    };
    reader.readAsText(picked);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith('.csv')) handleFilePick(f);
    else setErrorMsg('Please drop a .csv file');
  }, [handleFilePick]);

  // ── Upload pipeline ────────────────────────────────────────────────────────
  const processData = async () => {
    if (!file) return;
    try {
      setUploadStatus('uploading'); setErrorMsg('');
      const formData = new FormData();
      formData.append('file', file);

      let res = await fetch(`${BASE}/upload`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error((await res.json()).detail || await res.text());
      const uploadResult = await res.json();

      setUploadStatus('building');
      res = await fetch(`${BASE}/build-graph`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());

      setUploadStatus('detecting');
      res = await fetch(`${BASE}/detect-fraud`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());

      setUploadStatus('done');
      setTimeout(() => {
        setUploadStatus('idle'); setFile(null); setPreviewRows([]); setValidationSummary(null);
        fetchData(); fetchAnomalies();
      }, 2000);
    } catch (err) {
      setErrorMsg('Processing failed: ' + (err.message || 'Server error'));
      setUploadStatus('idle');
    }
  };

  const runSimulation = async () => {
    setUploadStatus('uploading'); setErrorMsg('');
    try {
      await fetch(`${BASE}/simulate`, { method: 'POST' });
      setUploadStatus('building');
      await fetch(`${BASE}/build-graph`, { method: 'POST' });
      setUploadStatus('detecting');
      await fetch(`${BASE}/detect-fraud`, { method: 'POST' });
      setUploadStatus('done');
      setTimeout(() => { setUploadStatus('idle'); fetchData(); fetchAnomalies(); }, 2000);
    } catch (err) {
      setErrorMsg('Simulation failed: ' + err.message);
      setUploadStatus('idle');
    }
  };

  const isProcessing = ['uploading', 'building', 'detecting'].includes(uploadStatus);
  const statusLabel = {
    uploading: 'Uploading & validating…',
    building: 'Building knowledge graph…',
    detecting: 'Running fraud detection…',
    done: '✓ Complete!'
  }[uploadStatus] || null;

  // ── Chart data ─────────────────────────────────────────────────────────────
  const fraudTypeChart = data ? Object.entries(
    data.alerts.reduce((acc, a) => { acc[a.fraud_type] = (acc[a.fraud_type] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8) : [];

  const riskPieData = data ? [
    { name: 'Critical (≥80)', value: data.suspicious_companies.filter(c => c.risk >= 80).length, fill: '#ef4444' },
    { name: 'High (60–79)', value: data.suspicious_companies.filter(c => c.risk >= 60 && c.risk < 80).length, fill: '#f97316' },
    { name: 'Medium (30–59)', value: data.suspicious_companies.filter(c => c.risk >= 30 && c.risk < 60).length, fill: '#eab308' },
    { name: 'Low (<30)', value: data.suspicious_companies.filter(c => c.risk < 30).length, fill: '#22c55e' },
  ].filter(d => d.value > 0) : [];

  const FRAUD_COLORS = {
    'Circular Trading': '#ef4444', 'Duplicate Invoice': '#f97316',
    'Tax Calculation Mismatch': '#f97316', 'Cross-State GST Abuse': '#eab308',
    'High Volume Transaction': '#eab308', 'Shared Director': '#a855f7',
    'AI Anomaly Detected': '#3b82f6', 'Future Fraud Prediction': '#6366f1',
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <ShieldAlert className="mr-3 text-primary" /> GST Fraud Intelligence Platform
          </h1>
          <p className="text-textMuted text-sm mt-1">Upload invoices · Validate GSTINs · Detect fraud networks · Export reports</p>
        </div>
        {data && <FraudReportExport data={data} anomalyData={anomalyData} />}
      </header>

      {/* ── Two-Column Layout ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* ── LEFT: Upload + Validate ──────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Drop zone */}
          <div className="glass-panel p-6">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center">
              <UploadCloud size={18} className="mr-2 text-primary" /> Upload Invoice Dataset
            </h2>

            {/* Format hint */}
            <div className="bg-black/30 rounded-lg p-3 mb-4 border border-white/8">
              <p className="text-xs text-textMuted font-semibold mb-1">Required columns (16-field GST format):</p>
              <p className="text-xs font-mono text-blue-400/80 leading-relaxed break-all">
                seller_gstin, buyer_gstin, invoice_number, invoice_date, invoice_value,
                taxable_value, cgst, sgst, igst, hsn_code, product_description,
                quantity, unit_price, seller_state, buyer_state, payment_status
              </p>
              <p className="text-xs text-textMuted mt-1.5">Legacy 5-column format (seller, buyer, amount, gst) also supported.</p>
            </div>

            {/* Drag & Drop area */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 cursor-pointer text-center transition-all ${
                isDragging ? 'border-primary bg-primary/10' : file ? 'border-green-500/50 bg-green-900/10' : 'border-white/15 hover:border-primary/50 hover:bg-white/3'
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
                onChange={(e) => handleFilePick(e.target.files?.[0])} />
              {file ? (
                <div className="flex flex-col items-center">
                  <FileText size={28} className="text-green-400 mb-2" />
                  <p className="text-white font-medium text-sm">{file.name}</p>
                  <p className="text-textMuted text-xs mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <UploadCloud size={28} className="text-textMuted mb-2" />
                  <p className="text-white text-sm font-medium">Drag & drop CSV here</p>
                  <p className="text-textMuted text-xs mt-1">or click to browse</p>
                </div>
              )}
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div className="flex items-start space-x-2 p-3 mt-3 bg-red-900/30 border border-red-500/40 rounded-lg text-red-400 text-xs">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Validation Summary */}
            {validationSummary && (
              <div className="mt-4 space-y-2">
                <div className={`flex items-center space-x-2 p-3 rounded-lg border text-xs ${
                  validationSummary.errors > 0
                    ? 'bg-red-900/20 border-red-500/30 text-red-300'
                    : validationSummary.warnings > 0
                    ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300'
                    : 'bg-green-900/20 border-green-500/30 text-green-300'
                }`}>
                  {validationSummary.errors > 0 ? <XCircle size={14} /> : validationSummary.warnings > 0 ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                  <span className="font-semibold">
                    {validationSummary.total} rows — ✓ {validationSummary.valid} valid,&nbsp;
                    ⚠ {validationSummary.warnings} warnings,&nbsp;
                    ✗ {validationSummary.errors} errors
                  </span>
                </div>

                {/* Inline error list */}
                {(validationSummary.gstinErrors.length > 0 || validationSummary.dupInvoices.length > 0) && (
                  <div className="bg-black/30 border border-white/8 rounded-lg p-3 space-y-1 max-h-36 overflow-y-auto">
                    {[...validationSummary.gstinErrors, ...validationSummary.dupInvoices]
                      .slice(0, showAllErrors ? 999 : 5)
                      .map((e, i) => (
                        <p key={i} className="text-xs text-red-400 flex items-start">
                          <span className="mr-1 text-red-600">✗</span> {e}
                        </p>
                      ))}
                    {(validationSummary.gstinErrors.length + validationSummary.dupInvoices.length) > 5 && (
                      <button onClick={() => setShowAllErrors(!showAllErrors)}
                        className="text-xs text-blue-400 hover:underline flex items-center mt-1">
                        {showAllErrors ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        <span className="ml-1">{showAllErrors ? 'Show less' : `Show all ${validationSummary.gstinErrors.length + validationSummary.dupInvoices.length} errors`}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Pipeline status */}
            {isProcessing && (
              <div className="flex items-center space-x-3 p-3 mt-4 bg-blue-900/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm">
                <Loader2 size={16} className="animate-spin shrink-0" />
                <span>{statusLabel}</span>
              </div>
            )}
            {uploadStatus === 'done' && (
              <div className="flex items-center space-x-2 p-3 mt-4 bg-green-900/20 border border-green-500/30 rounded-lg text-green-400 text-sm">
                <CheckCircle size={16} /><span>Processing complete! Refreshing results…</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={processData}
                disabled={!file || isProcessing}
                className="flex-1 flex items-center justify-center space-x-2 py-2.5 bg-primary hover:bg-blue-600 text-white font-bold rounded-xl text-sm neo-glow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <Activity size={15} />}
                <span>Start Processing</span>
              </button>
              <button
                onClick={runSimulation}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center space-x-2 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold rounded-xl text-sm transition-all disabled:opacity-40"
              >
                <Zap size={15} />
                <span>Run Simulation</span>
              </button>
            </div>
          </div>

          {/* Preview table */}
          {showPreview && previewRows.length > 0 && (
            <div className="glass-panel p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white text-sm flex items-center">
                  <Eye size={15} className="mr-2 text-primary" /> Preview (first {previewRows.length} rows)
                </h3>
                <button onClick={() => setShowPreview(!showPreview)} className="text-textMuted hover:text-white text-xs">
                  {showPreview ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-xs min-w-max">
                  <thead className="sticky top-0 bg-surface/90 backdrop-blur-sm">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-textMuted font-semibold uppercase tracking-wider">Status</th>
                      {previewHeaders.slice(0, 6).map(h => (
                        <th key={h} className="px-2 py-1.5 text-left text-textMuted font-semibold uppercase tracking-wider truncate max-w-[100px]">
                          {h}
                        </th>
                      ))}
                      {previewHeaders.length > 6 && (
                        <th className="px-2 py-1.5 text-textMuted">+{previewHeaders.length - 6} more</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {previewRows.map((row, i) => {
                      const { errors, warns } = detectRowStatus(row);
                      const rowClass = errors.length
                        ? 'bg-red-900/15 hover:bg-red-900/25'
                        : warns.length
                        ? 'bg-yellow-900/10 hover:bg-yellow-900/20'
                        : 'hover:bg-white/3';
                      return (
                        <tr key={i} className={`transition-colors ${rowClass}`}>
                          <td className="px-2 py-1.5">
                            <ValidationBadge errors={errors} warns={warns} />
                          </td>
                          {previewHeaders.slice(0, 6).map(h => (
                            <td key={h} className={`px-2 py-1.5 font-mono max-w-[120px] truncate ${
                              (h === 'seller_gstin' || h === 'buyer_gstin') && !isValidGSTIN(row[h])
                                ? 'text-red-400' : 'text-gray-300'
                            }`} title={row[h]}>
                              {row[h] || '—'}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Results ───────────────────────────────────────────────── */}
        <div className="xl:col-span-3 space-y-4">
          {loading && (
            <div className="glass-panel flex items-center justify-center py-24">
              <Loader2 className="animate-spin text-primary mr-3" size={28} />
              <span className="text-textMuted">Loading fraud analysis…</span>
            </div>
          )}

          {!loading && !data && (
            <div className="glass-panel p-12 flex flex-col items-center justify-center text-center">
              <ShieldAlert size={52} className="text-primary/30 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">No Dataset Loaded</h2>
              <p className="text-textMuted text-sm max-w-sm">Upload a GST invoice CSV or run the simulation to start fraud analysis.</p>
            </div>
          )}

          {!loading && data && (
            <AnimatePresence>
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

                {/* Stat cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label="Total Alerts" value={data.alerts.length} color="red" icon={AlertTriangle} />
                  <StatCard label="Suspicious Entities" value={data.suspicious_companies.length} color="orange" icon={Users} />
                  <StatCard label="High Risk (≥60)" value={data.suspicious_companies.filter(c => c.risk >= 60).length} color="red" icon={ShieldAlert} />
                  <StatCard label="Avg Risk Score" value={data.suspicious_companies.length ? Math.round(data.suspicious_companies.reduce((a,c)=>a+c.risk,0)/data.suspicious_companies.length) : 0} color="purple" icon={Activity} />
                </div>

                {/* Charts row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Fraud types bar chart */}
                  <div className="glass-panel p-4">
                    <h3 className="text-sm font-bold text-white mb-3">Fraud Types Breakdown</h3>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={fraudTypeChart} margin={{ left: -22, bottom: 28 }}>
                          <XAxis dataKey="name" stroke="#64748b" fontSize={8} angle={-35} textAnchor="end" />
                          <YAxis stroke="#64748b" fontSize={9} />
                          <RT contentStyle={{ backgroundColor: '#12121a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                          <Bar dataKey="value" radius={[4,4,0,0]}>
                            {fraudTypeChart.map((e, i) => (
                              <Cell key={i} fill={FRAUD_COLORS[e.name] || '#3b82f6'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Risk distribution pie */}
                  <div className="glass-panel p-4">
                    <h3 className="text-sm font-bold text-white mb-3">Risk Distribution</h3>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={riskPieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${value}`} labelLine />
                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                          <RT contentStyle={{ backgroundColor: '#12121a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Top suspicious companies */}
                <div className="glass-panel p-5">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                    <ShieldAlert size={17} className="mr-2 text-red-400" /> High Risk Entity Register
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-textMuted uppercase tracking-wider bg-black/30">
                          <th className="p-2.5 rounded-tl-lg">Entity / GSTIN</th>
                          <th className="p-2.5 text-center">Risk Score</th>
                          <th className="p-2.5 text-center">Status</th>
                          <th className="p-2.5 rounded-tr-lg">Top Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.suspicious_companies.slice(0, 12).map((c, i) => {
                          const level = c.risk >= 80 ? 'Critical' : c.risk >= 60 ? 'High' : c.risk >= 30 ? 'Medium' : 'Low';
                          const riskColor = {Critical:'text-red-400', High:'text-orange-400', Medium:'text-yellow-400', Low:'text-green-400'}[level];
                          return (
                            <tr key={i} className="hover:bg-white/4 transition-colors">
                              <td className="p-2.5 font-mono text-gray-300">{c.company}</td>
                              <td className="p-2.5 text-center">
                                <div className="inline-flex flex-col items-center">
                                  <span className={`font-extrabold text-base ${riskColor}`}>{c.risk}</span>
                                  <div className="w-16 bg-black/30 rounded-full h-1 mt-1">
                                    <div className={`h-1 rounded-full ${riskColor.replace('text','bg')}`} style={{width:`${c.risk}%`}}/>
                                  </div>
                                </div>
                              </td>
                              <td className="p-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${riskColor} bg-current/10`}>{level}</span>
                              </td>
                              <td className="p-2.5 text-gray-400 max-w-[220px] truncate" title={c.reasons?.[0]}>{c.reasons?.[0] || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Fraud Alerts Panel */}
                <div className="glass-panel p-5">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                    <AlertTriangle size={17} className="mr-2 text-yellow-400" /> Fraud Alerts
                    <span className="ml-2 text-xs text-textMuted font-normal">({data.alerts.length} detected)</span>
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {data.alerts.map((alert, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.5) }}
                        className={`p-3 rounded-lg border flex items-start space-x-3 text-xs ${
                          alert.risk_level === 'High' ? 'bg-red-900/20 border-red-500/30' : 'bg-yellow-900/10 border-yellow-500/20'
                        }`}
                      >
                        <div className={`p-1.5 rounded-full shrink-0 ${alert.risk_level === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          <AlertTriangle size={13} />
                        </div>
                        <div>
                          <div className="font-bold text-white mb-0.5">{alert.fraud_type}</div>
                          <div className="text-textMuted leading-relaxed">{alert.details}</div>
                        </div>
                        <span className={`ml-auto shrink-0 text-xs font-bold px-2 py-0.5 rounded ${alert.risk_level === 'High' ? 'bg-red-900/40 text-red-400' : 'bg-yellow-900/40 text-yellow-400'}`}>
                          {alert.risk_level}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ── AI Fraud Detection Panel ──────────────────────────────────────────── */}
      {data && (
        <div className="glass-panel p-6 border border-purple-500/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Brain className="mr-3 text-purple-400" size={22} /> AI Fraud Detection Panel
            </h2>
            <button onClick={fetchAnomalies} disabled={anomalyLoading}
              className="flex items-center space-x-2 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 rounded-lg text-xs font-medium transition-all">
              {anomalyLoading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
              <span>{anomalyLoading ? 'Analyzing…' : 'Re-run AI'}</span>
            </button>
          </div>

          {anomalyLoading && !anomalyData && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-purple-400" size={28} />
              <span className="ml-3 text-textMuted text-sm">Running Isolation Forest + LOF + Random Forest…</span>
            </div>
          )}

          {anomalyData?.anomalies && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-4 text-center">
                  <div className="text-3xl font-extrabold text-purple-300">{anomalyData.summary?.total ?? 0}</div>
                  <div className="text-xs text-textMuted mt-1">Anomalies Detected</div>
                </div>
                <div className="bg-red-900/20 border border-red-500/20 rounded-xl p-4 text-center">
                  <div className="text-3xl font-extrabold text-red-400">{anomalyData.summary?.high_risk ?? 0}</div>
                  <div className="text-xs text-textMuted mt-1">High Risk Transactions</div>
                </div>
                <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-xl p-4 text-center">
                  <div className="text-3xl font-extrabold text-yellow-400">{((anomalyData.summary?.avg_score ?? 0) * 100).toFixed(1)}%</div>
                  <div className="text-xs text-textMuted mt-1">Avg Anomaly Score</div>
                </div>
              </div>

              {anomalyData.anomalies.length === 0 ? (
                <p className="text-textMuted text-sm text-center py-4">{anomalyData.message || 'No anomalies detected.'}</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-3">Top Anomaly Scores</h3>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={anomalyData.anomalies.slice(0, 12)} margin={{ left: -22, bottom: 28 }}>
                          <XAxis dataKey="seller" stroke="#64748b" fontSize={8} angle={-35} textAnchor="end" />
                          <YAxis stroke="#64748b" fontSize={9} domain={[0, 1]} />
                          <RT contentStyle={{ backgroundColor: '#12121a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                            formatter={(v) => [v.toFixed(3), 'Score']} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                          <Bar dataKey="anomaly_score" radius={[4,4,0,0]}>
                            {anomalyData.anomalies.slice(0,12).map((e, i) => (
                              <Cell key={i} fill={e.anomaly_score > 0.7 ? '#ef4444' : e.anomaly_score > 0.4 ? '#f97316' : '#22c55e'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-3">⚠ Top AI Alerts</h3>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                      {anomalyData.anomalies.filter(a => a.risk_level !== 'Normal').slice(0, 6).map((a, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                          className={`p-3 rounded-lg border text-xs flex items-start space-x-3 ${a.risk_level === 'High' ? 'bg-red-900/20 border-red-500/30' : 'bg-yellow-900/10 border-yellow-500/20'}`}>
                          <AlertTriangle size={13} className="shrink-0 mt-0.5 text-red-400" />
                          <div>
                            <div className="font-bold text-white mb-0.5">{a.seller} → {a.buyer}</div>
                            <div className="text-textMuted">Score: <span className="font-mono text-red-300 font-bold">{a.anomaly_score?.toFixed(3)}</span> · {fmtINR(a.amount)}</div>
                            <div className="text-gray-400 mt-0.5">{a.reason}</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Live Fraud Stream ─────────────────────────────────────────────────── */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Matrix Heatmap */}
          <div className="glass-panel p-5">
            <h3 className="text-lg font-bold text-white mb-3">Risk Matrix Heatmap</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-textMuted uppercase tracking-wider">
                    <th className="p-2 text-left">Entity</th>
                    <th className="p-2 text-center">Circ. Trading</th>
                    <th className="p-2 text-center">Dup. Invoice</th>
                    <th className="p-2 text-center">Tax Mismatch</th>
                    <th className="p-2 text-center">High Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {data.suspicious_companies.slice(0, 8).map((comp, idx) => {
                    const has = (type) => data.alerts.some(a => a.fraud_type === type && a.entities?.includes(comp.company));
                    return (
                      <tr key={idx} className="border-t border-white/5">
                        <td className="p-2 font-mono text-gray-300 truncate max-w-[120px]" title={comp.company}>{comp.company}</td>
                        {[
                          has('Circular Trading'), has('Duplicate Invoice'),
                          has('Tax Calculation Mismatch'), has('High Volume Transaction'),
                        ].map((active, ci) => (
                          <td key={ci} className="p-1">
                            <div className={`w-full h-7 rounded ${active ? 'bg-red-500/70' : 'bg-surface/50 border border-white/5'} transition-colors`} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <LiveFraudStream />
        </div>
      )}
    </div>
  );
}

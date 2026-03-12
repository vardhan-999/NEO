import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Building2, User, AlertTriangle, Activity, Network,
  ArrowRight, ChevronRight, Download, Loader2, ZoomIn, ZoomOut,
  Maximize, RefreshCw, Link2, Shield, TrendingUp
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, Cell
} from 'recharts';

const BASE = 'http://localhost:8000/api';

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

// ── Cytoscape helpers ───────────────────────────────────────────────────────
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const ex = document.querySelector(`script[src="${src}"]`);
    if (ex) { ex.dataset.loaded === 'true' ? resolve() : ex.addEventListener('load', resolve); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => { s.dataset.loaded = 'true'; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
let cyReg = false;
async function loadCytoscape() {
  await loadScript('https://unpkg.com/cytoscape@3.30.4/dist/cytoscape.min.js');
  await loadScript('https://unpkg.com/layout-base@2.0.1/layout-base.js');
  await loadScript('https://unpkg.com/cose-base@2.2.0/cose-base.js');
  await loadScript('https://unpkg.com/cytoscape-cose-bilkent@4.1.0/cytoscape-cose-bilkent.js');
  if (!cyReg && window.cytoscape && window.cytoscapeCoseBilkent) {
    window.cytoscape.use(window.cytoscapeCoseBilkent);
    cyReg = true;
  }
  return window.cytoscape;
}

const LAYOUT = {
  name: 'cose-bilkent', animate: true, animationDuration: 800,
  randomize: true, nodeRepulsion: 4500, idealEdgeLength: 120, tile: true
};

// ── Risk Gauge ───────────────────────────────────────────────────────────────
function RiskGauge({ score, label = 'Risk Score' }) {
  let color = '#22c55e';
  if (score > 80) color = '#ef4444';
  else if (score > 60) color = '#f97316';
  else if (score > 30) color = '#eab308';
  const r = 38, c = 2 * Math.PI * r;
  const offset = ((100 - score) / 100) * (c / 2);
  return (
    <div className="flex flex-col items-center">
      <div className="text-xs text-textMuted mb-1">{label}</div>
      <div className="relative">
        <svg width="110" height="60" viewBox="0 0 90 50" className="overflow-visible">
          <path d="M 7 47 A 38 38 0 0 1 83 47" fill="none" stroke="#1f2937" strokeWidth="11" strokeLinecap="round" />
          <path d="M 7 47 A 38 38 0 0 1 83 47" fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"
            strokeDasharray={`${c / 2} ${c / 2}`} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-end justify-center pb-0.5">
          <span className="text-xl font-extrabold text-white">{score}</span>
        </div>
      </div>
    </div>
  );
}

// ── Anomaly Indicator ─────────────────────────────────────────────────────────
function AnomalyBadge({ score }) {
  const pct = Math.round(score * 100);
  let color = 'from-green-600/30 to-green-500/10 border-green-500/30 text-green-400';
  let label = 'Normal';
  if (score > 0.7) { color = 'from-red-600/30 to-red-500/10 border-red-500/40 text-red-400'; label = 'HIGH'; }
  else if (score > 0.4) { color = 'from-yellow-600/30 to-yellow-500/10 border-yellow-500/30 text-yellow-400'; label = 'MEDIUM'; }
  return (
    <div className={`rounded-xl p-4 bg-gradient-to-br border ${color} flex flex-col items-center`}>
      <div className="text-xs text-textMuted mb-1">AI Anomaly Score</div>
      <div className="text-3xl font-extrabold">{score.toFixed(2)}</div>
      <div className="text-xs font-bold tracking-widest mt-1">{label}</div>
      <div className="w-full bg-black/30 rounded-full h-1.5 mt-2">
        <div className="h-1.5 rounded-full bg-current transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Cytoscape Graph ────────────────────────────────────────────────────────────
function LocalGraph({ graphData, chainPath = [], onNodeClick }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !graphData) return;
    let cy = null;

    async function init() {
      try {
        const cytoscape = await loadCytoscape();
        const elements = [];
        const nodeIds = new Set();

        const colorMap = { red: '#ef4444', orange: '#f97316', green: '#22c55e', purple: '#a855f7' };
        const chainSet = new Set(chainPath);

        graphData.nodes.forEach(n => {
          nodeIds.add(n.id);
          const col = colorMap[n.color] || (n.group === 'Director' ? '#a855f7' : '#22c55e');
          const isPrimary = chainSet.has(n.id);
          elements.push({
            data: {
              id: n.id,
              label: n.id.length > 14 ? n.id.slice(0, 14) + '…' : n.id,
              color: col,
              borderColor: isPrimary ? '#fff' : col + '80',
              aiScore: n.ai_score || 0
            },
            classes: isPrimary ? 'primary' : ''
          });
        });

        const chainEdges = new Set();
        for (let i = 0; i < chainPath.length - 1; i++) {
          chainEdges.add(`${chainPath[i]}->${chainPath[i + 1]}`);
        }

        graphData.links.forEach((e, i) => {
          if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) return;
          const isOwns = e.label === 'owns';
          const isChain = chainEdges.has(`${e.source}->${e.target}`);
          const isSuspicious = e.suspicious;
          elements.push({
            data: {
              id: `e_${i}`, source: e.source, target: e.target,
              color: isChain ? '#60a5fa' : isSuspicious ? '#ef4444' : isOwns ? 'rgba(168,85,247,0.5)' : 'rgba(59,130,246,0.4)',
              lineStyle: isOwns ? 'dashed' : 'solid',
              amount: e.amount || 0
            },
            classes: isChain ? 'chain' : isSuspicious ? 'suspect' : ''
          });
        });

        cy = cytoscape({
          container: containerRef.current,
          elements,
          style: [
            { selector: 'node', style: { 'background-color': 'data(color)', 'label': 'data(label)', 'color': '#e2e8f0', 'font-size': '9px', 'text-valign': 'bottom', 'text-halign': 'center', 'text-margin-y': 5, width: 24, height: 24, 'border-width': 2, 'border-color': 'data(borderColor)', 'text-outline-width': 2, 'text-outline-color': '#0a0a0f' } },
            { selector: 'node.primary', style: { width: 38, height: 38, 'border-width': 3, 'border-color': '#fff', 'font-size': '11px', 'font-weight': 'bold' } },
            { selector: 'edge', style: { width: 2, 'line-color': 'data(color)', 'target-arrow-color': 'data(color)', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier', 'line-style': 'data(lineStyle)', opacity: 0.65, 'arrow-scale': 0.8 } },
            { selector: 'edge.chain', style: { width: 3, 'line-color': '#60a5fa', 'target-arrow-color': '#60a5fa', opacity: 1 } },
            { selector: 'edge.suspect', style: { width: 3, 'line-color': '#ef4444', 'target-arrow-color': '#ef4444', opacity: 1, 'line-style': 'dashed' } },
          ],
          layout: LAYOUT, minZoom: 0.2, maxZoom: 5
        });

        cyRef.current = cy;

        cy.on('tap', 'node', (evt) => {
          const nodeId = evt.target.data('id');
          onNodeClick && onNodeClick(nodeId);
        });
      } catch (err) {
        console.error('Graph error:', err);
      }
    }

    init();
    return () => { if (cy) cy.destroy(); };
  }, [graphData, chainPath]);

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-3 right-3 z-10 flex space-x-1 bg-black/50 p-1 rounded-lg border border-white/10 backdrop-blur-sm">
        <button onClick={() => cyRef.current?.animate({ zoom: cyRef.current.zoom() * 1.3 })} className="p-1.5 text-textMuted hover:text-white"><ZoomIn size={14} /></button>
        <button onClick={() => cyRef.current?.animate({ zoom: cyRef.current.zoom() / 1.3 })} className="p-1.5 text-textMuted hover:text-white"><ZoomOut size={14} /></button>
        <button onClick={() => cyRef.current?.fit(undefined, 40)} className="p-1.5 text-textMuted hover:text-white"><Maximize size={14} /></button>
        <button onClick={() => cyRef.current?.layout(LAYOUT).run()} className="p-1.5 text-textMuted hover:text-white"><RefreshCw size={14} /></button>
      </div>
      <div ref={containerRef} className="w-full h-full rounded-xl" style={{ background: '#0a0a0f' }} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InvestigationLab() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [chainStart, setChainStart] = useState('');
  const [chainEnd, setChainEnd] = useState('');
  const [chainResult, setChainResult] = useState(null);
  const [chainLoading, setChainLoading] = useState(false);
  const [networkMap, setNetworkMap] = useState(null);
  const [netLoading, setNetLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // profile | network | chain
  const searchTimeout = useRef(null);

  // ── Search ──────────────────────────────────────────────────────────────────
  const handleSearch = (val) => {
    setQuery(val);
    clearTimeout(searchTimeout.current);
    if (!val || val.length < 2) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`${BASE}/lab/search?q=${encodeURIComponent(val)}`);
        const d = await res.json();
        setSearchResults(d.results || []);
      } catch (_) {}
      setSearchLoading(false);
    }, 350);
  };

  const selectEntity = async (entity) => {
    setSelected(entity);
    setQuery(entity.name);
    setSearchResults([]);
    setProfile(null);
    setChainResult(null);
    setProfileLoading(true);
    setActiveTab('profile');
    try {
      const res = await fetch(`${BASE}/lab/company/${encodeURIComponent(entity.name)}`);
      const d = await res.json();
      setProfile(d);
    } catch (_) {}
    setProfileLoading(false);
  };

  // ── Network Map ─────────────────────────────────────────────────────────────
  const loadNetworkMap = async () => {
    setNetLoading(true);
    try {
      const res = await fetch(`${BASE}/lab/network-map`);
      const d = await res.json();
      setNetworkMap(d);
    } catch (_) {}
    setNetLoading(false);
  };

  // ── Chain Trace ─────────────────────────────────────────────────────────────
  const traceChain = async () => {
    if (!chainStart.trim() || !chainEnd.trim()) return;
    setChainLoading(true);
    setChainResult(null);
    try {
      const res = await fetch(`${BASE}/lab/chain/${encodeURIComponent(chainStart.trim())}?end=${encodeURIComponent(chainEnd.trim())}`);
      const d = await res.json();
      setChainResult(d);
    } catch (_) {}
    setChainLoading(false);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'network' && !networkMap && !netLoading) loadNetworkMap();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 print:p-0">
      {/* Header */}
      <header className="mb-2">
        <h1 className="text-3xl font-bold text-white flex items-center mb-1">
          <Search className="mr-3 text-primary" /> Investigation Lab
        </h1>
        <p className="text-textMuted text-sm">Search entities, trace invoice chains, explore fraud networks</p>
      </header>

      {/* Search */}
      <div className="glass-panel p-6">
        <label className="text-sm font-semibold text-textMuted uppercase tracking-wider block mb-3">
          Search Company / GSTIN / Director
        </label>
        <div className="relative">
          <div className="flex items-center bg-black/40 border border-white/15 rounded-xl px-4 py-3 focus-within:border-primary/60 transition-colors">
            <Search size={18} className="text-textMuted mr-3 shrink-0" />
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="e.g. Company_A, GSTIN, Director Name…"
              className="bg-transparent flex-1 text-white placeholder-textMuted/60 focus:outline-none text-sm"
            />
            {searchLoading && <Loader2 size={16} className="animate-spin text-textMuted ml-2" />}
          </div>

          {/* Dropdown */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute top-full left-0 right-0 mt-1 glass-panel border border-white/15 rounded-xl overflow-hidden z-50 shadow-2xl"
              >
                {searchResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => selectEntity(r)}
                    className="w-full flex items-center px-4 py-3 hover:bg-white/8 transition-colors border-b border-white/5 last:border-0 text-left"
                  >
                    {r.type === 'Director'
                      ? <User size={16} className="text-purple-400 mr-3 shrink-0" />
                      : <Building2 size={16} className="text-blue-400 mr-3 shrink-0" />}
                    <div>
                      <div className="text-white font-medium text-sm">{r.name}</div>
                      {r.gstin && <div className="text-textMuted text-xs font-mono">{r.gstin}</div>}
                    </div>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded bg-surface border border-white/10 text-textMuted">
                      {r.type}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Investigation Panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Tab bar */}
            <div className="flex space-x-1 glass-panel p-1 rounded-xl w-fit">
              {[
                { id: 'profile', label: 'Company Profile', icon: Building2 },
                { id: 'network', label: 'Fraud Network', icon: Network },
                { id: 'chain', label: 'Invoice Chain', icon: Link2 },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleTabChange(id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === id
                      ? 'bg-primary/20 text-blue-400 neo-glow'
                      : 'text-textMuted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={15} /> <span>{label}</span>
                </button>
              ))}
            </div>

            {/* ── PROFILE TAB ────────────────────────────────────────────────── */}
            {activeTab === 'profile' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {profileLoading && (
                  <div className="lg:col-span-3 flex justify-center py-16">
                    <Loader2 className="animate-spin text-primary" size={32} />
                  </div>
                )}

                {!profileLoading && profile?.error && (
                  <div className="lg:col-span-3 glass-panel p-6 text-yellow-400 text-sm flex items-center">
                    <AlertTriangle size={18} className="mr-2" /> {profile.error}
                  </div>
                )}

                {!profileLoading && profile && !profile.error && (
                  <>
                    {/* Left: Profile + scores */}
                    <div className="space-y-4">
                      <div className="glass-panel p-6 border-l-4 border-l-primary">
                        <div className="flex items-center mb-4">
                          {profile.profile.type === 'Director'
                            ? <User className="text-purple-400 mr-2" size={20} />
                            : <Building2 className="text-primary mr-2" size={20} />}
                          <h2 className="font-bold text-white text-lg">{profile.profile.name}</h2>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-textMuted">Type</span>
                            <span className="text-white font-medium">{profile.profile.type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-textMuted">GSTIN</span>
                            <span className="text-white font-mono text-xs">{profile.profile.gstin}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-textMuted">Reg. Date</span>
                            <span className="text-white">{profile.profile.registration_date}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-textMuted">Transactions</span>
                            <span className="text-white font-bold">{profile.profile.transaction_count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-textMuted">Risk Level</span>
                            <span className={`font-bold ${
                              profile.profile.risk_level === 'Critical' ? 'text-red-400' :
                              profile.profile.risk_level === 'High' ? 'text-orange-400' :
                              profile.profile.risk_level === 'Medium' ? 'text-yellow-400' : 'text-green-400'
                            }`}>{profile.profile.risk_level}</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-2">
                          <RiskGauge score={profile.profile.risk_score} label="Rule Risk" />
                          <AnomalyBadge score={profile.profile.ai_anomaly_score || 0} />
                        </div>
                      </div>

                      {/* Risk reasons */}
                      {profile.profile.risk_reasons?.length > 0 && (
                        <div className="glass-panel p-4 border-l-4 border-l-red-500">
                          <h3 className="font-bold text-white text-sm mb-2 flex items-center">
                            <AlertTriangle size={14} className="mr-2 text-red-400" /> Fraud Indicators
                          </h3>
                          <ul className="space-y-1">
                            {profile.profile.risk_reasons.map((r, i) => (
                              <li key={i} className="text-xs text-gray-300 flex items-start">
                                <span className="text-red-400 mr-2 mt-0.5">•</span>{r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Directors */}
                      {profile.profile.directors?.length > 0 && (
                        <div className="glass-panel p-4">
                          <h3 className="font-bold text-white text-sm mb-2 flex items-center">
                            <User size={14} className="mr-2 text-purple-400" /> Associated Directors
                          </h3>
                          {profile.profile.directors.map((d, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                              <span className="text-sm text-gray-300">{d}</span>
                              <button
                                onClick={() => navigate(`/investigate/${encodeURIComponent(d)}`)}
                                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                Investigate <ChevronRight size={12} className="inline" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Report Button */}
                      <button
                        onClick={() => window.print()}
                        className="w-full flex items-center justify-center space-x-2 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-400 rounded-xl transition-all font-medium text-sm"
                      >
                        <Download size={16} /> <span>Generate Investigation Report</span>
                      </button>
                    </div>

                    {/* Right: Graph + Transactions */}
                    <div className="lg:col-span-2 space-y-4">
                      {/* Local Graph */}
                      <div className="glass-panel p-1 border border-primary/20" style={{ height: 380 }}>
                        <div className="absolute top-4 left-4 z-10 font-bold text-white flex items-center bg-black/50 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-md">
                          <Network size={14} className="mr-2 text-primary" /> Relationship Graph
                        </div>
                        <LocalGraph
                          graphData={profile.local_graph}
                          onNodeClick={(id) => navigate(`/investigate/${encodeURIComponent(id)}`)}
                        />
                      </div>

                      {/* Transactions */}
                      <div className="glass-panel p-5">
                        <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                          <Activity size={16} className="mr-2 text-green-400" /> Transaction History
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr className="text-textMuted uppercase tracking-wider bg-black/30">
                                <th className="p-2 rounded-tl-lg">Seller</th>
                                <th className="p-2">Buyer</th>
                                <th className="p-2 text-right">Amount</th>
                                <th className="p-2 text-right rounded-tr-lg">GST</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {profile.transactions.length === 0 && (
                                <tr><td colSpan={4} className="p-3 text-center text-textMuted">No transactions found.</td></tr>
                              )}
                              {profile.transactions.slice(0, 15).map((tx, i) => (
                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                  <td className={`p-2 font-mono ${tx.seller === selected.name ? 'text-white font-bold' : 'text-gray-400'}`}>{tx.seller}</td>
                                  <td className={`p-2 font-mono ${tx.buyer === selected.name ? 'text-white font-bold' : 'text-gray-400'}`}>{tx.buyer}</td>
                                  <td className="p-2 text-right text-gray-300">{formatCurrency(tx.amount)}</td>
                                  <td className="p-2 text-right text-gray-400">{formatCurrency(tx.gst)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── NETWORK TAB ─────────────────────────────────────────────────── */}
            {activeTab === 'network' && (
              <div className="glass-panel p-1 border border-primary/20" style={{ height: 550 }}>
                <div className="absolute top-4 left-4 z-10 font-bold text-white text-sm flex items-center bg-black/50 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-md">
                  <Network size={14} className="mr-2 text-primary" /> Fraud Network Map
                  {netLoading && <Loader2 size={12} className="animate-spin ml-2 text-textMuted" />}
                </div>
                {/* Legend */}
                <div className="absolute bottom-4 left-4 z-10 flex space-x-3 bg-black/60 px-3 py-2 rounded-lg border border-white/10 backdrop-blur-md text-xs">
                  {[['#ef4444','High Risk'],['#f97316','Medium'],['#22c55e','Normal'],['#a855f7','Director']].map(([col, lbl]) => (
                    <span key={lbl} className="flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: col }} />
                      <span className="text-gray-400">{lbl}</span>
                    </span>
                  ))}
                </div>
                {!networkMap && !netLoading && <div className="flex items-center justify-center h-full text-textMuted text-sm">Click the Network tab to load</div>}
                {netLoading && <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-primary" size={32} /></div>}
                {networkMap && (
                  <LocalGraph
                    graphData={networkMap}
                    onNodeClick={(id) => {
                      setQuery(id);
                      selectEntity({ id, name: id, type: 'Company' });
                      setActiveTab('profile');
                    }}
                  />
                )}
              </div>
            )}

            {/* ── CHAIN TAB ────────────────────────────────────────────────────── */}
            {activeTab === 'chain' && (
              <div className="space-y-6">
                <div className="glass-panel p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                    <Link2 size={18} className="mr-2 text-blue-400" /> Invoice Chain Tracer
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex-1">
                      <label className="text-xs text-textMuted mb-1 block">Start Company</label>
                      <input
                        value={chainStart}
                        onChange={(e) => setChainStart(e.target.value)}
                        placeholder="e.g. Company_A"
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/60 transition-colors"
                      />
                    </div>
                    <ArrowRight className="text-textMuted shrink-0 mb-2.5 hidden sm:block" size={18} />
                    <div className="flex-1">
                      <label className="text-xs text-textMuted mb-1 block">End Company</label>
                      <input
                        value={chainEnd}
                        onChange={(e) => setChainEnd(e.target.value)}
                        placeholder="e.g. Company_D"
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/60 transition-colors"
                      />
                    </div>
                    <button
                      onClick={traceChain}
                      disabled={chainLoading}
                      className="px-6 py-2.5 bg-primary hover:bg-blue-600 text-white font-bold rounded-xl text-sm neo-glow transition-all flex items-center space-x-2 disabled:opacity-60 shrink-0"
                    >
                      {chainLoading ? <Loader2 size={16} className="animate-spin" /> : <TrendingUp size={16} />}
                      <span>Trace Chain</span>
                    </button>
                  </div>

                  {/* Chain Result */}
                  <AnimatePresence>
                    {chainResult && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                        {chainResult.error ? (
                          <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center">
                            <AlertTriangle size={16} className="mr-2" /> {chainResult.error}
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center space-x-2 mb-4">
                              <Shield size={16} className="text-green-400" />
                              <span className="text-white font-bold">Path found — {chainResult.length - 1} hops</span>
                            </div>
                            {/* Path visualization */}
                            <div className="flex items-center flex-wrap gap-y-2 gap-x-1 glass-panel p-4 bg-black/30 mb-4">
                              {chainResult.path.map((node, i) => (
                                <span key={i} className="flex items-center">
                                  <span
                                    className="px-3 py-1.5 rounded-lg text-sm font-mono font-bold text-white bg-blue-500/20 border border-blue-500/40 cursor-pointer hover:bg-blue-500/30 transition"
                                    onClick={() => selectEntity({ id: node, name: node, type: 'Company' })}
                                  >
                                    {node}
                                  </span>
                                  {i < chainResult.path.length - 1 && (
                                    <ArrowRight size={16} className="text-blue-400 mx-1" />
                                  )}
                                </span>
                              ))}
                            </div>
                            {/* Edge amounts */}
                            {chainResult.edges?.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {chainResult.edges.map((e, i) => (
                                  <div key={i} className="bg-black/30 p-3 rounded-lg border border-white/8 text-xs">
                                    <div className="flex items-center space-x-1 text-blue-300 mb-1 font-mono">
                                      <span>{e.source}</span>
                                      <ArrowRight size={10} />
                                      <span>{e.target}</span>
                                    </div>
                                    <div className="text-gray-300">Amount: <span className="text-white font-bold">{formatCurrency(e.amount)}</span></div>
                                    <div className="text-gray-400">GST: {formatCurrency(e.gst)}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!selected && (
        <div className="glass-panel p-12 flex flex-col items-center justify-center text-center">
          <Shield size={52} className="text-primary/40 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Start Your Investigation</h2>
          <p className="text-textMuted text-sm max-w-sm">
            Search for a company, GSTIN, or director above to open a full investigation profile with AI anomaly scores, network graphs, and invoice chain tracing.
          </p>
        </div>
      )}
    </div>
  );
}

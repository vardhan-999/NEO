import React, { useState, useEffect, useRef, useCallback, Component } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Building2, Calendar, AlertTriangle, User, 
  Activity, FileText, Download, Network, RefreshCw, ZoomIn, ZoomOut, Maximize 
} from 'lucide-react';

// ─── CDN Script Loader ───
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') { resolve(); return; }
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => { s.dataset.loaded = 'true'; resolve(); };
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(s);
  });
}

let cytoscapeRegistered = false;
async function loadCytoscape() {
  await loadScript('https://unpkg.com/cytoscape@3.30.4/dist/cytoscape.min.js');
  await loadScript('https://unpkg.com/layout-base@2.0.1/layout-base.js');
  await loadScript('https://unpkg.com/cose-base@2.2.0/cose-base.js');
  await loadScript('https://unpkg.com/cytoscape-cose-bilkent@4.1.0/cytoscape-cose-bilkent.js');

  if (!cytoscapeRegistered && window.cytoscape && window.cytoscapeCoseBilkent) {
    window.cytoscape.use(window.cytoscapeCoseBilkent);
    cytoscapeRegistered = true;
  }
  return window.cytoscape;
}

const LAYOUT_OPTIONS = {
  name: 'cose-bilkent',
  animate: true,
  animationDuration: 1000,
  randomize: true,
  nodeRepulsion: 4500,
  idealEdgeLength: 100,
  edgeElasticity: 0.45,
  nodeDimensionsIncludeLabels: true,
  tile: true,
};

const CY_STYLESHEET = [
  {
    selector: 'node',
    style: {
      'background-color': 'data(color)',
      'label': 'data(label)',
      'color': '#e2e8f0',
      'font-size': '10px',
      'font-family': 'Inter, system-ui, sans-serif',
      'text-valign': 'bottom',
      'text-halign': 'center',
      'text-margin-y': 6,
      'width': 26,
      'height': 26,
      'border-width': 2,
      'border-color': 'data(borderColor)',
      'text-outline-width': 2,
      'text-outline-color': '#0a0a0f',
      'overlay-padding': 6,
    },
  },
  {
    selector: 'node.primary',
    style: {
      'width': 40,
      'height': 40,
      'border-width': 4,
      'border-color': '#fff',
      'font-size': '12px',
      'font-weight': 'bold'
    }
  },
  {
    selector: 'edge',
    style: {
      'width': 2,
      'line-color': 'data(color)',
      'target-arrow-color': 'data(color)',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'line-style': 'data(lineStyle)',
      'opacity': 0.6,
      'arrow-scale': 0.8,
    },
  },
  {
    selector: 'edge.cycle',
    style: {
      'width': 4,
      'line-color': '#ef4444',
      'target-arrow-color': '#ef4444',
      'opacity': 1,
      'line-style': 'dashed',
    }
  },
  { selector: '.faded', style: { 'opacity': 0.1 } },
];

const GaugeMeter = ({ score }) => {
  let color = '#22c55e'; // Green
  let text = 'Normal';
  if (score > 30 && score <= 60) { color = '#eab308'; text = 'Medium'; } // Yellow
  else if (score > 60 && score <= 80) { color = '#f97316'; text = 'High'; } // Orange
  else if (score > 80) { color = '#ef4444'; text = 'Critical'; } // Red

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${circumference / 2} ${circumference / 2}`;
  const strokeDashoffset = ((100 - score) / 100) * (circumference / 2);

  return (
    <div className="relative flex flex-col items-center mt-4">
      <svg width="120" height="65" viewBox="0 0 100 55" className="overflow-visible">
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#1f2937" strokeWidth="12" strokeLinecap="round" />
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" 
              strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} 
              style={{ transition: 'stroke-dashoffset 1s ease-in-out' }} />
      </svg>
      <div className="absolute bottom-0 flex flex-col items-center transform translate-y-2">
        <span className="text-2xl font-bold text-white leading-none">{score}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{color}}>{text}</span>
      </div>
    </div>
  );
};

export default function Investigation() {
  const { nodeId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState('');
  
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, data: null });

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      const isDirector = nodeId === 'John Doe' || nodeId === 'Jane Smith';
      setData({
        profile: {
          name: nodeId,
          type: isDirector ? 'Director' : 'Private Limited',
          gstin: isDirector ? 'N/A' : `27${nodeId.substring(0,4).toUpperCase()}1234A1Z5`,
          risk_score: isDirector ? 0 : (nodeId === 'MegaCorp' ? 85 : 70),
          ai_explanations: isDirector ? [] : [
            'Pattern matches known circular trading typologies.',
            'High transaction volume with recently incorporated entities.',
            'Mismatch in GSTR-2A vs GSTR-3B filings.'
          ]
        },
        alerts: isDirector ? [] : [
          { fraud_type: 'Circular Trading', details: 'Entity is part of a 3-hop trading loop designed to inflate turnover and claim fraudulent ITC.' }
        ],
        circular_paths: isDirector ? [] : [['MegaCorp', 'Subhas Traders', 'Ghost Shell Pvt Ltd']],
        transactions: isDirector ? [] : [
          { date: '2023-10-01', seller: 'MegaCorp', buyer: 'Subhas Traders', amount: 5000000, gst: 900000 },
          { date: '2023-10-05', seller: 'Subhas Traders', buyer: 'Ghost Shell Pvt Ltd', amount: 4800000, gst: 864000 },
          { date: '2023-10-12', seller: 'Ghost Shell Pvt Ltd', buyer: 'MegaCorp', amount: 4900000, gst: 882000 }
        ],
        director_relationships: isDirector 
          ? [{ director: nodeId, company: 'MegaCorp' }, { director: nodeId, company: 'Subhas Traders' }]
          : [{ director: 'John Doe', company: nodeId }],
        local_graph: {
          nodes: [
            { id: 'MegaCorp', group: 'Private Limited' },
            { id: 'Subhas Traders', group: 'Proprietorship' },
            { id: 'Ghost Shell Pvt Ltd', group: 'Private Limited' },
            { id: 'John Doe', group: 'Director' }
          ],
          links: [
            { source: 'MegaCorp', target: 'Subhas Traders', label: 'trades_with', amount: 5000000, gst: 900000 },
            { source: 'Subhas Traders', target: 'Ghost Shell Pvt Ltd', label: 'trades_with', amount: 4800000, gst: 864000 },
            { source: 'Ghost Shell Pvt Ltd', target: 'MegaCorp', label: 'trades_with', amount: 4900000, gst: 882000 },
            { source: 'John Doe', target: 'MegaCorp', label: 'owns' },
            { source: 'John Doe', target: 'Subhas Traders', label: 'owns' }
          ]
        }
      });
      setLoading(false);
    }, 500);
  }, [nodeId]);

  useEffect(() => {
    if (!containerRef.current || !data) return;

    let cy = null;
    let animationInterval = null;

    async function initGraph() {
      try {
        const cytoscape = await loadCytoscape();
        
        const elements = [];
        const nodeIds = new Set();
        
        // Build nodes
        data.local_graph.nodes.forEach(n => {
          let color = '#22c55e';
          let borderColor = 'rgba(34,197,94,0.4)';

          if (n.group === 'Director') {
            color = '#a855f7';
            borderColor = 'rgba(168,85,247,0.5)';
          } else {
            // Check if this node is in any top-level alerts (like high risk detection)
            // Simplified logic: High risk if involved in cycle or high ITC
            const isInCycle = data.circular_paths.some(cyc => cyc.includes(n.id));
            if (isInCycle) {
              color = '#ef4444';
              borderColor = 'rgba(239,68,68,0.6)';
            } else if (data.alerts.length > 0) {
                // Just fallback to orange if there's general alerts
                color = '#f59e0b';
                borderColor = 'rgba(245,158,11,0.5)';
            }
          }

          nodeIds.add(n.id);
          elements.push({
            data: { id: n.id, label: n.id, group: n.group, color, borderColor },
            classes: n.id === nodeId ? 'primary' : ''
          });
        });

        // Track cycles for edge coloring
        const cycleEdges = new Set();
        data.circular_paths.forEach(cycle => {
            for(let i=0; i<cycle.length; i++){
                cycleEdges.add(`${cycle[i]}->${cycle[(i+1)%cycle.length]}`);
            }
        });

        // Build edges
        data.local_graph.links.forEach((e, i) => {
          if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) return;
          const isOwnership = e.label === 'owns';
          const isCycle = cycleEdges.has(`${e.source}->${e.target}`);
          
          elements.push({
            data: {
              id: `edge_${i}`,
              source: e.source,
              target: e.target,
              label: e.label,
              amount: e.amount || 0,
              gst: e.gst || 0,
              color: isOwnership ? 'rgba(168,85,247,0.5)' : (isCycle ? '#ef4444' : 'rgba(59,130,246,0.5)'),
              lineStyle: isOwnership ? 'dashed' : 'solid',
            },
            classes: isCycle ? 'cycle' : ''
          });
        });

        cy = cytoscape({
          container: containerRef.current,
          elements,
          style: CY_STYLESHEET,
          layout: LAYOUT_OPTIONS,
          minZoom: 0.2, maxZoom: 5,
        });
        cyRef.current = cy;

        // --- Animations for circular path ---
        if (data.circular_paths.length > 0) {
            let offset = 0;
            animationInterval = setInterval(() => {
                offset -= 1;
                cy.edges('.cycle').style('line-dash-offset', offset);
            }, 50);
        }

        cy.on('mouseover', 'edge', (evt) => {
            const d = evt.target.data();
            if (d.label === 'trades_with') {
              setTooltip({ visible: true, x: evt.renderedPosition.x, y: evt.renderedPosition.y - 15, data: d });
            }
        });
        cy.on('mouseout', 'edge', () => setTooltip({ visible: false, x: 0, y: 0, data: null }));

      } catch (err) {
        console.error("Graph init error:", err);
      }
    }
    
    initGraph();

    return () => {
      if (animationInterval) clearInterval(animationInterval);
      if (cy) cy.destroy();
    };
  }, [data, nodeId]);

  const handlePrint = () => {
      window.print();
  };

  if (loading) return <div className="p-8 text-center text-primary mt-20 animate-pulse font-medium">Generating investigation dossier...</div>;
  if (error) return <div className="p-8 text-center text-red-400 mt-20"><AlertTriangle className="mx-auto mb-2" size={32}/> {error}</div>;
  if (!data) return null;

  const { profile, alerts, circular_paths, transactions, director_relationships } = data;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 print:p-0">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-white/10 print:hidden">
        <button onClick={() => navigate(-1)} className="flex items-center text-textMuted hover:text-white transition-colors">
          <ArrowLeft size={20} className="mr-2" /> Back to Alerts
        </button>
        <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg font-medium">
          <Download size={18} className="mr-2" /> Generate Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Profile & Explanations */}
        <div className="lg:col-span-1 space-y-6">
            
          {/* Profile Card */}
          <div className="glass-panel p-6 border-l-4 border-l-primary">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              {profile.type === 'Director' ? <User className="mr-2 text-purple-400" /> : <Building2 className="mr-2 text-primary" />} 
              {profile.type === 'Director' ? 'Director Profile' : 'Entity Profile'}
            </h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-textMuted">{profile.type === 'Director' ? 'Director Name' : 'Entity Name / ID'}</div>
                <div className="text-lg font-bold text-white">{profile.name}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-textMuted">Type</div>
                  <div className="text-white font-medium">{profile.type}</div>
                </div>
                {profile.type !== 'Director' ? (
                  <div>
                    <div className="text-sm text-textMuted">GSTIN Base</div>
                    <div className="text-white font-mono text-sm">{profile.gstin}</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm text-textMuted">Associated Entities</div>
                    <div className="text-white font-medium text-sm">{director_relationships.length}</div>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-col items-center">
                <div className="text-sm text-textMuted mb-2">Fraud Risk Score</div>
                <GaugeMeter score={profile.risk_score} />
              </div>
            </div>
          </div>

          {/* Alert Explanations */}
          <div className="glass-panel p-6 border-l-4 border-l-red-500">
             <h2 className="text-lg font-bold text-white mb-4 flex items-center">
              <AlertTriangle className="mr-2 text-red-500" /> AI Fraud Explanation
            </h2>
            {(!profile.ai_explanations || profile.ai_explanations.length === 0) && alerts.length === 0 ? (
                <div className="text-textMuted text-sm">No suspicious behavioral patterns detected for this entity.</div>
            ) : (
                <div className="space-y-3">
                    {profile.ai_explanations && profile.ai_explanations.length > 0 && (
                        <div className="bg-red-900/20 p-4 rounded-lg border border-red-500/30 mb-4">
                            <h3 className="text-red-400 font-bold text-sm mb-2">Automated Analysis</h3>
                            <ul className="list-disc leading-relaxed list-inside text-gray-300 text-sm space-y-1">
                                {profile.ai_explanations.map((exp, i) => (
                                    <li key={i}>{exp}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    {alerts.map((a, i) => (
                        <div key={i} className="bg-black/30 p-3 rounded-lg border border-red-500/20">
                            <div className="text-red-400 font-bold text-sm mb-1">{a.fraud_type}</div>
                            <div className="text-gray-300 text-xs">{a.details}</div>
                        </div>
                    ))}
                </div>
            )}

            
            {circular_paths.length > 0 && (
                <div className="mt-4 bg-red-900/20 p-3 rounded-lg border border-red-500/30">
                    <div className="text-red-400 font-bold text-sm mb-1 line-clamp-2">Circular Trading Loop Detected</div>
                    <div className="text-gray-300 text-xs font-mono break-words leading-relaxed">
                        {circular_paths[0].join(" → ")} → {circular_paths[0][0]}
                    </div>
                </div>
            )}
          </div>

          {/* Inspector Notes */}
          <div className="glass-panel p-6 print:hidden">
             <h2 className="text-lg font-bold text-white mb-4 flex items-center">
              <FileText className="mr-2 text-blue-400" /> Investigator Notes
            </h2>
            <textarea 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full h-32 bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-primary/50 resize-none"
                placeholder="Add observations, contact details, or follow-up actions here..."
            />
            <button className="w-full mt-3 py-2 bg-surface hover:bg-white/10 border border-white/10 rounded text-sm text-white font-medium transition-colors">
                Save Notes
            </button>
          </div>

        </div>

        {/* Right Column: Visualization & Data */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Graph Visualization */}
            <div className="glass-panel p-1 border border-primary/20 relative" style={{ height: '400px' }}>
                <div className="absolute top-4 left-4 z-10 font-bold text-white flex items-center bg-black/50 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-md">
                    <Network size={16} className="mr-2 text-primary" /> Relationship Graph
                </div>
                
                <div className="absolute top-4 right-4 z-10 flex space-x-2 bg-black/50 p-1 rounded-lg border border-white/10 backdrop-blur-md print:hidden">
                    <button onClick={() => cyRef.current?.animate({ zoom: cyRef.current.zoom() * 1.3 })} className="p-1.5 text-textMuted hover:text-white"><ZoomIn size={16}/></button>
                    <button onClick={() => cyRef.current?.animate({ zoom: cyRef.current.zoom() / 1.3 })} className="p-1.5 text-textMuted hover:text-white"><ZoomOut size={16}/></button>
                    <button onClick={() => cyRef.current?.animate({ fit: { padding: 50} })} className="p-1.5 text-textMuted hover:text-white"><Maximize size={16}/></button>
                    <div className="w-px bg-white/10 mx-1" />
                    <button onClick={() => cyRef.current?.layout(LAYOUT_OPTIONS).run()} className="p-1.5 text-textMuted hover:text-white"><RefreshCw size={16}/></button>
                </div>

                <div ref={containerRef} className="w-full h-full rounded-xl" style={{ background: '#0a0a0f' }} />

                {/* Tooltip */}
                {tooltip.visible && tooltip.data && (
                    <div className="absolute pointer-events-none z-50 print:hidden" style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}>
                        <div className="bg-surface/95 border border-white/10 backdrop-blur-md p-3 rounded-lg text-white text-xs shadow-xl">
                            <div className="font-bold border-b border-white/10 pb-1 mb-2 text-blue-400">Transaction</div>
                            <div className="flex justify-between gap-4 mb-1"><span className="text-textMuted">Amount</span> <span className="font-mono">{formatCurrency(tooltip.data.amount)}</span></div>
                            <div className="flex justify-between gap-4"><span className="text-textMuted">GST</span> <span className="font-mono text-red-400">{formatCurrency(tooltip.data.gst)}</span></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Transactions Timeline */}
            <div className="glass-panel p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                    <Activity className="mr-2 text-green-500" /> Transaction Timeline
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-black/40 text-textMuted text-xs uppercase tracking-wider">
                            <tr>
                                <th className="p-3 rounded-tl-lg">Date</th>
                                <th className="p-3">Seller</th>
                                <th className="p-3">Buyer</th>
                                <th className="p-3 text-right">Amount</th>
                                <th className="p-3 text-right border-l border-white/10">GST Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {transactions.length === 0 ? (
                                <tr><td colSpan="5" className="p-4 text-center text-textMuted italic">No transaction records found.</td></tr>
                            ) : (
                                transactions.map((tx, idx) => {
                                    // Highlight if seller or buyer is the inspected node
                                    const isSeller = tx.seller === profile.name;
                                    const highRisk = tx.gst > 1000000;
                                    
                                    return (
                                    <tr key={idx} className={`hover:bg-white/5 transition-colors ${highRisk ? 'bg-red-900/10' : ''}`}>
                                        <td className="p-3 text-gray-400">{tx.date}</td>
                                        <td className={`p-3 ${isSeller ? 'text-white font-bold' : 'text-gray-300'}`}>{tx.seller}</td>
                                        <td className={`p-3 ${!isSeller ? 'text-white font-bold' : 'text-gray-300'}`}>{tx.buyer}</td>
                                        <td className="p-3 text-right font-mono text-gray-300">{formatCurrency(tx.amount)}</td>
                                        <td className={`p-3 text-right border-l border-white/10 font-mono ${highRisk ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
                                            {formatCurrency(tx.gst)}
                                        </td>
                                    </tr>
                                )})
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Director Cross-linkages */}
            {director_relationships.length > 0 && (
                <div className="glass-panel p-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                        <User className="mr-2 text-purple-400" /> Associated Directors & Subsidiaries
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {director_relationships.map((rel, idx) => (
                            <div key={idx} className="bg-black/30 p-4 rounded-lg border border-purple-500/20 flex flex-col justify-between">
                                <div>
                                    <div className="text-xs text-textMuted mb-1">Director</div>
                                    <div className="text-white font-medium mb-3">{rel.director}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-textMuted mb-1">Controls Entity</div>
                                    <div className="text-white font-medium">{rel.company}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
}

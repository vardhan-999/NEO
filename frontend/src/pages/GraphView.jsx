import React, { useState, useEffect, useCallback, useRef, Component } from 'react';
import { Network, ZoomIn, ZoomOut, Maximize, AlertTriangle, RefreshCw } from 'lucide-react';

// ─── Error Boundary ───
class GraphErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('GraphView crashed:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <AlertTriangle size={48} className="text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Graph Renderer Crashed</h2>
          <p className="text-textMuted mb-4">{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); }}
            className="px-4 py-2 bg-primary/20 border border-primary/40 text-primary rounded-lg hover:bg-primary/30 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} /> Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── CDN Script Loader ───
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      // If script tag exists, check if it's loaded
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

// ─── Layout Config ───
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
  { selector: '.faded', style: { 'opacity': 0.08 } },
  {
    selector: 'node.highlight',
    style: { 'border-width': 3, 'border-color': '#fff', 'z-index': 100 },
  },
  {
    selector: 'edge.highlight',
    style: { 'width': 3, 'opacity': 1, 'z-index': 100 },
  },
];

// ─── Main Component ───
function GraphViewInner() {
  const [graphData, setGraphData] = useState(null); // { nodes: [], links: [] }
  const [riskMap, setRiskMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [empty, setEmpty] = useState(false);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, data: null });
  const [selectedNode, setSelectedNode] = useState(null);
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const initRef = useRef(false); // prevent double init

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  // ─── Phase 1: Fetch data ───
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [graphRes, fraudRes] = await Promise.all([
          fetch('http://localhost:8000/api/graph-data').then(r => r.json()),
          fetch('http://localhost:8000/api/detect-fraud', { method: 'POST' }).then(r => r.json()),
        ]);

        if (cancelled) return;

        // Validate graph data
        if (!graphRes || !graphRes.nodes || graphRes.nodes.length === 0) {
          setEmpty(true);
          setLoading(false);
          return;
        }

        // Build risk map
        const rm = {};
        if (fraudRes?.suspicious_companies) {
          fraudRes.suspicious_companies.forEach(c => { rm[c.company] = c.risk; });
        }

        setRiskMap(rm);
        setGraphData(graphRes);
      } catch (err) {
        if (!cancelled) {
          console.error('Fetch error:', err);
          setError(err.message);
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  // ─── Phase 2: Init Cytoscape ONLY when container + data are both ready ───
  useEffect(() => {
    // Guard: need container, need data, only init once
    if (!containerRef.current) return;
    if (!graphData) return;
    if (initRef.current) return;
    initRef.current = true;

    let cy = null;

    async function initGraph() {
      try {
        const cytoscape = await loadCytoscape();

        // Double-check container still exists after async load
        if (!containerRef.current) {
          console.warn('Container unmounted before Cytoscape could initialize');
          setError('Graph container was removed. Please reload the page.');
          setLoading(false);
          return;
        }

        // ─── Build elements ───
        const elements = [];
        const nodeIds = new Set();

        graphData.nodes.forEach(n => {
          let color = '#22c55e';
          let riskScore = 0;
          let borderColor = 'rgba(255,255,255,0.2)';

          if (n.group === 'Director') {
            color = '#a855f7';
            borderColor = 'rgba(168,85,247,0.5)';
          } else {
            riskScore = riskMap[n.id] || 0;
            if (riskScore >= 50) {
              color = '#ef4444';
              borderColor = 'rgba(239,68,68,0.6)';
            } else if (riskScore > 0) {
              color = '#f59e0b';
              borderColor = 'rgba(245,158,11,0.5)';
            } else {
              borderColor = 'rgba(34,197,94,0.4)';
            }
          }

          nodeIds.add(n.id);
          elements.push({
            data: { id: n.id, label: n.id, group: n.group, color, borderColor, riskScore },
          });
        });

        // Only add edges whose source AND target exist as nodes
        (graphData.links || []).forEach((e, i) => {
          if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) return; // Skip orphaned edges
          const isOwnership = e.label === 'owns';
          elements.push({
            data: {
              id: `edge_${i}`,
              source: e.source,
              target: e.target,
              label: e.label,
              amount: e.amount || 0,
              gst: e.gst || 0,
              color: isOwnership ? 'rgba(168,85,247,0.5)' : 'rgba(59,130,246,0.5)',
              lineStyle: isOwnership ? 'dashed' : 'solid',
            },
          });
        });

        if (elements.length === 0) {
          setEmpty(true);
          setLoading(false);
          return;
        }

        // ─── Create Cytoscape ───
        cy = cytoscape({
          container: containerRef.current,
          elements,
          style: CY_STYLESHEET,
          layout: LAYOUT_OPTIONS,
          minZoom: 0.2,
          maxZoom: 5,
          wheelSensitivity: 0.3,
        });

        cyRef.current = cy;

        // Edge hover → tooltip
        cy.on('mouseover', 'edge', (evt) => {
          const d = evt.target.data();
          if (d.label === 'trades_with') {
            const pos = evt.renderedPosition;
            setTooltip({ visible: true, x: pos.x, y: pos.y - 15, data: d });
          }
        });
        cy.on('mouseout', 'edge', () => {
          setTooltip({ visible: false, x: 0, y: 0, data: null });
        });

        // Node click → highlight neighborhood
        cy.on('tap', 'node', (evt) => {
          const node = evt.target;
          cy.elements().removeClass('highlight').addClass('faded');
          node.removeClass('faded').addClass('highlight');
          node.neighborhood().removeClass('faded').addClass('highlight');
          setSelectedNode({
            id: node.data('id'),
            group: node.data('group'),
            riskScore: node.data('riskScore'),
          });
        });

        // Background click → reset
        cy.on('tap', (evt) => {
          if (evt.target === cy) {
            cy.elements().removeClass('faded highlight');
            setSelectedNode(null);
          }
        });

        setLoading(false);
      } catch (err) {
        console.error('Graph init error:', err);
        setError(err.message);
        setLoading(false);
      }
    }

    initGraph();

    return () => {
      if (cy) {
        cy.destroy();
        cy = null;
      }
      cyRef.current = null;
      initRef.current = false;
    };
  }, [graphData, riskMap]);

  // ─── Controls ───
  const handleZoomIn = useCallback(() => {
    if (cyRef.current) cyRef.current.animate({ zoom: cyRef.current.zoom() * 1.3 }, { duration: 300 });
  }, []);

  const handleZoomOut = useCallback(() => {
    if (cyRef.current) cyRef.current.animate({ zoom: cyRef.current.zoom() / 1.3 }, { duration: 300 });
  }, []);

  const handleFit = useCallback(() => {
    if (cyRef.current) cyRef.current.animate({ fit: { padding: 50 } }, { duration: 400 });
  }, []);

  const handleResetLayout = useCallback(() => {
    if (cyRef.current) {
      cyRef.current.elements().removeClass('faded highlight');
      setSelectedNode(null);
      cyRef.current.layout(LAYOUT_OPTIONS).run();
    }
  }, []);

  // ─── Error State ───
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <AlertTriangle size={48} className="text-red-500 mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">Graph Load Error</h2>
      <p className="text-textMuted mt-2 max-w-md">{error}</p>
    </div>
  );

  // ─── Empty State ───
  if (empty) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Network size={48} className="text-textMuted mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">No Graph Data Available</h2>
      <p className="text-textMuted mt-2">Please upload a GST dataset and run the processing pipeline first.</p>
    </div>
  );

  // ─── Render ───
  return (
    <div className="flex flex-col h-[85vh] -m-6 p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between z-10">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Network className="mr-3 text-blue-500" /> Network Investigation
          </h2>
          <p className="text-textMuted text-sm mt-1">Interactive topology of entities and transaction flows</p>
        </div>
        <div className="flex space-x-2 bg-surface/80 p-1 rounded-lg border border-white/10 backdrop-blur-md">
          <button onClick={handleZoomIn} title="Zoom In" className="p-2 hover:bg-white/10 rounded text-textMuted hover:text-white transition-colors">
            <ZoomIn size={18} />
          </button>
          <button onClick={handleZoomOut} title="Zoom Out" className="p-2 hover:bg-white/10 rounded text-textMuted hover:text-white transition-colors">
            <ZoomOut size={18} />
          </button>
          <button onClick={handleFit} title="Fit to Screen" className="p-2 hover:bg-white/10 rounded text-textMuted hover:text-white transition-colors">
            <Maximize size={18} />
          </button>
          <div className="w-px bg-white/10 mx-1" />
          <button onClick={handleResetLayout} title="Reset Layout" className="px-3 py-1.5 text-xs hover:bg-white/10 rounded text-textMuted hover:text-white transition-colors font-medium flex items-center gap-1">
            <RefreshCw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Graph Container */}
      <div className="flex-1 rounded-2xl overflow-hidden glass-panel neo-glow border border-primary/20 relative" style={{ background: '#0a0a0f' }}>

        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
            <div className="text-primary text-lg font-semibold">Loading Knowledge Graph...</div>
          </div>
        )}

        {/* Cytoscape mounts here — always rendered so ref is never null */}
        <div
          ref={containerRef}
          id="cy-graph-container"
          style={{ width: '100%', height: '100%', minHeight: '600px' }}
        />

        {/* Tooltip */}
        {tooltip.visible && tooltip.data && (
          <div
            className="absolute pointer-events-none z-50"
            style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
          >
            <div style={{
              background: 'rgba(18,18,26,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(8px)',
              padding: '12px',
              borderRadius: '8px',
              color: 'white',
              fontSize: '13px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              marginTop: '-10px',
              minWidth: '180px',
            }}>
              <div style={{ fontWeight: 700, marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={14} /> Transaction Details
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#94a3b8' }}>Amount:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(tooltip.data.amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>GST:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#ef4444' }}>{formatCurrency(tooltip.data.gst)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Selected Node Info */}
        {selectedNode && (
          <div className="absolute top-6 right-6 glass-panel px-5 py-4 text-sm border-white/10 z-10" style={{ minWidth: '200px' }}>
            <div className="font-bold text-white mb-3 text-base flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                selectedNode.group === 'Director' ? 'bg-purple-500' :
                selectedNode.riskScore >= 50 ? 'bg-red-500' :
                selectedNode.riskScore > 0 ? 'bg-orange-500' : 'bg-green-500'
              }`} />
              {selectedNode.id}
            </div>
            <div className="space-y-1.5 text-textMuted">
              <div className="flex justify-between">
                <span>Type:</span>
                <span className="text-white font-medium">{selectedNode.group}</span>
              </div>
              {selectedNode.group !== 'Director' && (
                <div className="flex justify-between">
                  <span>Risk Score:</span>
                  <span className={`font-bold ${
                    selectedNode.riskScore >= 50 ? 'text-red-400' :
                    selectedNode.riskScore > 0 ? 'text-yellow-400' : 'text-green-400'
                  }`}>{selectedNode.riskScore}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-6 left-6 glass-panel px-4 py-3 text-sm border-white/10 z-10 pointer-events-none">
          <div className="font-bold mb-2 text-white">Risk Legend</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" /> <span>High Risk</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" /> <span>Director</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" /> <span>Medium Risk</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-0.5 bg-blue-500/80" /> <span className="text-xs text-textMuted">Transaction</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.4)]" /> <span>Normal</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-0.5 border-t border-dashed border-purple-500" /> <span className="text-xs text-textMuted">Ownership</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Export wrapped in Error Boundary ───
export default function GraphView() {
  return (
    <GraphErrorBoundary>
      <GraphViewInner />
    </GraphErrorBoundary>
  );
}

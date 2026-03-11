import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, RotateCcw, ShieldAlert, Activity, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

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

// ─── Cy Stylesheet ───
const CY_STYLESHEET = [
  {
    selector: 'node',
    style: {
      'background-color': '#1e293b',
      'label': 'data(label)',
      'color': '#e2e8f0',
      'font-size': '12px',
      'font-family': 'Inter, sans-serif',
      'text-valign': 'bottom',
      'text-margin-y': 6,
      'width': 30,
      'height': 30,
      'border-width': 2,
      'border-color': 'data(color)',
      'text-outline-width': 2,
      'text-outline-color': '#0a0a0f',
      'transition-property': 'background-color, border-color, width, height',
      'transition-duration': '0.3s'
    }
  },
  {
    selector: 'node[group="Director"]',
    style: { 'shape': 'diamond', 'border-color': '#a855f7' }
  },
  {
    selector: 'edge',
    style: {
      'width': 2,
      'line-color': '#475569',
      'target-arrow-color': '#475569',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'opacity': 0.3,
      'label': 'data(label)',
      'font-size': '10px',
      'color': '#94a3b8',
      'text-outline-width': 2,
      'text-outline-color': '#0a0a0f',
      'transition-property': 'line-color, target-arrow-color, width, opacity',
      'transition-duration': '0.3s'
    }
  },
  // Highlight Classes
  {
    selector: '.highlight-node',
    style: { 'background-color': 'data(color)', 'color': '#fff' }
  },
  {
    selector: '.highlight-edge',
    style: { 'line-color': 'data(color)', 'target-arrow-color': 'data(color)', 'opacity': 1, 'width': 3, 'color': '#fff' }
  },
  {
    selector: '.danger-node',
    style: { 'background-color': '#ef4444', 'border-color': '#f87171', 'border-width': 4, 'width': 36, 'height': 36 }
  },
  {
    selector: '.danger-edge',
    style: { 'line-color': '#ef4444', 'target-arrow-color': '#ef4444', 'opacity': 1, 'width': 4, 'line-style': 'dashed' }
  }
];

// ─── Simulations Data ───
const SIMULATIONS = {
  "Circular Trading": {
    title: "Circular Trading Fraud",
    nodes: [
      { data: { id: 'A', label: 'Company A', group: 'Company', color: '#3b82f6' }, position: { x: 100, y: 50 } },
      { data: { id: 'B', label: 'Company B', group: 'Company', color: '#3b82f6' }, position: { x: 200, y: 150 } },
      { data: { id: 'C', label: 'Company C', group: 'Company', color: '#3b82f6' }, position: { x: 50, y: 200 } }
    ],
    edges: [
      { data: { id: 'e1', source: 'A', target: 'B', label: 'Sells (₹50M)', color: '#3b82f6' } },
      { data: { id: 'e2', source: 'B', target: 'C', label: 'Sells (₹50M)', color: '#3b82f6' } },
      { data: { id: 'e3', source: 'C', target: 'A', label: 'Sells back (₹50M)', color: '#ef4444' } }
    ],
    steps: [
      { text: "Company A sells goods to Company B, generating an invoice.", highlightNodes: ['A', 'B'], highlightEdges: ['e1'] },
      { text: "Company B sells those same 'goods' to Company C.", highlightNodes: ['A', 'B', 'C'], highlightEdges: ['e1', 'e2'] },
      { text: "Company C sells them back to Company A, completing the cycle.", highlightNodes: ['A', 'B', 'C'], highlightEdges: ['e1', 'e2', 'e3'] },
      { text: "Knowledge graph detects transaction cycle. No real goods moved, only ITC claimed.", alert: "Circular Trading Detected", riskScore: 87, dangerNodes: ['A', 'B', 'C'], dangerEdges: ['e1', 'e2', 'e3'] }
    ]
  },
  "High ITC Claims": {
    title: "Anomalous ITC Claims",
    nodes: [
      { data: { id: 'Supplier', label: 'Unknown Supplier', group: 'Company', color: '#f59e0b' }, position: { x: 50, y: 100 } },
      { data: { id: 'Target', label: 'Target Company', group: 'Company', color: '#3b82f6' }, position: { x: 150, y: 100 } },
      { data: { id: 'Buyer', label: 'Legit Buyer', group: 'Company', color: '#22c55e' }, position: { x: 250, y: 100 } }
    ],
    edges: [
      { data: { id: 'e1', source: 'Supplier', target: 'Target', label: 'Claims ITC ₹2Cr', color: '#ef4444' } },
      { data: { id: 'e2', source: 'Target', target: 'Buyer', label: 'Actual Output ₹5L', color: '#3b82f6' } }
    ],
    steps: [
      { text: "Target Company receives massive invoices from unverified suppliers.", highlightNodes: ['Supplier', 'Target'], highlightEdges: ['e1'] },
      { text: "Target Company makes very small actual outward sales.", highlightNodes: ['Supplier', 'Target', 'Buyer'], highlightEdges: ['e1', 'e2'] },
      { text: "ITC claimed is 40x higher than industry average compared to output tax.", alert: "Abnormal ITC Ratio", riskScore: 92, dangerNodes: ['Target'], dangerEdges: ['e1'] }
    ]
  },
  "Shared Directors": {
    title: "Multi-Entity Syndicate",
    nodes: [
      { data: { id: 'Dir', label: 'Director X', group: 'Director', color: '#a855f7' }, position: { x: 150, y: 50 } },
      { data: { id: 'C1', label: 'Company 1', group: 'Company', color: '#3b82f6' }, position: { x: 50, y: 150 } },
      { data: { id: 'C2', label: 'Company 2', group: 'Company', color: '#3b82f6' }, position: { x: 150, y: 150 } },
      { data: { id: 'C3', label: 'Company 3', group: 'Company', color: '#3b82f6' }, position: { x: 250, y: 150 } }
    ],
    edges: [
      { data: { id: 'e1', source: 'Dir', target: 'C1', label: 'Owns', color: '#a855f7' } },
      { data: { id: 'e2', source: 'Dir', target: 'C2', label: 'Owns', color: '#a855f7' } },
      { data: { id: 'e3', source: 'Dir', target: 'C3', label: 'Owns', color: '#a855f7' } },
      { data: { id: 'e4', source: 'C1', target: 'C2', label: 'Heavy Trading', color: '#ef4444' } },
      { data: { id: 'e5', source: 'C2', target: 'C3', label: 'Heavy Trading', color: '#ef4444' } }
    ],
    steps: [
      { text: "Database reveals Director X controls multiple registered entities.", highlightNodes: ['Dir', 'C1', 'C2', 'C3'], highlightEdges: ['e1', 'e2', 'e3'] },
      { text: "These commonly controlled entities trade heavily exclusively with each other.", highlightNodes: ['C1', 'C2', 'C3'], highlightEdges: ['e1', 'e2', 'e3', 'e4', 'e5'] },
      { text: "Graph centrality reveals a coordinated syndicate routing money internally.", alert: "Syndicate Detected", riskScore: 95, dangerNodes: ['Dir', 'C1', 'C2', 'C3'], dangerEdges: ['e4', 'e5'] }
    ]
  },
  "Fake Invoice Fraud": {
    title: "Fake Invoice Generator",
    nodes: [
      { data: { id: 'F', label: 'Company F (Fake)', group: 'Company', color: '#ef4444' }, position: { x: 50, y: 100 } },
      { data: { id: 'B', label: 'Beneficiary', group: 'Company', color: '#3b82f6' }, position: { x: 250, y: 100 } }
    ],
    edges: [
      { data: { id: 'e1', source: 'F', target: 'B', label: 'Invoice Issued (₹10Cr)', color: '#ef4444' } },
      { data: { id: 'e2', source: 'F', target: 'B', label: 'E-Way Bill: MISSING', color: '#f59e0b' } }
    ],
    steps: [
      { text: "Company F issues high-value invoices to the Beneficiary entity.", highlightNodes: ['F', 'B'], highlightEdges: ['e1'] },
      { text: "System cross-checks logistics database for E-Way bills covering the transport.", highlightNodes: ['F', 'B'], highlightEdges: ['e1', 'e2'] },
      { text: "No goods movement detected. Invoice generated strictly to pass fake tax credits.", alert: "Fake Invoice Detected", riskScore: 99, dangerNodes: ['F'], dangerEdges: ['e1', 'e2'] }
    ]
  },
  "Shell Company Networks": {
    title: "Shell Node Routing",
    nodes: [
      { data: { id: 'A', label: 'Origin', group: 'Company', color: '#3b82f6' }, position: { x: 50, y: 150 } },
      { data: { id: 'S1', label: 'Shell 1 (0 days old)', group: 'Company', color: '#94a3b8' }, position: { x: 150, y: 100 } },
      { data: { id: 'S2', label: 'Shell 2 (inactive)', group: 'Company', color: '#94a3b8' }, position: { x: 150, y: 200 } },
      { data: { id: 'B', label: 'Destination', group: 'Company', color: '#3b82f6' }, position: { x: 250, y: 150 } }
    ],
    edges: [
      { data: { id: 'e1', source: 'A', target: 'S1', label: 'Route', color: '#94a3b8' } },
      { data: { id: 'e2', source: 'A', target: 'S2', label: 'Route', color: '#94a3b8' } },
      { data: { id: 'e3', source: 'S1', target: 'B', label: 'Pass ITC', color: '#94a3b8' } },
      { data: { id: 'e4', source: 'S2', target: 'B', label: 'Pass ITC', color: '#94a3b8' } }
    ],
    steps: [
      { text: "Origin company routes funds through newly registered or inactive entities.", highlightNodes: ['A', 'S1', 'S2'], highlightEdges: ['e1', 'e2'] },
      { text: "These 'shell' bridging nodes aggregate funds and immediately pass ITC to destination.", highlightNodes: ['A', 'S1', 'S2', 'B'], highlightEdges: ['e1', 'e2', 'e3', 'e4'] },
      { text: "Network topology flags bridging nodes with high betweenness but low business activity.", alert: "Shell Network Detected", riskScore: 89, dangerNodes: ['S1', 'S2'], dangerEdges: ['e1', 'e2', 'e3', 'e4'] }
    ]
  },
  "ITC Mismatch": {
    title: "GSTR-2A/3B Reconciliation Failure",
    nodes: [
      { data: { id: 'S', label: 'Seller (GSTR-1)', group: 'Company', color: '#f59e0b' }, position: { x: 50, y: 100 } },
      { data: { id: 'B', label: 'Buyer (GSTR-3B)', group: 'Company', color: '#3b82f6' }, position: { x: 250, y: 100 } }
    ],
    edges: [
      { data: { id: 'e1', source: 'B', target: 'S', label: 'Claims ITC (Paid)', color: '#3b82f6' } },
      { data: { id: 'e2', source: 'S', target: 'B', label: 'Reported Sales: ₹0', color: '#ef4444' } }
    ],
    steps: [
      { text: "Buyer files GSTR-3B claiming input tax credit for a purchase.", highlightNodes: ['B'], highlightEdges: ['e1'] },
      { text: "Engine checks seller's GSTR-1 filings for the corresponding transaction.", highlightNodes: ['S', 'B'], highlightEdges: ['e1', 'e2'] },
      { text: "Seller did not report the sale. The buyer's ITC claim is invalid or fraudulent.", alert: "Reconciliation Mismatch", riskScore: 82, dangerNodes: ['S', 'B'], dangerEdges: ['e2'] }
    ]
  }
};

export default function FraudSimulationModal({ fraudType, onClose }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [loading, setLoading] = useState(true);

  const simulation = SIMULATIONS[fraudType];

  // Auto-play logic
  useEffect(() => {
    if (!isPlaying || !simulation) return;
    
    const maxSteps = simulation.steps.length;
    if (currentStep >= maxSteps - 1) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setCurrentStep(prev => prev + 1);
    }, 2500); // 2.5s per step

    return () => clearTimeout(timer);
  }, [currentStep, isPlaying, simulation]);

  // Init Graph
  useEffect(() => {
    let cy = null;

    async function initGraph() {
      if (!simulation || !containerRef.current) return;
      try {
        const cytoscape = await loadCytoscape();
        cy = cytoscape({
          container: containerRef.current,
          elements: [...simulation.nodes, ...simulation.edges],
          style: CY_STYLESHEET,
          layout: { name: 'preset' }, // specific hardcoded pos for nice sims
          zoomingEnabled: false,
          panningEnabled: false,
          userZoomingEnabled: false,
          userPanningEnabled: false,
        });
        
        // Center it nicely
        cy.fit(cy.elements(), 40);
        cyRef.current = cy;
        setLoading(false);
        updateGraphState(0, cy);
      } catch (err) {
        console.error("Failed to load cytoscape:", err);
      }
    }

    initGraph();
    return () => {
      if (cy) cy.destroy();
    };
  }, [simulation]);

  // Update Graph State based on Step
  const updateGraphState = (stepIdx, cyInstance = cyRef.current) => {
    if (!cyInstance || !simulation) return;
    
    const step = simulation.steps[stepIdx];
    cyInstance.elements().removeClass('highlight-node highlight-edge danger-node danger-edge');

    if (step.highlightNodes) {
      step.highlightNodes.forEach(id => cyInstance.getElementById(id).addClass('highlight-node'));
    }
    if (step.highlightEdges) {
      step.highlightEdges.forEach(id => cyInstance.getElementById(id).addClass('highlight-edge'));
    }
    if (step.dangerNodes) {
      step.dangerNodes.forEach(id => cyInstance.getElementById(id).addClass('danger-node'));
    }
    if (step.dangerEdges) {
      step.dangerEdges.forEach(id => cyInstance.getElementById(id).addClass('danger-edge'));
    }
  };

  useEffect(() => {
    updateGraphState(currentStep);
  }, [currentStep]);

  if (!simulation) return null;

  const currentStepData = simulation.steps[currentStep];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      >
        <motion.div 
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="w-full max-w-4xl bg-[#0f111a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
        >
          {/* Left: Simulation view */}
          <div className="md:w-3/5 bg-[#0a0a0f] relative border-b md:border-b-0 md:border-r border-white/10 p-4">
            <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 text-white/50 text-sm font-semibold">
              <Activity size={16} /> <span>Live Simulation Engine</span>
            </div>

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            <div 
              ref={containerRef} 
              className="w-full h-[300px] md:h-[450px]"
            />

            {/* Controls */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full flex items-center space-x-4 shadow-lg">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={currentStep >= simulation.steps.length - 1}
                  className="text-white hover:text-blue-400 disabled:opacity-50 transition-colors"
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                
                <div className="flex space-x-1">
                  {simulation.steps.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                        idx === currentStep ? 'w-6 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 
                        idx < currentStep ? 'w-3 bg-blue-500/50' : 'w-3 bg-white/10'
                      }`}
                      onClick={() => {
                        setCurrentStep(idx);
                        setIsPlaying(false);
                      }}
                    />
                  ))}
                </div>

                <button 
                  onClick={() => {
                    setCurrentStep(0);
                    setIsPlaying(true);
                  }}
                  className="text-white hover:text-cyan-400 transition-colors"
                  title="Reset"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Explanations */}
          <div className="md:w-2/5 p-6 md:p-8 flex flex-col">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-white mb-6 pr-8">{simulation.title}</h2>

            <div className="flex-grow">
              <div className="space-y-4 relative">
                {/* Timeline vertical line */}
                <div className="absolute left-[11px] top-2 bottom-6 w-0.5 bg-white/5 z-0"></div>

                {simulation.steps.map((step, idx) => {
                  const isActive = idx === currentStep;
                  const isPast = idx < currentStep;
                  
                  return (
                    <div key={idx} className={`relative z-10 flex items-start space-x-4 transition-all duration-300 ${isActive ? 'opacity-100 scale-100' : isPast ? 'opacity-60' : 'opacity-30'}`}>
                      <div className={`mt-1 shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                        isActive ? 'border-blue-500 bg-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 
                        isPast ? 'border-blue-500 bg-blue-500' : 'border-white/20 bg-background'
                      }`}>
                        {isPast ? <CheckCircle2 size={12} className="text-white" /> : <span className={`text-[10px] font-bold ${isActive ? 'text-blue-400' : 'text-white/40'}`}>{idx + 1}</span>}
                      </div>
                      <div>
                        {step.alert ? (
                          <div className="text-sm font-bold text-red-400 mt-0.5 mb-1 flex items-center">
                            <ShieldAlert size={14} className="mr-1.5" /> Detection Result
                          </div>
                        ) : (
                          <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isActive ? 'text-blue-400' : 'text-white/40'}`}>
                            Step {idx + 1}
                          </div>
                        )}
                        <p className={`text-sm ${step.alert ? 'text-white font-medium' : 'text-textMuted'}`}>
                          {step.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Alert & Actions */}
            <AnimatePresence>
              {currentStepData.alert && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 rounded-xl border bg-red-500/10 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-red-400 font-bold flex items-center text-sm">
                      <ShieldAlert size={16} className="mr-2" /> {currentStepData.alert}
                    </h3>
                    <div className="text-sm border border-red-500/30 px-2 py-0.5 rounded text-white bg-red-500/20">
                      Risk Score: <strong>{currentStepData.riskScore}%</strong>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Link to="/upload" className="mt-6 group block w-full py-3 px-4 bg-primary/20 hover:bg-primary/30 border border-primary/40 rounded-xl text-center text-blue-400 hover:text-blue-300 font-semibold transition-all">
              Run Detection on Real Data 
              <ArrowRight size={16} className="inline ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

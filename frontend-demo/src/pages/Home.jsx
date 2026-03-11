import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShieldAlert, Network, Zap, ReceiptText, Ghost, AlertTriangle, ArrowRight } from 'lucide-react';
import FraudSimulationModal from '../components/FraudSimulationModal';

export default function Home() {
  const [selectedFraud, setSelectedFraud] = useState(null);

  const fraudTypes = [
    {
      title: "Circular Trading",
      desc: "Detect cyclic invoicing loops where companies trade among themselves to inflate turnover and claim fraudulent tax credits.",
      icon: Network,
      gradId: "grad-circular",
      colors: { stop1: "#3b82f6", stop2: "#06b6d4", glow: "from-blue-500/20 to-cyan-500/20" },
      tooltip: "Visualizes cyclic graphs in transactions."
    },
    {
      title: "High ITC Claims",
      desc: "Identify companies claiming unusually high Input Tax Credit compared to industry averages or transaction history.",
      icon: Zap,
      gradId: "grad-high-itc",
      colors: { stop1: "#a855f7", stop2: "#ec4899", glow: "from-purple-500/20 to-pink-500/20" },
      tooltip: "Statistical outlier detection on ITC filings."
    },
    {
      title: "Shared Directors",
      desc: "Reveal networks where one director controls multiple companies that transact heavily with each other.",
      icon: ShieldAlert,
      gradId: "grad-shared-dir",
      colors: { stop1: "#ef4444", stop2: "#f97316", glow: "from-red-500/20 to-orange-500/20" },
      tooltip: "Graph traversal finding interconnected entities via common directors."
    },
    {
      title: "Fake Invoice Fraud",
      desc: "Detect invoices issued without real goods or services being exchanged, commonly used to claim fake tax credits.",
      icon: ReceiptText,
      gradId: "grad-fake-inv",
      colors: { stop1: "#10b981", stop2: "#14b8a6", glow: "from-emerald-500/20 to-teal-500/20" },
      tooltip: "Flags missing e-way bills and suspicious volume patterns."
    },
    {
      title: "Shell Company Networks",
      desc: "Identify clusters of newly registered or inactive companies used solely for routing fraudulent transactions.",
      icon: Ghost,
      gradId: "grad-shell",
      colors: { stop1: "#64748b", stop2: "#94a3b8", glow: "from-slate-500/20 to-gray-500/20" },
      tooltip: "Detects low-activity bridging nodes in the knowledge graph."
    },
    {
      title: "ITC Mismatch",
      desc: "Detect inconsistencies where buyers claim Input Tax Credit but the corresponding sellers did not report the transaction.",
      icon: AlertTriangle,
      gradId: "grad-itc-miss",
      colors: { stop1: "#eab308", stop2: "#f59e0b", glow: "from-yellow-500/20 to-amber-500/20" },
      tooltip: "GSTR-2A vs GSTR-3B reconciliation mismatches."
    }
  ];

  return (
    <div className="flex flex-col items-center w-full min-h-screen">
      {selectedFraud && (
        <FraudSimulationModal 
          fraudType={selectedFraud} 
          onClose={() => setSelectedFraud(null)} 
        />
      )}

      {/* SVG Gradients for Icons */}
      <svg width="0" height="0" className="hidden">
        <defs>
          {fraudTypes.map((f) => (
            <linearGradient key={f.gradId} id={f.gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop stopColor={f.colors.stop1} offset="0%" />
              <stop stopColor={f.colors.stop2} offset="100%" />
            </linearGradient>
          ))}
        </defs>
      </svg>

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl"
        >
          <div className="inline-block px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-blue-400 text-sm font-semibold mb-6">
            Knowledge Graph Powered Fraud Detection
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight text-white leading-tight">
            Expose GST Fraud <br/>
            <span className="bg-gradient-to-r from-red-500 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
              Before It Happens
            </span>
          </h1>
          
          <p className="text-xl text-textMuted mb-12 max-w-2xl mx-auto leading-relaxed">
            Upload your GST transaction datasets. Our advanced NetworkX & React engine maps every node, identifying shell companies, circular trading, and multi-director syndicates in milliseconds.
          </p>

          <Link to="/login">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-primary text-white rounded-xl font-bold text-lg flex items-center space-x-3 mx-auto transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] border border-primary/50"
            >
              <span>Start Analysis Engine</span>
              <Zap className="fill-white" size={20} />
            </motion.button>
          </Link>
        </motion.div>
      </div>

      {/* New Section: Fraud Detection Capabilities */}
      <div className="w-full relative py-24 border-t border-white/5 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-background to-background overflow-hidden">
        {/* Network background pattern */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.8) 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
              AI-Powered <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">GST Fraud Detection</span>
            </h2>
            <p className="text-xl text-textMuted max-w-3xl mx-auto">
              Our knowledge graph engine analyzes relationships between companies, directors, and transactions to uncover hidden tax fraud networks.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {fraudTypes.map((fraud, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group relative glass-panel p-8 rounded-2xl border border-white/5 hover:border-white/20 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] bg-surface/30 hover:bg-surface/60 overflow-hidden text-left"
                title={fraud.tooltip}
              >
                {/* subtle gradient glow behind card */}
                <div className={`absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br ${fraud.colors.glow} blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700 pointer-events-none`}></div>
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className={`w-14 h-14 rounded-xl mb-6 flex items-center justify-center bg-background/80 border border-white/5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-xl`}>
                    <fraud.icon size={28} style={{ stroke: `url(#${fraud.gradId})` }} />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-3 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all">{fraud.title}</h3>
                  <p className="text-textMuted text-sm leading-relaxed mb-8 flex-grow">{fraud.desc}</p>
                  
                  {/* View Detection Logic Button */}
                  <div className="mt-auto pt-4 border-t border-white/5">
                    <button 
                      onClick={() => setSelectedFraud(fraud.title)}
                      className="flex items-center text-sm font-semibold text-blue-400/80 group-hover:text-cyan-400 transition-colors cursor-pointer w-full text-left"
                    >
                      View Detection Logic <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

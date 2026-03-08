import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShieldAlert, Network, Zap } from 'lucide-react';

export default function Home() {
  const features = [
    { title: "Circular Trading", desc: "Instantly detect cyclic invoicing between multiple shell companies.", icon: Network, color: "text-blue-400" },
    { title: "High ITC Claims", desc: "Identify anomalous Input Tax Credit requests far above industry norms.", icon: Zap, color: "text-purple-400" },
    { title: "Shared Directors", desc: "Uncover hidden links where a single entity controls dozens of high-risk companies.", icon: ShieldAlert, color: "text-red-400" }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">

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
          Upload your GST transaction datasets. Our advanced NetworkX & Next.js engine maps every node, identifying shell companies, circular trading, and multi-director syndicates in milliseconds.
        </p>

        <Link to="/upload">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-primary text-white rounded-xl font-bold text-lg neo-glow flex items-center space-x-3 mx-auto transition-all"
          >
            <span>Start Analysis Engine</span>
            <Zap className="fill-white" size={20} />
          </motion.button>
        </Link>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 max-w-5xl w-full"
      >
        {features.map((F, i) => (
          <div key={i} className="glass-panel p-6 flex flex-col items-center text-center hover:bg-surface/90 transition-all border-t-white/5 border-l-white/5">
            <div className={`p-4 rounded-full bg-surface/80 border border-white/5 mb-4 ${F.color}`}>
              <F.icon size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">{F.title}</h3>
            <p className="text-textMuted text-sm">{F.desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

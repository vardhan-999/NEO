import { NavLink } from 'react-router-dom';
import { Shield, Home, Upload, BarChart, Network, Bell, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  
  const links = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/dashboard', label: 'Dashboard', icon: BarChart },
    { to: '/graph', label: 'Graph View', icon: Network },
    { to: '/alerts', label: 'Alerts', icon: Bell },
  ];

  return (
    <nav className="glass-panel mx-6 mt-6 px-6 py-4 flex items-center justify-between sticky top-6 z-50">
      <div className="flex items-center space-x-3">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="text-primary"
        >
          <Shield size={32} />
        </motion.div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent transform hover:scale-105 transition-transform cursor-pointer">
          NeoTrace GST
        </h1>
      </div>
      
      <div className="flex space-x-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => clsx(
              "flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 font-medium text-sm",
              isActive 
                ? "bg-primary/20 text-blue-400 neo-glow" 
                : "text-textMuted hover:bg-surface hover:text-white"
            )}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
        
        <div className="w-px bg-white/10 mx-2" />
        
        <button 
          onClick={async () => {
            const btn = document.getElementById('sim-btn');
            const ogText = btn.innerHTML;
            btn.innerHTML = '<span class="animate-pulse">Simulating...</span>';
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }}
          id="sim-btn"
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600/50 to-red-600/50 hover:from-purple-500/60 hover:to-red-500/60 border border-red-500/30 text-white rounded-lg transition-all duration-300 font-bold text-sm shadow-[0_0_10px_rgba(239,68,68,0.2)]"
        >
          <Activity size={18} />
          <span>Run Simulation</span>
        </button>

        {isAuthenticated && (
          <button 
            onClick={logout}
            className="flex items-center space-x-2 px-4 py-2 bg-surface hover:bg-white/10 border border-white/10 text-white rounded-lg transition-all duration-300 font-medium text-sm ml-2"
          >
            <LogOut size={18} className="text-red-400" />
            <span>Logout</span>
          </button>
        )}
      </div>
    </nav>
  );
}

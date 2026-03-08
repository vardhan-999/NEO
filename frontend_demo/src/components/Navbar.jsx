import { NavLink } from 'react-router-dom';
import { Shield, Home, Upload, BarChart, Network, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function Navbar() {
  const links = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/upload', label: 'Upload Data', icon: Upload },
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
      </div>
    </nav>
  );
}

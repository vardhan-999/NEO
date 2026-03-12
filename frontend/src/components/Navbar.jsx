import { NavLink, useNavigate } from 'react-router-dom';
import { Shield, Home, BarChart, Network, Bell, Search, LogIn, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const publicLinks = [
    { to: '/', label: 'Home', icon: Home },
  ];

  const protectedLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: BarChart },
    { to: '/graph', label: 'Graph View', icon: Network },
    { to: '/alerts', label: 'Alerts', icon: Bell },
    { to: '/investigation-lab', label: 'Investigation Lab', icon: Search },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleLinks = isAuthenticated ? [...publicLinks, ...protectedLinks] : publicLinks;

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

      <div className="flex items-center space-x-1">
        {visibleLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => clsx(
              'flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 font-medium text-sm',
              isActive
                ? 'bg-primary/20 text-blue-400 neo-glow'
                : 'text-textMuted hover:bg-surface hover:text-white'
            )}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}

        <div className="w-px bg-white/10 mx-2" />

        {isAuthenticated ? (
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 bg-surface hover:bg-white/10 border border-white/10 text-white rounded-lg transition-all duration-300 font-medium text-sm"
          >
            <LogOut size={18} className="text-red-400" />
            <span>Logout</span>
          </button>
        ) : (
          <NavLink
            to="/login"
            className={({ isActive }) => clsx(
              'flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 font-medium text-sm border',
              isActive
                ? 'bg-primary/20 text-blue-400 border-blue-500/30 neo-glow'
                : 'bg-primary/10 text-blue-300 border-primary/30 hover:bg-primary/20 hover:text-white'
            )}
          >
            <LogIn size={18} />
            <span>Login</span>
          </NavLink>
        )}
      </div>
    </nav>
  );
}

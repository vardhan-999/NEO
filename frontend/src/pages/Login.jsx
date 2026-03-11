import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, LogIn, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      login();
      navigate('/dashboard');
    }, 800);
  };

  const handleDemoLogin = () => {
    setLoading(true);
    setTimeout(() => {
      login();
      navigate('/dashboard');
    }, 500);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        {/* Decorative background glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-30"></div>
        
        <div className="glass-panel p-8 rounded-2xl relative z-10 border border-white/10 shadow-2xl bg-background/90 backdrop-blur-xl">
          <div className="flex justify-center mb-6">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="p-3 bg-blue-500/10 rounded-full text-blue-400 border border-blue-500/20"
            >
              <Shield size={40} />
            </motion.div>
          </div>
          
          <h2 className="text-2xl font-bold text-center text-white mb-2">
            NeoTrace GST<br/><span className="text-blue-400">Secure Access</span>
          </h2>
          <p className="text-center text-textMuted text-sm mb-8">
            Authenticate to access the Risk Intelligence Engine.
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-textMuted uppercase tracking-wider mb-1 px-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-textMuted">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-surface/50 border border-white/10 rounded-xl px-10 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                  placeholder="investigator@agency.gov"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-textMuted uppercase tracking-wider mb-1 px-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-textMuted">
                  <Lock size={18} />
                </div>
                <input 
                  type="password"
                  autoComplete="current-password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-surface/50 border border-white/10 rounded-xl px-10 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] border border-blue-400/20"
              >
                {loading ? <span className="animate-pulse">Authenticating...</span> : (
                  <>
                    <LogIn size={20} />
                    <span>Login</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 flex items-center">
            <div className="flex-1 border-t border-white/10"></div>
            <span className="px-3 text-xs text-textMuted uppercase tracking-widest">or</span>
            <div className="flex-1 border-t border-white/10"></div>
          </div>

          <div className="mt-6">
            <button 
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-surface hover:bg-white/10 text-white font-semibold py-3 px-4 rounded-xl transition-all border border-white/10 hover:border-white/20 active:scale-[0.98]"
            >
              <Zap size={20} className="text-yellow-400" />
              <span>Demo Login</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

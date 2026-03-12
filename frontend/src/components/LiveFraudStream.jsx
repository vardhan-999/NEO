import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, AlertTriangle, Activity, ArrowRight, Shield } from 'lucide-react';

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

export default function LiveFraudStream() {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const wsRef = useRef(null);
  const scrollRef = useRef(null);

  const connect = () => {
    setConnecting(true);
    try {
      const ws = new WebSocket('ws://localhost:8000/ws/fraud-stream');
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          const ev = { ...msg, id: Date.now() + Math.random() };
          setEvents((prev) => [ev, ...prev].slice(0, 50));
        } catch (_) {}
      };

      ws.onclose = () => {
        setConnected(false);
        setConnecting(false);
        // auto-reconnect after 4s
        setTimeout(() => connect(), 4000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (err) {
      setConnecting(false);
      setTimeout(() => connect(), 4000);
    }
  };

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Auto-scroll to top when new events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length]);

  const getRiskColor = (risk) => {
    if (!risk) return 'text-gray-400';
    if (risk === 'High') return 'text-red-400';
    if (risk === 'Medium') return 'text-yellow-400';
    return 'text-green-400';
  };

  const getScoreColor = (score) => {
    if (!score) return 'text-gray-400';
    if (score > 0.7) return 'text-red-400';
    if (score > 0.4) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="glass-panel p-0 overflow-hidden flex flex-col" style={{ height: '480px' }}>
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-surface/60 flex items-center justify-between shrink-0">
        <h3 className="text-lg font-bold text-white flex items-center">
          <span className={`w-2 h-2 rounded-full mr-3 ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          Live Fraud Stream
        </h3>
        <div className="flex items-center space-x-2">
          {connecting && (
            <span className="text-xs text-yellow-400 flex items-center animate-pulse">
              <Activity size={12} className="mr-1" /> Connecting…
            </span>
          )}
          {connected && (
            <span className="text-xs text-green-400 flex items-center">
              <Wifi size={12} className="mr-1" /> Live
            </span>
          )}
          {!connected && !connecting && (
            <span className="text-xs text-red-400 flex items-center">
              <WifiOff size={12} className="mr-1" /> Reconnecting…
            </span>
          )}
          <span className="text-xs text-textMuted bg-black/30 px-2 py-0.5 rounded font-mono">
            {events.length} events
          </span>
        </div>
      </div>

      {/* Feed */}
      <div ref={scrollRef} className="overflow-y-auto flex-1 p-3 space-y-2">
        {events.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-textMuted">
            <Activity className="mb-3 opacity-40" size={32} />
            <p className="text-sm">Waiting for transactions…</p>
            <p className="text-xs mt-1 opacity-60">Upload a dataset to start the stream</p>
          </div>
        )}

        <AnimatePresence>
          {events.map((ev) => (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className={`p-3 rounded-lg border text-sm ${
                ev.type === 'alert'
                  ? 'bg-red-900/20 border-red-500/40'
                  : ev.type === 'transaction'
                  ? 'bg-surface/60 border-white/8'
                  : 'bg-black/20 border-white/5'
              }`}
            >
              {ev.type === 'info' && (
                <p className="text-textMuted text-xs">{ev.message}</p>
              )}

              {ev.type === 'transaction' && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-gray-300 flex-wrap gap-y-1">
                    <Shield size={12} className="text-blue-400 shrink-0" />
                    <span className="font-mono text-xs text-blue-300 truncate max-w-[100px]">{ev.seller}</span>
                    <ArrowRight size={12} className="text-gray-500 shrink-0" />
                    <span className="font-mono text-xs text-blue-300 truncate max-w-[100px]">{ev.buyer}</span>
                  </div>
                  <span className="text-xs font-mono text-gray-400 shrink-0 ml-2">{formatCurrency(ev.amount)}</span>
                </div>
              )}

              {ev.type === 'alert' && (
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <AlertTriangle size={14} className="text-red-400 shrink-0" />
                    <span className="font-bold text-red-400 text-xs uppercase tracking-wider">
                      ⚠ {ev.risk || 'HIGH'} Anomaly Detected
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-300 mb-1">
                    <span className="font-mono text-xs truncate max-w-[100px]">{ev.seller}</span>
                    <ArrowRight size={10} className="text-red-500 shrink-0" />
                    <span className="font-mono text-xs truncate max-w-[100px]">{ev.buyer}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Amount: <span className="font-mono text-white">{formatCurrency(ev.amount)}</span></span>
                    <span className={`font-bold font-mono ${getScoreColor(ev.score)}`}>
                      Score: {ev.score ?? '—'}
                    </span>
                  </div>
                  {ev.message && (
                    <p className="text-xs text-red-300/80 mt-1 leading-relaxed">{ev.message}</p>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Network, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { mockGraphData } from '../mockData';

export default function GraphView() {
  const [data, setData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const fgRef = useRef();

  useEffect(() => {
    setTimeout(() => {
      setData(mockGraphData);
      setLoading(false);
    }, 1000);
  }, []);

  const handleZoomIn = useCallback(() => { fgRef.current.zoom(fgRef.current.zoom() * 1.2, 400); }, []);
  const handleZoomOut = useCallback(() => { fgRef.current.zoom(fgRef.current.zoom() / 1.2, 400); }, []);
  const zoomToFit = useCallback(() => { fgRef.current.zoomToFit(400); }, []);

  if (loading) return <div className="text-center mt-20 animate-pulse text-primary">Loading Knowledge Graph...</div>;

  return (
    <div className="flex flex-col h-[85vh] -m-6 p-6">
      <div className="mb-4 flex items-center justify-between z-10">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Network className="mr-3 text-blue-500" /> Network Investigation
          </h2>
          <p className="text-textMuted text-sm mt-1">Interactive topology of entities and transaction flows</p>
        </div>
        
        <div className="flex space-x-2 bg-surface/80 p-1 rounded-lg border border-white/10 backdrop-blur-md">
          <button onClick={handleZoomIn} className="p-2 hover:bg-white/10 rounded text-textMuted hover:text-white transition-colors">
            <ZoomIn size={18} />
          </button>
          <button onClick={handleZoomOut} className="p-2 hover:bg-white/10 rounded text-textMuted hover:text-white transition-colors">
            <ZoomOut size={18} />
          </button>
          <button onClick={zoomToFit} className="p-2 hover:bg-white/10 rounded text-textMuted hover:text-white transition-colors">
            <Maximize size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 rounded-2xl overflow-hidden glass-panel neo-glow border border-primary/20 relative">
        <ForceGraph2D
          ref={fgRef}
          graphData={data}
          nodeLabel="id"
          nodeColor={(node) => {
            if(node.group === "Director") return '#eab308'; // Yellow
            if(node.risk && node.risk >= 50) return '#ef4444'; // Red for Suspicious
            return '#22c55e'; // Green for Normal company
          }}
          nodeVal={5}
          linkColor={(link) => link.label === 'owns' ? 'rgba(234,179,8,0.4)' : 'rgba(255,255,255,0.2)'}
          linkWidth={(link) => link.label === 'trades_with' ? 2 : 1}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={d => d.value * 0.001 || 0.005}
          backgroundColor="#0a0a0f"
          onNodeHover={node => {
            if (document.body.style) {
              document.body.style.cursor = node ? 'pointer' : null;
            }
          }}
        />
        
        {/* Legend */}
        <div className="absolute bottom-6 left-6 glass-panel px-4 py-3 text-sm border-white/10">
          <div className="font-bold mb-2 text-white">Legend</div>
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" /> <span className="text-gray-200">Normal Company</span>
          </div>
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" /> <span className="text-gray-200">Suspicious Company</span>
          </div>
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]" /> <span className="text-gray-200">Director</span>
          </div>
          <div className="flex items-center space-x-2 mt-3">
            <div className="w-4 h-0.5 bg-white/50" /> <span className="text-xs text-textMuted">Transaction Flow</span>
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <div className="w-4 h-0.5 bg-yellow-500/50" /> <span className="text-xs text-textMuted">Ownership Link</span>
          </div>
        </div>
      </div>
    </div>
  );
}

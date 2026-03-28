import React, { useMemo, useRef, useEffect, useState } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { useAppStore } from '../../store/useAppStore';
import { Share2, Zap, Brain, ListTodo, FileText, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface Node {
  id: string;
  name: string;
  val: number;
  color: string;
  type: 'root' | 'hub' | 'summary' | 'keypoint' | 'action' | 'flashcard';
  icon?: any;
}

interface Link {
  source: string;
  target: string;
}

export const NeuralLinkTab: React.FC = () => {
  const { result } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setDimensions({ width: clientWidth, height: clientHeight });
    }

    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const graphData = useMemo(() => {
    if (!result) return { nodes: [], links: [] };

    const nodes: Node[] = [];
    const links: Link[] = [];

    // 1. Root Node
    nodes.push({
      id: 'root',
      name: result.title,
      val: 20,
      color: '#ffffff',
      type: 'root',
      icon: Zap,
    });

    // 2. Hubs
    const hubs = [
      { id: 'hub-summary', name: 'Summary', type: 'hub' as const, color: '#60a5fa', icon: FileText },
      { id: 'hub-keypoints', name: 'Key Points', type: 'hub' as const, color: '#34d399', icon: Brain },
      { id: 'hub-actions', name: 'Actions', type: 'hub' as const, color: '#f87171', icon: ListTodo },
      { id: 'hub-flashcards', name: 'Cards', type: 'hub' as const, color: '#a78bfa', icon: Sparkles },
    ];

    hubs.forEach((hub) => {
      nodes.push({
        id: hub.id,
        name: hub.name,
        val: 12,
        color: hub.color,
        type: hub.type,
        icon: hub.icon,
      });
      links.push({ source: 'root', target: hub.id });
    });

    // 3. Content Nodes
    // Summary
    nodes.push({
      id: 'summary-node',
      name: result.summary,
      val: 8,
      color: '#60a5fa99',
      type: 'summary',
    });
    links.push({ source: 'hub-summary', target: 'summary-node' });

    // Key Points
    result.keyPoints.forEach((point, i) => {
      const id = `kp-${i}`;
      nodes.push({
        id,
        name: point,
        val: 8,
        color: '#34d39999',
        type: 'keypoint',
      });
      links.push({ source: 'hub-keypoints', target: id });
    });

    // Action Items
    result.actionItems.forEach((item, i) => {
      const id = `action-${i}`;
      nodes.push({
        id,
        name: item.task,
        val: 6,
        color: '#f8717199',
        type: 'action',
      });
      links.push({ source: 'hub-actions', target: id });
    });

    // Flashcards
    result.flashcards.forEach((card, i) => {
      const id = `card-${i}`;
      nodes.push({
        id,
        name: card.question,
        val: 6,
        color: '#a78bfa99',
        type: 'flashcard',
      });
      links.push({ source: 'hub-flashcards', target: id });
    });

    return { nodes, links };
  }, [result]);

  if (!result) return null;

  return (
    <div className="flex flex-col h-full space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h3 className="text-xl font-black text-white flex items-center gap-3">
          <div className="p-2 bg-accent-primary/20 rounded-xl text-accent-primary">
            <Share2 className="w-5 h-5" />
          </div>
          Neural Link
        </h3>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
          <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
          Interactive Network
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        ref={containerRef}
        className="flex-1 glass rounded-[32px] overflow-hidden relative border border-white/5 bg-black/40"
      >
        {dimensions.width > 0 && (
          <ForceGraph2D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeLabel="name"
            nodeRelSize={6}
            linkColor={() => 'rgba(255, 255, 255, 0.1)'}
            linkWidth={1.5}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.005}
            linkDirectionalParticleWidth={1}
            linkDirectionalParticleColor={() => '#ffffff44'}
            backgroundColor="rgba(0,0,0,0)"
            onNodeClick={(node) => {
              if (fgRef.current) {
                fgRef.current.centerAt(node.x, node.y, 1000);
                fgRef.current.zoom(3, 1000);
              }
            }}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const label = node.name;
              const fontSize = 12 / globalScale;
              ctx.font = `${fontSize}px Inter, sans-serif`;
              const textWidth = ctx.measureText(label).width;
              const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

              // Node circle
              ctx.beginPath();
              ctx.arc(node.x, node.y, node.val / 2 + 2, 0, 2 * Math.PI, false);
              ctx.fillStyle = node.color;
              ctx.shadowBlur = 15;
              ctx.shadowColor = node.color;
              ctx.fill();

              // Text label (if zoomed in enough)
              if (globalScale > 1.5) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + (node.val / 2) + 2, bckgDimensions[0], bckgDimensions[1]);
                
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(
                  label.length > 30 ? label.substring(0, 27) + '...' : label, 
                  node.x, 
                  node.y + (node.val / 2) + 2 + (bckgDimensions[1] / 2)
                );
              }
              
              ctx.shadowBlur = 0;
            }}
            nodeCanvasObjectMode={() => 'always'}
          />
        )}
        
        <div className="absolute bottom-6 left-6 flex gap-4">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[10px] text-white/60">
            <span className="w-2 h-2 rounded-full bg-accent-primary" /> Key Concepts
          </div>
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[10px] text-white/60">
            <span className="w-2 h-2 rounded-full bg-accent-secondary" /> Action Items
          </div>
        </div>

        <div className="absolute top-6 right-6">
           <button 
             onClick={() => {
               if (fgRef.current) {
                 fgRef.current.zoomToFit(400);
               }
             }}
             className="p-2 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 transition-colors"
           >
             <Sparkles className="w-4 h-4 text-white" />
           </button>
        </div>
      </motion.div>
    </div>
  );
};

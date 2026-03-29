import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { StreamingText } from '../shared/StreamingText';
import { CopyButton } from '../shared/CopyButton';
import { motion } from 'motion/react';
import { Sparkles, Target, Zap, NotebookPen } from 'lucide-react';

export const SummaryTab: React.FC = () => {
  const { result } = useAppStore();

  if (!result) return null;

  return (
    <div className="space-y-10">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-accent-primary/20 rounded-xl text-accent-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            Summary
          </h3>
          <CopyButton text={result.summary} />
        </div>
        
        <div className="glass rounded-[32px] p-8 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-accent-primary to-transparent" />
          <div className="text-lg leading-relaxed text-white/90 font-medium italic">
            <StreamingText text={result.summary} speed={5} />
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-xl font-black text-white flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent-tertiary/20 rounded-xl text-accent-tertiary">
            <Target className="w-5 h-5" />
          </div>
          Key Points
        </h3>

        <div className="grid gap-4">
          {result.keyPoints.map((takeaway, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              whileHover={{ x: 10 }}
              className="glass rounded-2xl p-5 flex items-start gap-4 group hover:bg-white/[0.05] transition-all"
            >
              <div className="mt-1 p-1 bg-accent-tertiary/20 rounded-lg text-accent-tertiary group-hover:scale-110 transition-transform">
                <Zap className="w-3 h-3 fill-current" />
              </div>
              <p className="text-sm text-white/80 leading-relaxed font-medium">
                {takeaway}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-xl font-black text-white flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent-secondary/20 rounded-xl text-accent-secondary">
            <NotebookPen className="w-5 h-5" />
          </div>
          Study Notes
        </h3>

        <div className="grid gap-3">
          {result.notes.map((note, index) => (
            <div key={index} className="glass rounded-2xl p-5 text-sm text-white/80 leading-relaxed">
              {note}
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  );
};

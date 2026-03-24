import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Presentation, Layout, List, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export const SlidesTab: React.FC = () => {
  const { result } = useAppStore();

  if (!result) return null;

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-white flex items-center gap-3">
          <div className="p-2 bg-accent-primary/20 rounded-xl text-accent-primary">
            <Presentation className="w-5 h-5" />
          </div>
          PPT Outline
        </h3>
        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
          <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Slides:</span>
          <span className="text-xs font-mono text-accent-primary font-bold">{result.slides.length}</span>
        </div>
      </div>

      <div className="grid gap-8">
        {result.slides.length === 0 ? (
          <div className="glass rounded-[28px] border border-white/10 p-6 text-sm text-text-secondary">
            No slide outline generated yet. Add a bit more context in the source to create a stronger presentation flow.
          </div>
        ) : (
          result.slides.map((slide, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="group relative flex flex-col gap-6"
            >
              {/* Slide Number Indicator */}
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 glass rounded-full flex items-center justify-center text-[10px] font-black text-accent-primary border border-accent-primary/30 z-20">
                {i + 1}
              </div>

              <div className="glass rounded-[40px] p-10 border border-white/5 hover:border-accent-primary/30 transition-all shadow-2xl overflow-hidden relative">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-accent-primary/10 transition-colors" />
              
                <div className="relative z-10 space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white/5 rounded-xl text-text-secondary">
                      <Layout className="w-4 h-4" />
                    </div>
                    <h4 className="text-2xl font-black text-white tracking-tight">
                      {slide.title}
                    </h4>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-accent-primary uppercase tracking-widest">
                      <List className="w-3 h-3" />
                      Key Points
                    </div>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {slide.points.map((point, j) => (
                        <li key={j} className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-primary flex-shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                          <p className="text-sm text-white/80 leading-relaxed">
                            {point}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Slide Footer */}
                <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between opacity-50">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-accent-primary" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">AI Generated Slide</span>
                  </div>
                  <span className="text-[9px] font-mono">0{i + 1} / 0{result.slides.length}</span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

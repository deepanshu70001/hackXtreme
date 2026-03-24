import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { History, Clock, GraduationCap, Briefcase, Users, ShieldCheck, FileText, Youtube } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Mode } from '../../types/ai.types';

export const Sidebar: React.FC = () => {
  const { history, loadHistoryItem, mode, setMode } = useAppStore();

  const modes: { id: Mode; label: string; icon: any; color: string }[] = [
    { id: 'study', label: 'Study', icon: GraduationCap, color: 'text-accent-primary' },
    { id: 'work', label: 'Work', icon: Briefcase, color: 'text-accent-secondary' },
    { id: 'meeting', label: 'Meeting', icon: Users, color: 'text-accent-tertiary' },
  ];

  return (
    <div className="relative z-20 hidden h-full w-72 flex-col border-r border-white/10 bg-bg-secondary/55 backdrop-blur-2xl xl:flex">
      <div className="flex h-full flex-col p-6">
        {/* Logo */}
        <motion.div 
          className="mb-10 flex items-center gap-3"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-primary via-sky-300 to-accent-secondary shadow-lg shadow-accent-primary/20">
            <span className="text-white font-black text-2xl tracking-tighter">C</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-black tracking-widest text-white uppercase leading-none">Copilot</h1>
            <span className="text-[10px] font-bold text-accent-tertiary uppercase tracking-tighter">Local AI</span>
          </div>
        </motion.div>

        {/* Modes */}
        <div className="mb-10 space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 px-2">Modes</h2>
          {modes.map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`group relative flex w-full items-center gap-3 rounded-2xl p-3.5 transition-all duration-300 ${
                  active 
                    ? "bg-white/10 text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)]" 
                    : "text-text-secondary hover:text-white hover:bg-white/5"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="active-sidebar-mode"
                    className="absolute inset-0 rounded-2xl border border-white/10 bg-white/5"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className={`w-4 h-4 relative z-10 ${active ? m.color : "group-hover:" + m.color}`} />
                <span className="text-xs font-bold relative z-10">{m.label}</span>
                {active && (
                  <motion.div 
                    layoutId="active-dot"
                    className="absolute right-3 w-1 h-1 bg-white rounded-full" 
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* History */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 px-2 flex items-center gap-2">
            <History className="w-3 h-3" />
            Recent
          </h2>
          
          <div className="flex-1 space-y-2 overflow-y-auto pr-1 no-scrollbar">
            <AnimatePresence mode="popLayout">
              {history.length === 0 ? (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[10px] text-text-secondary italic px-2"
                >
                  No history yet
                </motion.p>
              ) : (
                history.map((item, index) => (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ x: 4, backgroundColor: "rgba(255,255,255,0.05)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => loadHistoryItem(item)}
                    className="group flex w-full flex-col items-start gap-2 rounded-2xl border border-transparent p-3 text-left transition-all"
                  >
                    <span className="text-[11px] font-medium text-white line-clamp-1 opacity-80 group-hover:opacity-100">{item.title}</span>
                    <div className="flex items-center gap-2 text-[9px] text-text-secondary">
                      <Clock className="w-2 h-2" />
                      {item.date}
                    </div>
                    <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-text-secondary">
                      {item.sourceType === 'youtube' ? <Youtube className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                      {item.sourceType}
                    </div>
                  </motion.button>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 border-t border-white/5 pt-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-[24px] border border-accent-tertiary/10 bg-accent-tertiary/5 p-4"
          >
            <ShieldCheck className="w-5 h-5 text-accent-tertiary" />
            <div className="flex flex-col">
              <p className="text-[10px] font-bold text-accent-tertiary uppercase tracking-widest">Privacy First</p>
              <p className="text-[9px] text-text-secondary leading-tight">
                On-device processing
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

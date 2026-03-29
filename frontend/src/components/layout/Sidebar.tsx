import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { History, Clock, GraduationCap, Briefcase, Users, ShieldCheck, FileText, Youtube } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Mode } from '../../types/ai.types';

export const Sidebar: React.FC = () => {
  const { history, loadHistoryItem, mode, setMode } = useAppStore();

  const modes: { id: Mode; label: string; icon: any; color: string }[] = [
    { id: 'study', label: 'Study', icon: GraduationCap, color: 'text-white' },
    { id: 'work', label: 'Work', icon: Briefcase, color: 'text-white' },
    { id: 'meeting', label: 'Meeting', icon: Users, color: 'text-white' },
  ];

  return (
    <div className="relative z-20 hidden h-full w-72 flex-col border-r border-white/5 bg-[#080808]/80 backdrop-blur-2xl xl:flex">
      <div className="flex h-full flex-col p-6">
        <motion.div
          className="mb-10 flex flex-col gap-1"
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black shadow-lg">
              <span className="font-black text-xl tracking-tighter">C</span>
            </div>
            <h1 className="text-base font-bold tracking-tight text-white leading-none">Copilot</h1>
          </div>
          <span className="text-[10px] font-medium text-text-secondary uppercase tracking-widest pl-12 mt-1">Workspace</span>
        </motion.div>

        <div className="mb-10 space-y-1">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary mb-3 px-2">Modes</h2>
          {modes.map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`group relative flex w-full items-center gap-3 rounded-xl p-3 transition-all duration-300 ${
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="active-sidebar-mode"
                    className="absolute inset-0 rounded-xl bg-white/5 border border-white/10"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <Icon className={`w-4 h-4 relative z-10 ${active ? m.color : 'opacity-70 group-hover:opacity-100'}`} />
                <span className="text-sm font-medium relative z-10">{m.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary mb-3 px-2 flex items-center gap-2">
            <History className="w-3 h-3 opacity-70" />
            Recent
          </h2>

          <div className="flex-1 space-y-1 overflow-y-auto pr-1 no-scrollbar">
            <AnimatePresence mode="popLayout">
              {history.length === 0 ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-text-secondary/70 italic px-2"
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
                    whileHover={{ x: 2, backgroundColor: 'rgba(255,255,255,0.03)' }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => loadHistoryItem(item)}
                    className="group flex w-full flex-col items-start gap-1.5 rounded-xl border border-transparent p-3 text-left transition-all"
                  >
                    <span className="text-xs font-medium text-white/90 line-clamp-1 group-hover:text-white">{item.title}</span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-text-secondary/70">
                        <Clock className="w-3 h-3" />
                        {item.date}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-text-secondary/70 capitalize">
                        {item.sourceType === 'youtube' ? <Youtube className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                        {item.sourceType}
                      </div>
                    </div>
                  </motion.button>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-6 border-t border-white/5 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <p className="text-xs font-semibold text-white">Private Workspace</p>
              <p className="text-[10px] text-text-secondary">Session-first processing</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

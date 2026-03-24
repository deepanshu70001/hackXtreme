import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Circle, Clock, CalendarClock, ListTodo } from 'lucide-react';
import { motion } from 'motion/react';

export const ActionsTab: React.FC = () => {
  const { result } = useAppStore();

  if (!result) return null;

  const priorityColors = {
    high: 'text-rose-500 bg-rose-500/10 border-rose-500/20 shadow-rose-500/10',
    medium: 'text-amber-500 bg-amber-500/10 border-amber-500/20 shadow-amber-500/10',
    low: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/10',
  };

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h3 className="text-xl font-black text-white flex items-center gap-3">
          <div className="p-2 bg-accent-secondary/20 rounded-xl text-accent-secondary">
            <ListTodo className="w-5 h-5" />
          </div>
          Action Items
        </h3>
        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
          <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Total Tasks:</span>
          <span className="text-xs font-mono text-accent-secondary font-bold">{result.actionItems.length}</span>
        </div>
      </motion.div>

      <div className="grid gap-4">
        {result.actionItems.map((action, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ x: 8, backgroundColor: "rgba(255,255,255,0.05)" }}
            className="group glass rounded-2xl p-6 flex items-center gap-6 border border-white/5 hover:border-white/20 transition-all"
          >
            <div className="flex-shrink-0 relative">
              <div className="absolute inset-0 bg-accent-secondary/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <Circle className="w-6 h-6 text-white/20 group-hover:text-accent-secondary transition-colors relative z-10" />
            </div>
            
            <div className="flex-1">
              <p className="text-base text-white/90 font-medium leading-tight mb-1">
                {action.task}
              </p>
              <div className="flex items-center gap-3 text-[10px] text-text-secondary uppercase tracking-widest font-bold">
                <Clock className="w-3 h-3" />
                {action.deadline || 'No explicit deadline'}
              </div>
            </div>

            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border shadow-sm ${priorityColors[action.priority]}`}>
              {action.priority}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="pt-4"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent-primary/20 rounded-xl text-accent-primary">
            <CalendarClock className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-black text-white">Deadlines</h3>
        </div>

        <div className="grid gap-4">
          {result.deadlines.length > 0 ? (
            result.deadlines.map((deadline, index) => (
              <div key={index} className="glass rounded-2xl p-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">{deadline.due}</p>
                  <p className="text-sm text-text-secondary mt-1 leading-relaxed">{deadline.label}</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest text-text-secondary">
                  {deadline.confidence}
                </span>
              </div>
            ))
          ) : (
            <div className="glass rounded-2xl p-5 text-sm text-text-secondary">
              No explicit deadlines were detected in the source.
            </div>
          )}
        </div>
      </motion.section>
    </div>
  );
};

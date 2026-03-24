import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Mode } from '../../types/ai.types';
import { GraduationCap, Briefcase, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ModeSelector: React.FC = () => {
  const { mode, setMode } = useAppStore();

  const modes: { id: Mode; label: string; icon: any }[] = [
    { id: 'study', label: 'Study', icon: GraduationCap },
    { id: 'work', label: 'Work', icon: Briefcase },
    { id: 'meeting', label: 'Meeting', icon: Users },
  ];

  return (
    <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 relative">
      {modes.map((m) => {
        const Icon = m.icon;
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 z-10",
              active ? "text-white" : "text-text-secondary hover:text-white"
            )}
          >
            {active && (
              <motion.div
                layoutId="active-mode"
                className="absolute inset-0 bg-emerald-500 rounded-lg shadow-lg shadow-emerald-500/20"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Icon className="w-4 h-4 relative z-20" />
            <span className="relative z-20">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
};

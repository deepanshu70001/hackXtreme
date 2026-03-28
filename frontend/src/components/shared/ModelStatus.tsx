import React from 'react';
import { useModelStore } from '../../store/useModelStore';
import { motion } from 'motion/react';

export const ModelStatus: React.FC = () => {
  const { isReady, progress, status, engineLabel, runtimeLabel } = useModelStore();
  const hasFailure = !isReady && runtimeLabel.toLowerCase() === 'unavailable';

  return (
    <div className="border-b border-white/10 bg-slate-950/40 px-4 py-3 backdrop-blur-xl md:px-6">
      <div className="flex flex-wrap items-center gap-3 md:gap-4">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
          <div
            className={`h-2 w-2 rounded-full ${
              isReady
                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                : hasFailure
                  ? 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]'
                  : 'animate-pulse bg-amber-400'
            }`}
          />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-secondary">
            Local model
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium uppercase tracking-wider text-text-secondary">
            {engineLabel} / {runtimeLabel}
          </span>
          <span className={`block truncate text-sm ${hasFailure ? 'text-rose-100' : 'text-white/80'}`}>
            {status}
          </span>
        </div>

        {!isReady && !hasFailure && (
          <div className="flex w-full items-center gap-3 md:w-auto">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10 md:w-48">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-accent-primary to-accent-tertiary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[11px] font-medium text-text-secondary">{Math.round(progress)}%</span>
          </div>
        )}

        {hasFailure && (
          <div className="rounded-full border border-rose-400/15 bg-rose-400/10 px-3 py-1.5 text-[11px] font-medium text-rose-100">
            Full local model is unavailable in this browser session. Quick fallback generation is still available.
          </div>
        )}
      </div>
    </div>
  );
};

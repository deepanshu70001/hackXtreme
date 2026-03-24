import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { CopyButton } from '../shared/CopyButton';
import { Mail, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export const EmailTab: React.FC = () => {
  const { result } = useAppStore();

  if (!result) return null;

  const emailContent = result.followUpEmail?.trim();

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h3 className="text-xl font-black text-white flex items-center gap-3">
          <div className="p-2 bg-violet-500/20 rounded-xl text-violet-400">
            <Mail className="w-5 h-5" />
          </div>
          Follow-Up Email
        </h3>
        {emailContent ? <CopyButton text={emailContent} /> : null}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass rounded-[32px] p-8 relative overflow-hidden group"
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-500 to-transparent" />

        {emailContent ? (
          <pre className="whitespace-pre-wrap text-sm leading-8 text-white/90 font-sans">
            {emailContent}
          </pre>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <div className="p-3 bg-white/5 rounded-2xl">
              <Sparkles className="w-6 h-6 text-violet-400/60" />
            </div>
            <p className="text-sm text-text-secondary max-w-md">
              No follow-up email was generated. Add more context or try a longer source for a richer result.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

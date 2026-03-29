import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Brain, RotateCcw, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const FlashcardsTab: React.FC = () => {
  const { result } = useAppStore();
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null);

  if (!result) return null;

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-white flex items-center gap-3">
          <div className="p-2 bg-accent-tertiary/20 rounded-xl text-accent-tertiary">
            <Brain className="w-5 h-5" />
          </div>
          Flashcards
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFlippedIndex(null)}
            className="p-2 hover:bg-white/5 rounded-xl text-text-secondary hover:text-white transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
        {result.flashcards.length === 0 ? (
          <div className="glass rounded-[28px] border border-white/10 p-6 text-sm text-text-secondary">
            No flashcards generated yet. Add more detailed source material for stronger recall prompts.
          </div>
        ) : (
          result.flashcards.map((card, i) => (
            <div
              key={i}
              className="perspective-1000 h-48 cursor-pointer group"
              onClick={() => setFlippedIndex(flippedIndex === i ? null : i)}
            >
              <motion.div
                initial={false}
                animate={{ rotateY: flippedIndex === i ? 180 : 0 }}
                transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
                className="relative w-full h-full preserve-3d"
              >
                <div className="absolute inset-0 backface-hidden glass rounded-[32px] p-6 flex flex-col items-center justify-center text-center border border-white/10 group-hover:border-accent-tertiary/30 transition-colors">
                  <div className="absolute top-4 left-4 text-[10px] font-bold text-accent-tertiary uppercase tracking-widest opacity-50">Question</div>
                  <p className="text-sm font-bold text-white leading-relaxed">
                    {card.question}
                  </p>
                  <div className="absolute bottom-4 right-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1">
                    Click to flip <ChevronRight className="w-3 h-3" />
                  </div>
                </div>

                <div
                  className="absolute inset-0 backface-hidden glass rounded-[32px] p-6 flex flex-col items-center justify-center text-center border border-accent-tertiary/30 bg-accent-tertiary/5"
                  style={{ transform: 'rotateY(180deg)' }}
                >
                  <div className="absolute top-4 left-4 text-[10px] font-bold text-accent-tertiary uppercase tracking-widest">Answer</div>
                  <p className="text-sm font-medium text-white/90 leading-relaxed">
                    {card.answer}
                  </p>
                  <div className="absolute bottom-4 left-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1">
                    <ChevronLeft className="w-3 h-3" /> Click to return
                  </div>
                </div>
              </motion.div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface StreamingTextProps {
  text: string;
  speed?: number;
}

export const StreamingText: React.FC<StreamingTextProps> = ({ text, speed = 20 }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + text.charAt(i));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <div className="whitespace-pre-wrap">
      {displayedText}
      <motion.span
        animate={{ opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 0.8 }}
        className="inline-block w-1 h-4 bg-emerald-500 ml-1"
      />
    </div>
  );
};

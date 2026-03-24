import React, { useState } from 'react';
import { AlertCircle, Check, Copy } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  className?: string;
}

const fallbackCopy = (value: string) => {
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const didCopy = document.execCommand('copy');
  textarea.remove();
  return didCopy;
};

export const CopyButton: React.FC<CopyButtonProps> = ({ text, className = '' }) => {
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle');

  const handleCopy = async () => {
    if (!text.trim()) {
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (!fallbackCopy(text)) {
        throw new Error('Fallback clipboard copy failed.');
      }

      setCopyState('success');
    } catch (error) {
      console.error(error);
      setCopyState('error');
    } finally {
      setTimeout(() => setCopyState('idle'), 2200);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`rounded-lg p-2 transition-colors hover:bg-white/10 ${className}`}
      title={copyState === 'error' ? 'Clipboard blocked by browser permissions' : 'Copy to clipboard'}
    >
      {copyState === 'success' ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : copyState === 'error' ? (
        <AlertCircle className="h-4 w-4 text-rose-300" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
};

import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
  };

  const colors = {
    success: 'border-emerald-500/20 bg-emerald-500/5',
    error: 'border-rose-500/20 bg-rose-500/5',
    info: 'border-blue-500/20 bg-blue-500/5',
  };

  return (
    <div className={`fixed bottom-8 right-8 flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl z-[100] animate-in slide-in-from-right-8 duration-300 ${colors[type]}`}>
      {icons[type]}
      <span className="text-sm font-medium text-white">{message}</span>
      <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
        <X className="w-4 h-4 text-text-secondary" />
      </button>
    </div>
  );
};

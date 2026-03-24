import React from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { exportToJSON, exportToText } from '../../lib/utils/exporters';
import { useAppStore } from '../../store/useAppStore';

export const ExportButton: React.FC = () => {
  const { result } = useAppStore();
  const [isOpen, setIsOpen] = React.useState(false);

  if (!result) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all"
      >
        <Download className="w-3.5 h-3.5" />
        Export
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-40 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => { exportToText(result, 'copilot-insights'); setIsOpen(false); }}
              className="w-full px-4 py-3 text-left text-xs text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
            >
              Download as .TXT
            </button>
            <button
              onClick={() => { exportToJSON(result, 'copilot-insights'); setIsOpen(false); }}
              className="w-full px-4 py-3 text-left text-xs text-text-secondary hover:text-white hover:bg-white/5 transition-colors border-t border-white/5"
            >
              Download as .JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
};

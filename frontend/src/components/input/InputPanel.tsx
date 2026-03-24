import React, { useDeferredValue } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ShieldCheck, FileText, Youtube, Type, Sparkles, Loader2, Mic, Trash2, Cpu, ScanSearch, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useModelStore } from '../../store/useModelStore';
import { useLocalCopilot } from '../../hooks/useLocalCopilot';
import { PDFUpload } from './PDFUpload';
import { YouTubeInput } from './YouTubeInput';
import { ModeSelector } from './ModeSelector';

export const InputPanel: React.FC = () => {
  const {
    input,
    sourceContent,
    setInput,
    setSourceContent,
    sourceType,
    sourceLabel,
    setSource,
    isProcessing,
    error,
    setError,
    clearWorkspace,
  } = useAppStore();
  const { isReady, status, engineLabel, runtimeLabel } = useModelStore();
  const { processInput, cancelProcessing } = useLocalCopilot();
  const effectiveInput = input.trim().length > 0 ? input : sourceContent;
  const deferredInput = useDeferredValue(effectiveInput);
  const deferredWordCount = deferredInput.trim() ? deferredInput.trim().split(/\s+/).length : 0;
  const deferredCharacterCount = deferredInput.length;
  const hasAnySource = input.trim().length > 0 || sourceContent.trim().length > 0;
  const usingAttachedSource = input.trim().length === 0 && sourceContent.trim().length > 0;

  const handleProcess = async () => {
    try {
      await processInput();
    } catch {
      // Error state is already pushed into the store for the UI banner.
    }
  };

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6 custom-scrollbar no-scrollbar md:p-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col gap-3"
      >
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.35em] text-accent-primary/90">
          <span className="h-2 w-2 rounded-full bg-accent-primary shadow-[0_0_16px_rgba(56,189,248,0.65)]" />
          Workspace
        </div>
        <div className="space-y-2">
          <h2 className="flex items-center gap-3 text-3xl font-black tracking-tight text-white">
            <div className="h-10 w-1 rounded-full bg-gradient-to-b from-accent-primary via-accent-tertiary to-transparent" />
            Input Source
          </h2>
          <p className="max-w-xl pl-4 text-sm leading-7 text-text-secondary">
            Drop in notes, PDFs, or transcripts and keep the whole workflow on-device. The source controls now stay readable instead of collapsing into narrow columns.
          </p>
        </div>
      </motion.div>

      <div className="flex flex-1 flex-col gap-6">
        <div className="glass rounded-[28px] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
          <ModeSelector />
        </div>

        {/* Source Selection */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 gap-4"
        >
          <div className="glass group flex flex-col gap-4 rounded-[28px] p-6 shadow-[0_12px_36px_rgba(0,0,0,0.14)] transition-all hover:bg-white/[0.05]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-primary/20 rounded-xl text-accent-primary">
                <FileText className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="block text-xs font-bold uppercase tracking-widest text-white">PDF Document</span>
                <span className="block text-[11px] text-text-secondary">Extract text locally from uploaded files.</span>
              </div>
            </div>
            <PDFUpload
              onExtract={({ text, label }) => {
                setInput('');
                setSourceContent(text);
                setSource('pdf', label);
                setError(null);
              }}
              onError={setError}
            />
          </div>

          <div className="glass group flex flex-col gap-4 rounded-[28px] p-6 shadow-[0_12px_36px_rgba(0,0,0,0.14)] transition-all hover:bg-white/[0.05]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-secondary/20 rounded-xl text-accent-secondary">
                <Youtube className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="block text-xs font-bold uppercase tracking-widest text-white">YouTube Transcript</span>
                <span className="block text-[11px] text-text-secondary">Paste captions from a video or browser extension.</span>
              </div>
            </div>
            <YouTubeInput
              onExtract={({ text, label }) => {
                setInput('');
                setSourceContent(text);
                setSource('youtube', label);
                setError(null);
              }}
              onError={setError}
            />
          </div>

          <div className="glass flex flex-col gap-4 rounded-[28px] p-6 shadow-[0_12px_36px_rgba(0,0,0,0.14)]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-tertiary/20 rounded-xl text-accent-tertiary">
                <Cpu className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="block text-xs font-bold uppercase tracking-widest text-white">Local Runtime</span>
                <span className="block text-[11px] text-text-secondary">Current browser AI status and fallback details.</span>
              </div>
            </div>
            <div className="grid gap-3 text-sm text-text-secondary md:grid-cols-2">
              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                <span>Engine</span>
                <span className="max-w-[60%] break-words text-right font-medium text-white">{engineLabel}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                <span>Runtime</span>
                <span className={`font-medium ${isReady ? 'text-accent-tertiary' : 'text-white'}`}>{runtimeLabel}</span>
              </div>
              <div className={`rounded-2xl px-4 py-3 text-xs leading-relaxed md:col-span-2 ${
                isReady
                  ? 'border border-accent-tertiary/15 bg-accent-tertiary/10 text-white/80'
                  : 'border border-amber-400/15 bg-amber-400/10 text-amber-100'
              }`}>
                {status}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Input Area */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass group relative flex min-h-[360px] flex-1 flex-col gap-6 overflow-hidden rounded-[36px] p-6 md:p-8"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
            <Sparkles className="w-16 h-16 text-accent-tertiary" />
          </div>
          <div className="pointer-events-none absolute inset-x-8 bottom-0 h-28 rounded-full bg-accent-primary/10 blur-3xl opacity-80" />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/10">
              <Type className="w-4 h-4 text-accent-tertiary" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Content Editor</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={clearWorkspace}
                className="p-2 hover:bg-rose-500/10 rounded-xl text-text-secondary hover:text-rose-500 transition-all"
                title="Clear Content"
                disabled={isProcessing}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-text-secondary" title="Voice input coming soon">
                <Mic className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="flex-1 relative z-10">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError(null);
                if (e.target.value.trim().length > 0) {
                  setSource('text', 'Manual paste');
                }
              }}
              placeholder="Optional editor: paste notes, transcript, or source text. If empty, generation uses attached PDF/YouTube source."
              className="custom-scrollbar h-full w-full resize-none bg-transparent text-sm leading-8 text-white/90 focus:outline-none placeholder:text-text-secondary/35 md:text-base"
            />
          </div>

          {usingAttachedSource && (
            <div className="relative z-10 rounded-2xl border border-accent-primary/20 bg-accent-primary/10 px-4 py-3 text-xs leading-6 text-sky-100">
              Editor is empty. Generation will use attached source: <span className="font-semibold">{sourceLabel}</span>.
            </div>
          )}

          {error && (
            <div className="relative z-10 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100">
              {error}
            </div>
          )}

          <div className="relative z-10 flex flex-col gap-4 border-t border-white/5 pt-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Characters</span>
                <span className="text-xs font-mono text-white">{deferredCharacterCount}</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Words</span>
                <span className="text-xs font-mono text-white">{deferredWordCount}</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Source</span>
                <span className="text-xs font-mono text-white">{usingAttachedSource ? `${sourceLabel} (attached)` : sourceLabel}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-bold text-accent-tertiary uppercase tracking-widest text-right">
              <ShieldCheck className="w-4 h-4" />
              AI stays local
            </div>
          </div>
        </motion.div>

        {/* Generate Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(59,130,246,0.2)" }}
          whileTap={{ scale: 0.98 }}
          onClick={isProcessing ? cancelProcessing : handleProcess}
          disabled={!isProcessing && !hasAnySource}
          className="relative group overflow-hidden rounded-[30px] bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-tertiary p-5 text-sm font-black uppercase tracking-[0.28em] text-white shadow-[0_24px_50px_rgba(20,184,166,0.22)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
          <div className="relative flex items-center justify-center gap-4">
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, rotate: -180 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 180 }}
                  className="flex items-center gap-3"
                >
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <Square className="w-4 h-4 fill-current" />
                </motion.div>
              ) : (
                <motion.div
                  key="sparkles"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <Sparkles className="w-6 h-6" />
                </motion.div>
              )}
            </AnimatePresence>
            <span>{isProcessing ? 'Stop Generation' : 'Generate Insights'}</span>
          </div>
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass flex items-start gap-4 rounded-[28px] p-5"
        >
          <div className="p-2 bg-white/5 rounded-xl text-accent-tertiary">
            <ScanSearch className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-sm text-text-secondary leading-relaxed">
            <p className="text-white font-semibold">Hackathon MVP scope</p>
            <p>Summary, action items, flashcards, and PPT outline are generated from text, PDF, and pasted YouTube transcripts using only the browser SDK.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

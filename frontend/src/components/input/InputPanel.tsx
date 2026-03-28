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
    setYouTubeTimeline,
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
    <div className="flex h-full min-h-[34rem] flex-col gap-6 overflow-y-auto p-5 custom-scrollbar no-scrollbar md:p-8">
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
                setYouTubeTimeline([]);
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
              onExtract={({ text, label, timeline }) => {
                setInput('');
                setSourceContent(text);
                setYouTubeTimeline(timeline);
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
          className="glass group relative flex min-h-[360px] flex-1 flex-col gap-6 overflow-hidden rounded-3xl p-6 md:p-8"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <Sparkles className="w-16 h-16 text-white" />
          </div>

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
              <Type className="w-3.5 h-3.5 text-white/70" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Editor</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={clearWorkspace}
                className="p-2 hover:bg-white/10 rounded-xl text-text-secondary hover:text-white transition-all"
                title="Clear Content"
                disabled={isProcessing}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2 text-text-secondary/50 cursor-not-allowed" title="Voice input coming soon">
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
              placeholder="Paste notes, transcript, or type here. If empty, generation uses the selected source file."
              className="custom-scrollbar h-full w-full resize-none bg-transparent text-sm leading-8 text-white/90 focus:outline-none placeholder:text-text-secondary/30 md:text-base font-light"
            />
          </div>

          {usingAttachedSource && (
            <div className="relative z-10 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs leading-6 text-white/80">
              Editor is empty. Generation will use attached source: <span className="font-semibold text-white">{sourceLabel}</span>.
            </div>
          )}

          {error && (
            <div className="relative z-10 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">
              {error}
            </div>
          )}

          <div className="relative z-10 flex flex-col gap-4 border-t border-white/5 pt-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-text-secondary">Characters</span>
                <span className="text-xs font-mono text-white/90">{deferredCharacterCount}</span>
              </div>
              <div className="w-px h-6 bg-white/5" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-text-secondary">Words</span>
                <span className="text-xs font-mono text-white/90">{deferredWordCount}</span>
              </div>
              <div className="w-px h-6 bg-white/5" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-text-secondary">Source</span>
                <span className="text-xs font-medium text-white/90 truncate max-w-[150px]">{usingAttachedSource ? `${sourceLabel} (attached)` : sourceLabel}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[9px] font-semibold text-text-secondary uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 opacity-70" />
              On-device Processing
            </div>
          </div>
        </motion.div>

        {/* Generate Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.01, boxShadow: "0 0 30px rgba(255,255,255,0.05)" }}
          whileTap={{ scale: 0.99 }}
          onClick={isProcessing ? cancelProcessing : handleProcess}
          disabled={!isProcessing && !hasAnySource}
          className="relative group overflow-hidden rounded-2xl bg-white text-black p-4 text-sm font-bold uppercase tracking-widest shadow-xl disabled:cursor-not-allowed disabled:opacity-50 transition-all border border-transparent hover:bg-gray-100"
        >
          <div className="relative flex items-center justify-center gap-3">
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, rotate: -180 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 180 }}
                  className="flex items-center gap-2"
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <Square className="w-3.5 h-3.5 fill-current" />
                </motion.div>
              ) : (
                <motion.div
                  key="sparkles"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <Sparkles className="w-5 h-5" />
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
            <p>Summary, action items, follow-up emails, flashcards, and PPT outline are generated from text, PDF, and pasted YouTube transcripts using only the browser SDK.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

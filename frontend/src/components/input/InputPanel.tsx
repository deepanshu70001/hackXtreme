import React, { useDeferredValue, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { FileText, Youtube, Type, Sparkles, Loader2, Trash2, Cpu, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useModelStore } from '../../store/useModelStore';
import { useLocalCopilot } from '../../hooks/useLocalCopilot';
import { PDFUpload } from './PDFUpload';
import { YouTubeInput } from './YouTubeInput';
import { ModeSelector } from './ModeSelector';
import { composeSourceContent, getComposedSourceLabel, hasManualAndAttachedSource } from '../../lib/utils/sourceComposer';

export const InputPanel: React.FC = () => {
  const {
    input,
    sourceContent,
    generationTrigger,
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
  const effectiveInput = composeSourceContent({
    input,
    sourceContent,
    sourceType,
    sourceLabel,
  });
  const deferredInput = useDeferredValue(effectiveInput);
  const deferredWordCount = deferredInput.trim() ? deferredInput.trim().split(/\s+/).length : 0;
  const deferredCharacterCount = deferredInput.length;
  const hasAnySource = input.trim().length > 0 || sourceContent.trim().length > 0;
  const usingAttachedSource = input.trim().length === 0 && sourceContent.trim().length > 0;
  const usingCombinedSources = hasManualAndAttachedSource(input, sourceContent);
  const composedSourceLabel = getComposedSourceLabel({ input, sourceContent, sourceLabel });

  const handleProcess = async () => {
    try {
      await processInput();
    } catch {}
  };

  useEffect(() => {
    if (generationTrigger <= 0) return;
    void handleProcess();
  }, [generationTrigger]);

  return (
    <div className="flex h-full min-h-[28rem] flex-col gap-5 overflow-y-auto p-4 custom-scrollbar no-scrollbar sm:min-h-[32rem] md:gap-6 md:p-8 lg:min-h-0">
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
          <h2 className="flex items-center gap-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
            <div className="h-10 w-1 rounded-full bg-gradient-to-b from-accent-primary via-accent-tertiary to-transparent" />
            Input Source
          </h2>
          <p className="max-w-xl pl-4 text-sm leading-7 text-text-secondary">
            Add notes, PDFs, or transcripts, then generate a clean structured output from your source content.
          </p>
        </div>
      </motion.div>

      <div className="flex flex-1 flex-col gap-6">
        <div className="glass rounded-[28px] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
          <ModeSelector />
        </div>

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
                <span className="block text-[11px] text-text-secondary">Upload a PDF and extract text automatically.</span>
              </div>
            </div>
            <PDFUpload
              onExtract={({ text, label }) => {
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
                <span className="block text-xs font-bold uppercase tracking-widest text-white">System Status</span>
                <span className="block text-[11px] text-text-secondary">Current engine, runtime, and generation state.</span>
              </div>
            </div>
            <div className="grid gap-3 text-sm text-text-secondary sm:grid-cols-2">
              <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                <span>Engine</span>
                <span className="max-w-[70%] break-words text-right font-medium text-white">{engineLabel}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                <span>Runtime</span>
                <span className={`font-medium ${isReady ? 'text-accent-tertiary' : 'text-white'}`}>{runtimeLabel}</span>
              </div>
              <div className={`rounded-2xl px-4 py-3 text-xs leading-relaxed sm:col-span-2 ${
                isReady
                  ? 'border border-accent-tertiary/15 bg-accent-tertiary/10 text-white/80'
                  : 'border border-amber-400/15 bg-amber-400/10 text-amber-100'
              }`}>
                {status}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass group relative flex min-h-[320px] flex-1 flex-col gap-6 overflow-hidden rounded-3xl p-5 sm:min-h-[360px] md:p-8"
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
            </div>
          </div>

          <div className="flex-1 relative z-10">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError(null);
                if (e.target.value.trim().length > 0 && sourceContent.trim().length === 0) {
                  setSource('text', 'Manual paste');
                }
              }}
              placeholder="Paste notes or transcript here. If empty, generation uses the selected source file."
              className="custom-scrollbar h-full w-full resize-none bg-transparent text-sm leading-7 text-white/90 focus:outline-none placeholder:text-text-secondary/30 md:text-base font-light"
            />
          </div>

          {usingAttachedSource && (
            <div className="relative z-10 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs leading-6 text-white/80">
              Editor is empty. Generation will use attached source: <span className="font-semibold text-white">{sourceLabel}</span>.
            </div>
          )}
          {usingCombinedSources && (
            <div className="relative z-10 rounded-xl border border-accent-secondary/25 bg-accent-secondary/10 px-4 py-3 text-xs leading-6 text-white/85">
              Generation will combine your editor notes with attached source: <span className="font-semibold text-white">{sourceLabel}</span>.
            </div>
          )}

          {error && (
            <div className="relative z-10 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">
              {error}
            </div>
          )}

          <div className="relative z-10 flex flex-col gap-4 border-t border-white/5 pt-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid grid-cols-2 gap-x-5 gap-y-2 sm:flex sm:flex-wrap sm:items-center sm:gap-5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-text-secondary">Characters</span>
                <span className="text-xs font-mono text-white/90">{deferredCharacterCount}</span>
              </div>
              <div className="hidden h-6 w-px bg-white/5 sm:block" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-text-secondary">Words</span>
                <span className="text-xs font-mono text-white/90">{deferredWordCount}</span>
              </div>
              <div className="hidden h-6 w-px bg-white/5 sm:block" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-text-secondary">Source</span>
                <span className="max-w-[180px] truncate text-xs font-medium text-white/90 sm:max-w-[220px]">
                  {usingAttachedSource ? `${sourceLabel} (attached)` : composedSourceLabel}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[9px] font-semibold text-text-secondary uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-tertiary/80" />
              Secure Processing
            </div>
          </div>
        </motion.div>

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
            <span>{isProcessing ? 'Stop Generation' : 'Generate Output'}</span>
          </div>
        </motion.button>
      </div>
    </div>
  );
};

import { startTransition, useEffect, useRef } from 'react';
import {
  formatRunAnywhereError,
  generateCopilotResponse,
  generateQuickCopilotResponse,
  shouldAutoWarmupModel,
  shouldUseQuickDraftBeforeWarmup,
  warmupLocalModel,
} from '../lib/ai/runAnywhere';
import { composeSourceContent, getComposedSourceLabel } from '../lib/utils/sourceComposer';
import { useAppStore } from '../store/useAppStore';
import { useModelStore } from '../store/useModelStore';
import { GenerationResult } from '../types/ai.types';

const MAX_REFINEMENT_MS_READY = 35_000;
const MAX_REFINEMENT_MS_COLD_START = 240_000;
const QUICK_FALLBACK_ERROR_PATTERN = /download|network|fetch|unavailable|cross-origin|module script/i;

export const useLocalCopilot = () => {
  const {
    input,
    sourceContent,
    generationRequest,
    mode,
    sourceType,
    sourceLabel,
    setProcessing,
    setResult,
    addToHistory,
    setError,
    setGenerationRequest,
  } =
    useAppStore();
  const { isReady, setReady, setProgress, setStatus, setEngine } = useModelStore();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let isMounted = true;

    const boot = async () => {
      const shouldWarmupImmediately = shouldAutoWarmupModel();
      if (!shouldWarmupImmediately) {
        setEngine('Core Engine', 'On-Demand');
        setReady(false);
        setProgress(0);
        setStatus('Adaptive mode enabled. Engine warmup is deferred until needed for smoother mobile usage.');
        return;
      }

      setReady(false);
      setProgress(8);
      setStatus('Loading processing engine');

      try {
        const state = await warmupLocalModel({
          onProgress: (status, progress) => {
            if (!isMounted) return;
            setStatus(status);
            setProgress(progress);
          },
        });

        if (!isMounted) return;

        setEngine(state.engineLabel, state.runtimeLabel);
        setReady(state.ready);
        setProgress(100);
        setStatus(state.status);
      } catch (error) {
        console.error(error);
        if (!isMounted) return;

        const message = formatRunAnywhereError(error);
        setEngine('Core Engine', 'Unavailable');
        setReady(false);
        setProgress(0);
        setStatus(`${message} The app will retry initialization on demand.`);
      }
    };

    void boot();

    return () => {
      isMounted = false;
    };
  }, [setEngine, setProgress, setReady, setStatus]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  const processInput = async () => {
    const effectiveContent = composeSourceContent({
      input,
      sourceContent,
      sourceType,
      sourceLabel,
    });
    const effectiveSourceLabel = getComposedSourceLabel({
      input,
      sourceContent,
      sourceLabel,
    });

    if (!effectiveContent.trim()) {
      setError('Add content in the editor or provide a PDF/YouTube source before generating.');
      setStatus('No source content found. Upload a PDF, add a YouTube source, or paste text.');
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let timedOut = false;
    let storedResult: GenerationResult | null = null;
    const timeoutLimit = isReady ? MAX_REFINEMENT_MS_READY : MAX_REFINEMENT_MS_COLD_START;
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutLimit);
    const shouldUseAdaptiveQuickDraft = !isReady && shouldUseQuickDraftBeforeWarmup(effectiveContent);

    setProcessing(true);
    setError(null);
    setProgress(12);

    try {
      setStatus('Preparing engine for generation...');
      setProgress(45);

      if (!isReady && !shouldUseAdaptiveQuickDraft) {
        setStatus('Preparing engine for first full generation...');
        setProgress(52);
        const state = await warmupLocalModel({
          onProgress: (status, progress) => {
            setStatus(status);
            setProgress(progress);
          },
        });
        setEngine(state.engineLabel, state.runtimeLabel);
        setReady(state.ready);
      } else if (shouldUseAdaptiveQuickDraft) {
        setEngine('Quick Draft', 'Adaptive');
        setReady(false);
        setStatus('Adaptive quick draft enabled for this input to keep your device responsive.');
        setProgress(55);
      }

      const result = await generateCopilotResponse({
        content: effectiveContent,
        mode,
        sourceType,
        sourceLabel: effectiveSourceLabel,
        focusRequest: generationRequest.trim() || undefined,
        onProgress: (status, progress) => {
          setStatus(status);
          setProgress(progress);
        },
        signal: controller.signal,
      });

      storedResult = result;
      startTransition(() => {
        setResult(result);
      });
      if (result.meta.quickDraft) {
        setEngine('Quick Draft', 'Adaptive');
        setReady(false);
      }
      setStatus('Processing complete');
      setProgress(100);
    } catch (error) {
      const message = formatRunAnywhereError(error);
      const shouldFallbackToQuickDraft =
        !timedOut && message !== 'Generation canceled.' && QUICK_FALLBACK_ERROR_PATTERN.test(message);

      if (timedOut) {
        const timeoutFallback = generateQuickCopilotResponse({
          content: effectiveContent,
          mode,
          sourceType,
          sourceLabel: effectiveSourceLabel,
          focusRequest: generationRequest.trim() || undefined,
        });
        storedResult = timeoutFallback;
        startTransition(() => {
          setResult(timeoutFallback);
        });
        setStatus('Core generation timed out. A quick draft was generated to avoid losing output.');
        setProgress(100);
        setError(null);
      } else if (message === 'Generation canceled.') {
        setStatus('Generation canceled.');
      } else if (shouldFallbackToQuickDraft) {
        setEngine('Quick Draft', 'Fallback');
        setReady(false);
        const quickFallback = generateQuickCopilotResponse({
          content: effectiveContent,
          mode,
          sourceType,
          sourceLabel: effectiveSourceLabel,
          focusRequest: generationRequest.trim() || undefined,
        });
        storedResult = quickFallback;
        startTransition(() => {
          setResult(quickFallback);
        });
        setStatus('Primary engine unavailable. Generated a quick draft while retries remain available.');
        setProgress(100);
        setError(null);
      } else {
        setStatus(message);
      }

      if (message !== 'Generation canceled.' && !shouldFallbackToQuickDraft) {
        console.error(error);
        setError(message);
        throw error;
      }
    } finally {
      clearTimeout(timeoutHandle);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }

      if (storedResult) {
        addToHistory(storedResult.title || `${storedResult.meta.sourceLabel} / ${mode}`, storedResult);
      }

      setGenerationRequest('');
      setProcessing(false);
    }
  };

  const cancelProcessing = () => {
    if (!abortControllerRef.current) {
      return;
    }

    setStatus('Canceling generation...');
    abortControllerRef.current.abort();
  };

  return {
    processInput,
    cancelProcessing,
  };
};

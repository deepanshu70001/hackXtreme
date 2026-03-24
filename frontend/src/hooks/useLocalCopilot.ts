import { startTransition, useEffect, useRef } from 'react';
import {
  formatRunAnywhereError,
  generateCopilotResponse,
  generateQuickCopilotResponse,
  warmupLocalModel,
} from '../lib/ai/runAnywhere';
import { useAppStore } from '../store/useAppStore';
import { useModelStore } from '../store/useModelStore';
import { GenerationResult } from '../types/ai.types';

const MAX_REFINEMENT_MS_READY = 35_000;
const MAX_REFINEMENT_MS_COLD_START = 120_000;

export const useLocalCopilot = () => {
  const { input, sourceContent, mode, sourceType, sourceLabel, setProcessing, setResult, addToHistory, setError } =
    useAppStore();
  const { isReady, setReady, setProgress, setStatus, setEngine } = useModelStore();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let isMounted = true;

    const boot = async () => {
      setReady(false);
      setProgress(8);
      setStatus('Loading RunAnywhere in the browser');

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

        setEngine('RunAnywhere SDK', 'Unavailable');
        setReady(false);
        setProgress(0);
        setStatus(formatRunAnywhereError(error));
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
    const effectiveContent = input.trim().length > 0 ? input : sourceContent;
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

    setProcessing(true);
    setError(null);
    setProgress(12);

    try {
      const quickResult = generateQuickCopilotResponse({
        content: effectiveContent,
        mode,
        sourceType,
        sourceLabel,
      });

      storedResult = quickResult;
      startTransition(() => {
        setResult(quickResult);
      });
      setStatus('Quick draft ready. Refining with RunAnywhere...');
      setProgress(45);

      if (!isReady) {
        setStatus('Quick draft ready. Preparing RunAnywhere model for first full refinement...');
        setProgress(52);
        const state = await warmupLocalModel({
          onProgress: (status, progress) => {
            setStatus(status);
            setProgress(progress);
          },
        });
        setEngine(state.engineLabel, state.runtimeLabel);
        setReady(state.ready);
      }

      const result = await generateCopilotResponse({
        content: effectiveContent,
        mode,
        sourceType,
        sourceLabel,
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
      setStatus('RunAnywhere refinement complete');
      setProgress(100);
    } catch (error) {
      const message = formatRunAnywhereError(error);

      if (timedOut) {
        setStatus('Quick draft ready. Full refinement timed out. Try shorter input for deeper AI output.');
      } else if (message === 'Generation canceled.') {
        setStatus('Generation canceled. Quick draft retained.');
      } else if (storedResult) {
        setStatus(`Quick draft ready. Full refinement failed: ${message}`);
      } else {
        setStatus(message);
      }

      if (!storedResult && message !== 'Generation canceled.') {
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
        addToHistory(`${storedResult.meta.sourceLabel} / ${mode}`, storedResult);
      }

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

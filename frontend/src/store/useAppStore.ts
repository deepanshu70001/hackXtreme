import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AppState, GenerationResult, HistoryItem, Mode, SourceType } from '../types/ai.types';

const MAX_HISTORY_ITEMS = 12;

const createHistoryId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      mode: 'work',
      input: '',
      sourceContent: '',
      sourceType: 'text',
      sourceLabel: 'Manual paste',
      youtubeTimeline: [],
      error: null,
      isProcessing: false,
      result: null,
      history: [],
      setMode: (mode: Mode) => set({ mode }),
      setInput: (input: string) => set({ input }),
      setSourceContent: (sourceContent: string) => set({ sourceContent }),
      setSource: (sourceType: SourceType, sourceLabel = 'Manual paste') =>
        set((state) => ({
          sourceType,
          sourceLabel,
          youtubeTimeline: sourceType === 'youtube' ? state.youtubeTimeline : [],
        })),
      setYouTubeTimeline: (youtubeTimeline) => set({ youtubeTimeline }),
      setError: (error: string | null) => set({ error }),
      setProcessing: (isProcessing: boolean) => set({ isProcessing }),
      setResult: (result: GenerationResult | null) => set({ result }),
      clearWorkspace: () =>
        set({
          input: '',
          sourceContent: '',
          sourceType: 'text',
          sourceLabel: 'Manual paste',
          youtubeTimeline: [],
          error: null,
          result: null,
        }),
      addToHistory: (title: string, result: GenerationResult) =>
        set((state) => {
          const normalizedTitle = title.trim() || 'Untitled capture';
          const dateLabel = new Date().toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          const nextItem: HistoryItem = {
            id: createHistoryId(),
            title: normalizedTitle,
            date: dateLabel,
            sourceType: result.meta.sourceType,
            result,
          };

          const dedupedHistory = state.history.filter(
            (item) =>
              !(
                item.title === normalizedTitle &&
                item.sourceType === result.meta.sourceType &&
                item.result.meta.generatedAt === result.meta.generatedAt &&
                item.result.summary === result.summary
              ),
          );

          return {
            history: [nextItem, ...dedupedHistory].slice(0, MAX_HISTORY_ITEMS),
          };
        }),
      loadHistoryItem: (item: HistoryItem) =>
        set({
          input: '',
          sourceContent: '',
          result: item.result,
          sourceType: item.sourceType,
          sourceLabel: item.result.meta.sourceLabel,
          youtubeTimeline: [],
          error: null,
        }),
    }),
    {
      name: 'local-ai-content-copilot-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        mode: state.mode,
        history: state.history,
      }),
    },
  ),
);

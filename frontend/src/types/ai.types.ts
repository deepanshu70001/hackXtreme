export type Mode = 'study' | 'work' | 'meeting';
export type SourceType = 'text' | 'pdf' | 'youtube';
export type ActionPriority = 'high' | 'medium' | 'low';
export type DeadlineConfidence = 'explicit' | 'inferred';
export type InferenceRuntime = 'webgpu' | 'wasm';

export interface YouTubeTimelineItem {
  startSeconds: number;
  timeLabel: string;
  title: string;
  summary: string;
  link?: string;
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface Slide {
  title: string;
  points: string[];
}

export interface ActionItem {
  task: string;
  priority: ActionPriority;
  deadline?: string;
}

export interface DeadlineItem {
  label: string;
  due: string;
  confidence: DeadlineConfidence;
}

export interface ResultMeta {
  engine: string;
  runtime: InferenceRuntime;
  sourceType: SourceType;
  sourceLabel: string;
  focusRequest?: string;
  generatedAt: string;
  wordCount: number;
  charCount: number;
  cached?: boolean;
  quickDraft?: boolean;
}

export interface GenerationResult {
  title: string;
  summary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  deadlines: DeadlineItem[];
  flashcards: Flashcard[];
  slides: Slide[];
  notes: string[];
  followUpEmail: string;
  meta: ResultMeta;
}

export interface HistoryItem {
  id: string;
  title: string;
  date: string;
  sourceType: SourceType;
  result: GenerationResult;
}

export interface AppState {
  mode: Mode;
  input: string;
  sourceContent: string;
  generationRequest: string;
  generationTrigger: number;
  sourceType: SourceType;
  sourceLabel: string;
  youtubeTimeline: YouTubeTimelineItem[];
  error: string | null;
  isProcessing: boolean;
  result: GenerationResult | null;
  history: HistoryItem[];
  setMode: (mode: Mode) => void;
  setInput: (input: string) => void;
  setSourceContent: (content: string) => void;
  setGenerationRequest: (request: string) => void;
  triggerGenerationFromOutput: () => void;
  setSource: (sourceType: SourceType, sourceLabel?: string) => void;
  setYouTubeTimeline: (timeline: YouTubeTimelineItem[]) => void;
  setError: (error: string | null) => void;
  setProcessing: (isProcessing: boolean) => void;
  setResult: (result: GenerationResult | null) => void;
  clearWorkspace: () => void;
  addToHistory: (title: string, result: GenerationResult) => void;
  loadHistoryItem: (item: HistoryItem) => void;
}

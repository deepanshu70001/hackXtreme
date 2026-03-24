import { GenerationResult, InferenceRuntime, Mode, SourceType } from '../../types/ai.types';
import { buildRunAnywherePrompt } from './prompts';

type ProgressCallback = (status: string, progress: number) => void;

interface WarmupResult {
  ready: boolean;
  engineLabel: string;
  runtimeLabel: string;
  runtime: InferenceRuntime;
  status: string;
}

interface GenerateOptions {
  content: string;
  mode: Mode;
  sourceType: SourceType;
  sourceLabel?: string;
  onProgress?: ProgressCallback;
  signal?: AbortSignal;
}

interface QuickGenerateOptions {
  content: string;
  mode: Mode;
  sourceType: SourceType;
  sourceLabel?: string;
}

interface ChatHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  question: string;
  context?: string;
  history?: ChatHistoryTurn[];
  signal?: AbortSignal;
}

const CACHE_PREFIX = 'local-ai-content-copilot::';
const CACHE_INDEX_KEY = `${CACHE_PREFIX}index`;
const CACHE_RECORD_VERSION = 2;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const CACHE_MAX_ENTRIES = 18;
const MODEL_ID = 'lfm2-350m-q4_k_m';
const MODEL_NAME = 'LFM2 350M Q4_K_M';
const MODEL_REPO = 'LiquidAI/LFM2-350M-GGUF';
const MODEL_FILES = ['LFM2-350M-Q4_K_M.gguf'];
const MAX_SOURCE_CHARACTERS = 3800;
const MAX_GENERATION_TOKENS = 512;
const MAX_CHAT_CONTEXT_CHARACTERS = 3200;
const MAX_CHAT_HISTORY_TURNS = 8;

interface CacheIndexEntry {
  key: string;
  updatedAt: number;
}

interface CacheRecord {
  version: number;
  createdAt: number;
  result: GenerationResult;
}

let runtime: InferenceRuntime = 'wasm';
let modulesPromise: Promise<{ core: Record<string, unknown>; llama: Record<string, unknown> }> | null = null;
let modelPromise: Promise<void> | null = null;

const reportProgress = (onProgress: ProgressCallback | undefined, status: string, progress: number) => {
  onProgress?.(status, Math.max(0, Math.min(100, progress)));
};

export const formatRunAnywhereError = (error: unknown) => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'Generation canceled.';
  }

  const message =
    error instanceof Error && error.message.trim().length > 0
      ? error.message.trim()
      : 'RunAnywhere generation failed. Please try again.';

  if (/dynamically imported module|failed to fetch|module script/i.test(message)) {
    return 'RunAnywhere assets did not load correctly. Restart the dev server so the SDK WASM files are served with the updated Vite config.';
  }

  if (/cross-origin|crossorigin|sharedarraybuffer|crossoriginisolated/i.test(message)) {
    return 'This browser session is missing the isolation features needed for local AI. Open the app through the local server instead of a file preview.';
  }

  if (/out of memory|memory/i.test(message)) {
    return 'The browser ran out of memory while loading the local model. Close heavy tabs and try again.';
  }

  if (/download|network|fetch/i.test(message)) {
    return 'The local model could not be downloaded or loaded in this browser session. Refresh and try again.';
  }

  return message;
};

const loadModules = async () => {
  if (!modulesPromise) {
    modulesPromise = Promise.all([
      import('@runanywhere/web'),
      import('@runanywhere/web-llamacpp'),
    ]).then(([core, llama]) => ({
      core: core as Record<string, unknown>,
      llama: llama as Record<string, unknown>,
    }));
  }

  return modulesPromise;
};

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
};

const makeCacheKey = ({ content, mode, sourceType }: Pick<GenerateOptions, 'content' | 'mode' | 'sourceType'>) =>
  `${CACHE_PREFIX}${mode}:${sourceType}:${hashString(content.trim())}`;

const isGenerationResult = (value: unknown): value is GenerationResult => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const result = value as GenerationResult;
  return (
    typeof result.summary === 'string' &&
    Array.isArray(result.keyPoints) &&
    Array.isArray(result.actionItems) &&
    Array.isArray(result.deadlines) &&
    Array.isArray(result.flashcards) &&
    Array.isArray(result.slides) &&
    Array.isArray(result.notes) &&
    typeof result.followUpEmail === 'string' &&
    typeof result.meta === 'object' &&
    result.meta !== null
  );
};

const removeCacheEntry = (key: string) => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove local cache key "${key}"`, error);
  }
};

const readCacheIndex = (): CacheIndexEntry[] => {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(CACHE_INDEX_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }

        const item = entry as Partial<CacheIndexEntry>;
        if (typeof item.key !== 'string' || typeof item.updatedAt !== 'number') {
          return null;
        }

        if (!item.key.startsWith(CACHE_PREFIX) || item.key === CACHE_INDEX_KEY) {
          return null;
        }

        return {
          key: item.key,
          updatedAt: item.updatedAt,
        };
      })
      .filter((entry): entry is CacheIndexEntry => entry !== null);
  } catch (error) {
    console.warn('Failed to read local cache index', error);
    return [];
  }
};

const writeCacheIndex = (entries: CacheIndexEntry[]) => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn('Failed to write local cache index', error);
  }
};

const pruneCacheIndex = (entries: CacheIndexEntry[]) => {
  const deduped = new Map<string, number>();

  for (const entry of entries) {
    const previous = deduped.get(entry.key);
    if (previous === undefined || entry.updatedAt > previous) {
      deduped.set(entry.key, entry.updatedAt);
    }
  }

  const cutoff = Date.now() - CACHE_TTL_MS;
  const sorted = [...deduped.entries()]
    .map(([key, updatedAt]) => ({ key, updatedAt }))
    .sort((left, right) => right.updatedAt - left.updatedAt);

  const kept: CacheIndexEntry[] = [];
  for (const entry of sorted) {
    const isExpired = entry.updatedAt < cutoff;
    const isOverflow = kept.length >= CACHE_MAX_ENTRIES;

    if (isExpired || isOverflow) {
      removeCacheEntry(entry.key);
      continue;
    }

    kept.push(entry);
  }

  writeCacheIndex(kept);
  return kept;
};

const touchCacheKey = (key: string) => {
  const current = readCacheIndex().filter((entry) => entry.key !== key);
  pruneCacheIndex([
    {
      key,
      updatedAt: Date.now(),
    },
    ...current,
  ]);
};

const readCache = (key: string) => {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;

    if (isGenerationResult(parsed)) {
      touchCacheKey(key);
      return parsed;
    }

    if (
      parsed &&
      typeof parsed === 'object' &&
      (parsed as CacheRecord).version === CACHE_RECORD_VERSION &&
      typeof (parsed as CacheRecord).createdAt === 'number' &&
      isGenerationResult((parsed as CacheRecord).result)
    ) {
      const record = parsed as CacheRecord;
      if (Date.now() - record.createdAt > CACHE_TTL_MS) {
        removeCacheEntry(key);
        pruneCacheIndex(readCacheIndex());
        return null;
      }

      touchCacheKey(key);
      return record.result;
    }

    removeCacheEntry(key);
    pruneCacheIndex(readCacheIndex());
    return null;
  } catch (error) {
    console.warn('Failed to read local result cache', error);
    removeCacheEntry(key);
    pruneCacheIndex(readCacheIndex());
    return null;
  }
};

const writeCache = (key: string, value: GenerationResult) => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    const record: CacheRecord = {
      version: CACHE_RECORD_VERSION,
      createdAt: Date.now(),
      result: value,
    };
    localStorage.setItem(key, JSON.stringify(record));
    touchCacheKey(key);
  } catch (error) {
    console.warn('Failed to write local result cache', error);
  }
};

const stripCodeFence = (value: string) =>
  value
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();

const tryParseJsonObject = (value: string) => {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
};

const parseRunAnywhereJson = (value: string) => {
  const stripped = stripCodeFence(value);
  const direct = tryParseJsonObject(stripped);
  if (direct) {
    return direct;
  }

  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end <= start) {
    return null;
  }

  const extracted = stripped.slice(start, end + 1).trim();
  const extractedDirect = tryParseJsonObject(extracted);
  if (extractedDirect) {
    return extractedDirect;
  }

  const normalized = extracted.replace(/,\s*([}\]])/g, '$1');
  return tryParseJsonObject(normalized);
};

const normalizeSourceText = (value: string) =>
  value
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const compressSourceText = (value: string) => {
  const normalized = normalizeSourceText(value);
  if (normalized.length <= MAX_SOURCE_CHARACTERS) {
    return normalized;
  }

  const head = normalized.slice(0, 2400).trim();
  const middleStart = Math.max(0, Math.floor(normalized.length / 2) - 700);
  const middle = normalized.slice(middleStart, middleStart + 1400).trim();
  const tail = normalized.slice(-1600).trim();

  return [
    '[Source excerpt: opening]',
    head,
    '[Source excerpt: middle]',
    middle,
    '[Source excerpt: closing]',
    tail,
  ].join('\n\n');
};

const splitSentences = (value: string) => {
  const matches = value.match(/[^.!?]+[.!?]?/g);
  return (matches ?? []).map((item) => item.trim()).filter(Boolean);
};

const uniqueItems = (items: string[]) => {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
};

const buildQuickSummary = (content: string) => {
  const sentences = splitSentences(content);
  if (sentences.length > 0) {
    return sentences.slice(0, 2).join(' ');
  }

  return content.slice(0, 320).trim();
};

const buildQuickKeyPoints = (content: string, summary: string) => {
  const lines = normalizeSourceText(content)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length >= 24 && line.length <= 180);

  const lineCandidates = lines
    .filter((line) => !/^(\[source excerpt|content:)/i.test(line))
    .slice(0, 8);

  if (lineCandidates.length > 0) {
    return uniqueItems(lineCandidates).slice(0, 4);
  }

  return uniqueItems(splitSentences(summary)).slice(0, 4);
};

const buildQuickActionItems = (content: string, keyPoints: string[]) => {
  const lines = normalizeSourceText(content).split('\n').map((line) => line.trim());
  const actionRegex = /\b(todo|action|follow up|follow-up|need to|should|must|next step|owner)\b/i;
  const deadlineRegex = /\b(by|before|due|deadline)\b/i;

  const inferred = lines
    .filter((line) => line.length >= 12 && line.length <= 180)
    .filter((line) => actionRegex.test(line))
    .slice(0, 4)
    .map((line) => ({
      task: line.replace(/^[-*]\s*/, '').trim(),
      priority: /urgent|asap|critical|blocker/i.test(line) ? 'high' as const : 'medium' as const,
      ...(deadlineRegex.test(line) ? { deadline: 'Mentioned in source' } : {}),
    }));

  if (inferred.length > 0) {
    return inferred;
  }

  return keyPoints.slice(0, 3).map((point) => ({
    task: `Review and act on: ${point}`,
    priority: 'medium' as const,
  }));
};

const buildQuickDeadlines = (content: string) => {
  const lines = normalizeSourceText(content).split('\n').map((line) => line.trim());
  const dateRegex =
    /\b(?:\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?)\b/i;

  return lines
    .filter((line) => line.length >= 10 && line.length <= 200)
    .filter((line) => dateRegex.test(line))
    .slice(0, 3)
    .map((line) => {
      const dateMatch = line.match(dateRegex);
      return {
        label: line.replace(dateRegex, '').replace(/\s{2,}/g, ' ').trim() || 'Deadline mentioned',
        due: dateMatch?.[0] ?? 'Date mentioned',
        confidence: 'inferred' as const,
      };
    });
};

const deriveNotes = (summary: string, keyPoints: string[]) => {
  if (keyPoints.length > 0) {
    return keyPoints.slice(0, 4);
  }

  return splitSentences(summary).slice(0, 4);
};

const deriveFlashcards = (summary: string, keyPoints: string[]) => {
  const cardsFromPoints = keyPoints.slice(0, 3).map((point, index) => ({
    question: `What is key point ${index + 1}?`,
    answer: point,
  }));

  const recap = summary.trim()
    ? [{ question: 'What is the main takeaway?', answer: splitSentences(summary).slice(0, 2).join(' ') || summary }]
    : [];

  return [...cardsFromPoints, ...recap].slice(0, 4);
};

const deriveSlides = (summary: string, keyPoints: string[]) => {
  const summarySentences = splitSentences(summary);
  const overviewPoints = (summarySentences.length > 0 ? summarySentences : keyPoints).slice(0, 3);

  const overview = overviewPoints.length
    ? [{ title: 'Overview', points: overviewPoints }]
    : [];

  const detail = keyPoints.slice(0, 3).map((point, index) => ({
    title: `Key Point ${index + 1}`,
    points: [point],
  }));

  return [...overview, ...detail].slice(0, 4);
};

export const generateQuickCopilotResponse = ({
  content,
  mode,
  sourceType,
  sourceLabel = 'Manual paste',
}: QuickGenerateOptions): GenerationResult => {
  const prepared = compressSourceText(content.trim());
  const summary = buildQuickSummary(prepared);
  const keyPoints = buildQuickKeyPoints(prepared, summary);
  const actionItems = buildQuickActionItems(prepared, keyPoints);
  const deadlines = buildQuickDeadlines(prepared);
  const notes = deriveNotes(summary, keyPoints);
  const flashcards = deriveFlashcards(summary, keyPoints);
  const slides = deriveSlides(summary, keyPoints);

  return {
    title: `${sourceLabel} / Quick Draft`,
    summary,
    keyPoints,
    actionItems,
    deadlines,
    flashcards,
    slides,
    notes,
    followUpEmail: 'Quick draft does not include an email. Run the full refinement.',
    meta: {
      engine: 'Quick Local Draft',
      runtime,
      sourceType,
      sourceLabel,
      generatedAt: new Date().toISOString(),
      wordCount: summary.split(/\s+/).length + keyPoints.join(' ').split(/\s+/).length,
      charCount: summary.length + keyPoints.join('').length,
      quickDraft: true,
    },
  };
};

const normalizeResult = (
  raw: Record<string, unknown>,
  {
    sourceType,
    sourceLabel,
  }: {
    sourceType: SourceType;
    sourceLabel: string;
  },
): GenerationResult => {
  const title = typeof raw.title === 'string' && raw.title.trim().length > 0 
    ? raw.title.trim() 
    : `${sourceLabel} / ${sourceType}`;
  const summary = typeof raw.summary === 'string' ? raw.summary.trim() : '';
  const keyPointsSource = raw.key_points ?? raw.keyPoints;
  const actionItemsSource = raw.action_items ?? raw.actionItems;
  const deadlinesSource = raw.deadlines;

  const toStringArray = (value: unknown) =>
    Array.isArray(value)
      ? value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
      : [];

  const keyPoints = toStringArray(keyPointsSource).slice(0, 4);

  const actionItems = Array.isArray(actionItemsSource)
    ? actionItemsSource
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const entry = item as Record<string, unknown>;
          const task = typeof entry.task === 'string' ? entry.task.trim() : '';
          const priority = entry.priority === 'high' || entry.priority === 'low' ? entry.priority : 'medium';
          const deadline = typeof entry.deadline === 'string' ? entry.deadline.trim() : undefined;
          return task ? { task, priority, ...(deadline ? { deadline } : {}) } : null;
        })
        .filter(
          (item): item is { task: string; priority: 'high' | 'medium' | 'low'; deadline?: string } => item !== null,
        )
        .slice(0, 4)
    : [];

  const deadlines = Array.isArray(deadlinesSource)
    ? deadlinesSource
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const entry = item as Record<string, unknown>;
          const label = typeof entry.label === 'string' ? entry.label.trim() : '';
          const due = typeof entry.due === 'string' ? entry.due.trim() : '';
          const confidence = entry.confidence === 'inferred' ? 'inferred' : 'explicit';
          return label && due ? { label, due, confidence } : null;
        })
        .filter(
          (item): item is { label: string; due: string; confidence: 'explicit' | 'inferred' } => item !== null,
        )
        .slice(0, 3)
    : [];

  const flashcardsSource = raw.flashcards;
  const slidesSource = raw.slides;
  const emailSource = raw.follow_up_email ?? raw.followUpEmail;

  if (!summary) {
    throw new Error('RunAnywhere did not return the required `summary` field.');
  }

  const followUpEmail = typeof emailSource === 'string' ? emailSource.trim() : '';

  const flashcards = Array.isArray(flashcardsSource)
    ? flashcardsSource
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const entry = item as Record<string, unknown>;
          const question = typeof entry.question === 'string' ? entry.question.trim() : '';
          const answer = typeof entry.answer === 'string' ? entry.answer.trim() : '';
          return question && answer ? { question, answer } : null;
        })
        .filter((item): item is { question: string; answer: string } => item !== null)
        .slice(0, 4)
    : [];

  const slides = Array.isArray(slidesSource)
    ? slidesSource
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const entry = item as Record<string, unknown>;
          const title = typeof entry.title === 'string' ? entry.title.trim() : '';
          const points = Array.isArray(entry.points)
            ? entry.points.map((p) => (typeof p === 'string' ? p.trim() : '')).filter(Boolean)
            : [];
          return title && points.length > 0 ? { title, points } : null;
        })
        .filter((item): item is { title: string; points: string[] } => item !== null)
        .slice(0, 4)
    : [];

  const notes = deriveNotes(summary, keyPoints);

  return {
    title,
    summary,
    keyPoints,
    actionItems,
    deadlines,
    flashcards,
    slides,
    notes,
    followUpEmail,
    meta: {
      engine: 'RunAnywhere SDK',
      runtime,
      sourceType,
      sourceLabel,
      generatedAt: new Date().toISOString(),
      wordCount: summary.split(/\s+/).length + keyPoints.join(' ').split(/\s+/).length,
      charCount: summary.length + keyPoints.join('').length,
      quickDraft: false,
    },
  };
};

const getAccelerationRuntime = (llamaModule: Record<string, unknown>): InferenceRuntime => {
  const acceleration = String((llamaModule.LlamaCPP as { accelerationMode?: string } | undefined)?.accelerationMode ?? '')
    .toLowerCase()
    .trim();

  return acceleration === 'webgpu' ? 'webgpu' : 'wasm';
};

const ensureModelReady = async (onProgress?: ProgressCallback) => {
  if (!modelPromise) {
    modelPromise = (async () => {
      reportProgress(onProgress, 'Loading RunAnywhere SDK', 12);

      const { core, llama } = await loadModules();
      const detectCapabilities = core.detectCapabilities as
        | (() => Promise<{ hasWebGPU?: boolean; isCrossOriginIsolated?: boolean }>)
        | undefined;
      const RunAnywhere = core.RunAnywhere as
        | {
            initialize: (options: Record<string, unknown>) => Promise<void>;
            registerModels: (models: Array<Record<string, unknown>>) => void;
          }
        | undefined;
      const ModelManager = core.ModelManager as
        | {
            downloadModel: (modelId: string) => Promise<void>;
            loadModel: (modelId: string) => Promise<void>;
          }
        | undefined;
      const SDKEnvironment = core.SDKEnvironment as Record<string, unknown> | undefined;
      const ModelCategory = core.ModelCategory as Record<string, unknown> | undefined;
      const LLMFramework = core.LLMFramework as Record<string, unknown> | undefined;
      const EventBus = core.EventBus as
        | {
            shared?: {
              on?: (eventName: string, handler: (payload: Record<string, unknown>) => void) => (() => void) | void;
            };
          }
        | undefined;
      const LlamaCPP = llama.LlamaCPP as
        | {
            register: () => Promise<void>;
            accelerationMode?: string;
          }
        | undefined;

      if (!RunAnywhere || !ModelManager || !LlamaCPP) {
        throw new Error('RunAnywhere Web SDK exports were not available.');
      }

      if (detectCapabilities) {
        reportProgress(onProgress, 'Checking browser AI capabilities', 16);
        const capabilities = await detectCapabilities();
        if (capabilities.isCrossOriginIsolated === false) {
          reportProgress(onProgress, 'Cross-origin isolation unavailable, using limited compatibility mode', 18);
        } else if (capabilities.hasWebGPU) {
          reportProgress(onProgress, 'WebGPU available for faster local inference', 18);
        }
      }

      const isDev = Boolean(import.meta.env?.DEV);

      reportProgress(onProgress, 'Initializing RunAnywhere core', 20);
      await RunAnywhere.initialize({
        environment: isDev ? SDKEnvironment?.Development ?? 'development' : SDKEnvironment?.Production ?? 'production',
        debug: isDev,
      });

      reportProgress(onProgress, 'Registering llama.cpp browser backend', 32);
      await LlamaCPP.register();

      RunAnywhere.registerModels([
        {
          id: MODEL_ID,
          name: MODEL_NAME,
          repo: MODEL_REPO,
          files: MODEL_FILES,
          framework: LLMFramework?.LlamaCpp ?? 'llama.cpp',
          modality: ModelCategory?.Language ?? 'language',
          memoryRequirement: 250_000_000,
        },
      ]);

      const detachProgressListener = EventBus?.shared?.on?.(
        'model.downloadProgress',
        (payload: Record<string, unknown>) => {
          const progressValue = typeof payload.progress === 'number' ? payload.progress : 0;
          const modelId = typeof payload.modelId === 'string' ? payload.modelId : MODEL_ID;
          const percentage = Math.max(0, Math.min(100, Math.round(progressValue * 100)));
          reportProgress(onProgress, `Caching ${modelId} locally (${percentage}%)`, 32 + Math.round(percentage * 0.42));
        },
      );

      try {
        reportProgress(onProgress, 'Downloading or reusing local model cache', 44);
        await ModelManager.downloadModel(MODEL_ID);

        reportProgress(onProgress, 'Loading model into browser memory', 86);
        await ModelManager.loadModel(MODEL_ID);
      } finally {
        if (typeof detachProgressListener === 'function') {
          detachProgressListener();
        }
      }

      runtime = getAccelerationRuntime(llama);
    })().catch((error) => {
      modelPromise = null;
      throw error;
    });
  }

  await modelPromise;
};

export const warmupLocalModel = async ({
  onProgress,
}: {
  onProgress?: ProgressCallback;
} = {}): Promise<WarmupResult> => {
  await ensureModelReady(onProgress);
  reportProgress(onProgress, `RunAnywhere ready on ${runtime.toUpperCase()}`, 100);

  return {
    ready: true,
    engineLabel: 'RunAnywhere SDK',
    runtimeLabel: runtime.toUpperCase(),
    runtime,
    status: `RunAnywhere ready on ${runtime.toUpperCase()}`,
  };
};

export async function generateLocalText(
  prompt: string,
  {
    signal,
    maxTokens,
    temperature,
  }: {
    signal?: AbortSignal;
    maxTokens?: number;
    temperature?: number;
  } = {},
) {
  await ensureModelReady();
  const { llama } = await loadModules();
  const TextGeneration = llama.TextGeneration as
    | {
        generateStream: (
          input: string,
          options: { maxTokens: number; temperature: number },
        ) => Promise<{
          stream: AsyncIterable<string>;
          result: Promise<{ text?: string }>;
          cancel?: () => void;
        }>;
      }
    | undefined;

  if (!TextGeneration) {
    throw new Error('RunAnywhere text generation module was not available.');
  }

  const { stream, result, cancel } = await TextGeneration.generateStream(prompt, {
    maxTokens: maxTokens ?? MAX_GENERATION_TOKENS,
    temperature: temperature ?? 0.2,
  });

  let wasCanceled = false;
  const abortHandler = () => {
    wasCanceled = true;
    cancel?.();
  };

  signal?.addEventListener('abort', abortHandler);
  if (signal?.aborted) {
    abortHandler();
  }

  let streamedText = '';
  try {
    for await (const token of stream) {
      if (signal?.aborted || wasCanceled) {
        throw new DOMException('Generation aborted', 'AbortError');
      }

      streamedText += typeof token === 'string' ? token : '';
    }
  } catch (error) {
    if (signal?.aborted || wasCanceled) {
      throw new DOMException('Generation aborted', 'AbortError');
    }

    throw error;
  } finally {
    signal?.removeEventListener('abort', abortHandler);
  }

  if (signal?.aborted || wasCanceled) {
    throw new DOMException('Generation aborted', 'AbortError');
  }

  const finalResult = await result;
  const outputText =
    typeof finalResult?.text === 'string' && finalResult.text.trim().length > 0 ? finalResult.text : streamedText;

  return outputText.trim();
}

export async function runLocalAI(prompt: string, { signal }: { signal?: AbortSignal } = {}) {
  const outputText = await generateLocalText(prompt, {
    signal,
    maxTokens: MAX_GENERATION_TOKENS,
    temperature: 0.2,
  });

  const parsed = parseRunAnywhereJson(outputText);
  if (parsed) {
    return parsed;
  }

  const preview = outputText.replace(/\s+/g, ' ').trim().slice(0, 220);
  throw new Error(
    `RunAnywhere returned non-JSON output. Try again with shorter input. Preview: ${preview}${
      outputText.length > preview.length ? '...' : ''
    }`,
  );
}

export const answerCopilotChat = async ({
  question,
  context,
  history = [],
  signal,
}: ChatOptions): Promise<string> => {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) {
    throw new Error('Ask a question to start the chat.');
  }

  const compactContext = context ? compressSourceText(context).slice(0, MAX_CHAT_CONTEXT_CHARACTERS) : '';
  const trimmedHistory = history
    .map((turn) => ({
      role: turn.role,
      content: turn.content.trim(),
    }))
    .filter((turn) => turn.content.length > 0)
    .slice(-MAX_CHAT_HISTORY_TURNS);

  const historyText = trimmedHistory
    .map((turn) => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`)
    .join('\n');

  const prompt = `You are Local AI Copilot running on-device.
Answer clearly and naturally.

Rules:
- If user asks about provided context, prioritize that context.
- If user asks general day-to-day questions, answer normally.
- If context is missing for a context-specific question, say what is missing and ask for it.
- Keep most answers under 120 words unless user requests detail.
- Return plain text only.

${compactContext ? `Context:\n${compactContext}\n` : 'Context: None provided.\n'}
${historyText ? `Recent chat:\n${historyText}\n` : ''}
User question:
${trimmedQuestion}

Assistant answer:`;

  const reply = await generateLocalText(prompt, {
    signal,
    maxTokens: 220,
    temperature: 0.35,
  });

  return reply.replace(/^assistant\s*:/i, '').trim();
};

export const generateCopilotResponse = async ({
  content,
  mode,
  sourceType,
  sourceLabel = 'Manual paste',
  onProgress,
  signal,
}: GenerateOptions): Promise<GenerationResult> => {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('Add some content before generating insights.');
  }

  const cacheKey = makeCacheKey({ content: trimmed, mode, sourceType });
  const cached = readCache(cacheKey);
  if (cached) {
    reportProgress(onProgress, 'Loaded cached result from this device', 100);
    return {
      ...cached,
      meta: {
        ...cached.meta,
        cached: true,
        quickDraft: false,
      },
    };
  }

  reportProgress(onProgress, 'Preparing structured RunAnywhere prompt', 28);
  const preparedContent = compressSourceText(trimmed);
  if (preparedContent !== trimmed) {
    reportProgress(onProgress, 'Condensing long source for faster local inference', 38);
  }

  const prompt = buildRunAnywherePrompt({ content: preparedContent, mode, sourceType });
  reportProgress(onProgress, 'Generating JSON with RunAnywhere', 62);

  const raw = await runLocalAI(prompt, { signal });
  const normalized = normalizeResult(raw, { sourceType, sourceLabel });
  writeCache(cacheKey, normalized);
  reportProgress(onProgress, 'RunAnywhere generation complete', 100);
  return normalized;
};

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

type GenerationSpeedProfile = 'fast' | 'balanced';

interface DeviceProfile {
  isMobile: boolean;
  lowMemory: boolean;
  constrained: boolean;
}

interface GenerationPlan {
  speedProfile: GenerationSpeedProfile;
  maxTokens: number;
}

const CACHE_PREFIX = 'vizora-desk::';
const CACHE_INDEX_KEY = `${CACHE_PREFIX}index`;
const CACHE_RECORD_VERSION = 2;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const CACHE_MAX_ENTRIES = 18;
const MAX_SOURCE_CHARACTERS = 3800;
const MAX_GENERATION_TOKENS_BALANCED = 512;
const MAX_GENERATION_TOKENS_FAST = 320;
const MAX_CHAT_CONTEXT_CHARACTERS = 3200;
const MAX_CHAT_HISTORY_TURNS_BALANCED = 8;
const MAX_CHAT_HISTORY_TURNS_FAST = 6;
const MAX_CHAT_TOKENS_BALANCED = 220;
const MAX_CHAT_TOKENS_FAST = 170;
const QUICK_DRAFT_CHAR_THRESHOLD = 1700;
const QUICK_DRAFT_WORD_THRESHOLD = 280;
const FAST_PROFILE_CHAR_THRESHOLD = 4200;
const FAST_PROFILE_WORD_THRESHOLD = 700;
const LOW_MEMORY_GB_THRESHOLD = 4;
const PROGRESS_THROTTLE_MS = 160;
const PROGRESS_MIN_DELTA = 2;

interface ModelCandidate {
  id: string;
  name: string;
  repo: string;
  files: string[];
  memoryRequirement: number;
}

const MODEL_CANDIDATES: ModelCandidate[] = [
  {
    id: 'smollm2-135m-instruct-q4_0',
    name: 'SmolLM2 135M Instruct Q4_0',
    repo: 'QuantFactory/SmolLM2-135M-Instruct-GGUF',
    files: ['SmolLM2-135M-Instruct.Q4_0.gguf'],
    memoryRequirement: 140_000_000,
  },
  {
    id: 'lfm2-350m-q4_0',
    name: 'LFM2 350M Q4_0',
    repo: 'LiquidAI/LFM2-350M-GGUF',
    files: ['LFM2-350M-Q4_0.gguf'],
    memoryRequirement: 250_000_000,
  },
  {
    id: 'lfm2-350m-q4_k_m',
    name: 'LFM2 350M Q4_K_M',
    repo: 'LiquidAI/LFM2-350M-GGUF',
    files: ['LFM2-350M-Q4_K_M.gguf'],
    memoryRequirement: 280_000_000,
  },
];

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
let activeModelCandidate = MODEL_CANDIDATES[0];
let modelReady = false;
let lastProgressStatus = '';
let lastProgressValue = -1;
let lastProgressAt = 0;

const reportProgress = (onProgress: ProgressCallback | undefined, status: string, progress: number) => {
  if (!onProgress) {
    return;
  }

  const bounded = Math.max(0, Math.min(100, progress));
  const now = Date.now();
  const delta = Math.abs(bounded - lastProgressValue);
  const statusChanged = status !== lastProgressStatus;
  const shouldForce = bounded === 0 || bounded === 100;
  const shouldEmit =
    shouldForce ||
    statusChanged ||
    delta >= PROGRESS_MIN_DELTA ||
    now - lastProgressAt >= PROGRESS_THROTTLE_MS;

  if (!shouldEmit) {
    return;
  }

  onProgress(status, bounded);
  lastProgressStatus = status;
  lastProgressValue = bounded;
  lastProgressAt = now;
};

export const formatRunAnywhereError = (error: unknown) => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'Generation canceled.';
  }

  const message =
    error instanceof Error && error.message.trim().length > 0
      ? error.message.trim()
      : 'Generation failed. Please try again.';

  if (/dynamically imported module|failed to fetch|module script/i.test(message)) {
    return 'Engine assets did not load correctly. Restart the app and try again.';
  }

  if (/cross-origin|crossorigin|sharedarraybuffer|crossoriginisolated/i.test(message)) {
    return 'This browser session is missing required isolation features. Open the app through the local server instead of a file preview.';
  }

  if (/quota|opfs|storage|disk/i.test(message)) {
    return 'Browser storage is full for engine files. Clear some site data and retry initialization.';
  }

  if (/429|too many requests|rate limit/i.test(message)) {
    return 'The model host is rate-limiting downloads right now. Wait a minute and retry.';
  }

  if (/cors|access-control-allow-origin|blocked by client|err_blocked_by_client/i.test(message)) {
    return 'The browser blocked the model download request. Disable strict blockers/VPN for this site and retry.';
  }

  if (/out of memory|memory/i.test(message)) {
    return 'The browser ran out of memory while loading the engine. Close heavy tabs and try again.';
  }

  if (/download|network|fetch/i.test(message)) {
    return 'The engine could not be downloaded or loaded in this browser session. Refresh and try again.';
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

const countWords = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
};

const getDeviceProfile = (): DeviceProfile => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { isMobile: false, lowMemory: false, constrained: false };
  }

  const ua = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|iphone|ipad|ipod|mobile|iemobile|opera mini/.test(ua);
  const hasTouch = (navigator.maxTouchPoints ?? 0) > 0;
  const isNarrowViewport = window.matchMedia?.('(max-width: 920px)').matches ?? window.innerWidth < 920;
  const navWithMemory = navigator as Navigator & { deviceMemory?: number };
  const deviceMemory = typeof navWithMemory.deviceMemory === 'number' ? navWithMemory.deviceMemory : null;
  const lowMemory = deviceMemory !== null && deviceMemory <= LOW_MEMORY_GB_THRESHOLD;
  const mobileLikeDevice = isMobileUA || (hasTouch && isNarrowViewport);
  const constrained = lowMemory || mobileLikeDevice;

  return {
    isMobile: mobileLikeDevice,
    lowMemory,
    constrained,
  };
};

const selectGenerationPlan = (content: string): GenerationPlan => {
  const normalized = normalizeSourceText(content);
  const words = countWords(normalized);
  const isShort =
    normalized.length <= FAST_PROFILE_CHAR_THRESHOLD ||
    words <= FAST_PROFILE_WORD_THRESHOLD;

  if (getDeviceProfile().constrained || isShort) {
    return {
      speedProfile: 'fast',
      maxTokens: MAX_GENERATION_TOKENS_FAST,
    };
  }

  return {
    speedProfile: 'balanced',
    maxTokens: MAX_GENERATION_TOKENS_BALANCED,
  };
};

export const shouldAutoWarmupModel = () => !getDeviceProfile().constrained;

export const shouldUseQuickDraftBeforeWarmup = (content: string) => {
  if (modelReady) {
    return false;
  }

  const device = getDeviceProfile();
  if (!device.constrained) {
    return false;
  }

  const normalized = normalizeSourceText(content);
  const words = countWords(normalized);

  return normalized.length <= QUICK_DRAFT_CHAR_THRESHOLD && words <= QUICK_DRAFT_WORD_THRESHOLD;
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
    throw new Error('The engine response did not include the required `summary` field.');
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
      engine: 'Core Engine',
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
      reportProgress(onProgress, 'Loading processing engine', 12);

      const { core, llama } = await loadModules();
      const detectCapabilities = core.detectCapabilities as
        | (() => Promise<{ hasWebGPU?: boolean; isCrossOriginIsolated?: boolean; hasOPFS?: boolean }>)
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
            loadModel: (modelId: string) => Promise<boolean | void>;
            deleteModel?: (modelId: string) => Promise<void>;
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
        throw new Error('Engine SDK exports were not available.');
      }

      let capabilities: { hasWebGPU?: boolean; isCrossOriginIsolated?: boolean; hasOPFS?: boolean } | null = null;
      if (detectCapabilities) {
        reportProgress(onProgress, 'Checking browser capabilities', 16);
        capabilities = await detectCapabilities();
        if (capabilities.isCrossOriginIsolated === false) {
          reportProgress(onProgress, 'Cross-origin isolation unavailable, using limited compatibility mode', 18);
        } else if (capabilities.hasWebGPU) {
          reportProgress(onProgress, 'WebGPU available for faster processing', 18);
        } else if (capabilities.hasOPFS === false) {
          reportProgress(onProgress, 'Persistent browser storage unavailable, using session-only cache', 18);
        }
      }

      reportProgress(onProgress, 'Initializing engine core', 20);
      await RunAnywhere.initialize({
        environment: import.meta.env.PROD
          ? (SDKEnvironment?.Production ?? 'production')
          : (SDKEnvironment?.Development ?? 'development'),
        debug: import.meta.env.PROD ? false : Boolean(import.meta.env?.DEV),
        acceleration: capabilities?.hasWebGPU ? 'webgpu' : 'cpu',
      });

      reportProgress(onProgress, 'Registering llama.cpp browser backend', 32);
      await LlamaCPP.register();

      RunAnywhere.registerModels(
        MODEL_CANDIDATES.map((candidate) => ({
          id: candidate.id,
          name: candidate.name,
          repo: candidate.repo,
          files: candidate.files,
          framework: LLMFramework?.LlamaCpp ?? 'llama.cpp',
          modality: ModelCategory?.Language ?? 'language',
          memoryRequirement: candidate.memoryRequirement,
        })),
      );

      const detachProgressListener = EventBus?.shared?.on?.(
        'model.downloadProgress',
        (payload: Record<string, unknown>) => {
          const progressValue = typeof payload.progress === 'number' ? payload.progress : 0;
          const modelId = typeof payload.modelId === 'string' ? payload.modelId : activeModelCandidate.id;
          const percentage = Math.max(0, Math.min(100, Math.round(progressValue * 100)));
          reportProgress(onProgress, `Caching ${modelId} locally (${percentage}%)`, 32 + Math.round(percentage * 0.42));
        },
      );

      try {
        let selectedModel: ModelCandidate | null = null;
        let lastError: unknown = null;

        for (let index = 0; index < MODEL_CANDIDATES.length; index += 1) {
          const candidate = MODEL_CANDIDATES[index];
          const slot = `${index + 1}/${MODEL_CANDIDATES.length}`;
          reportProgress(onProgress, `Preparing ${candidate.name} (${slot})`, 42 + index * 8);

          try {
            reportProgress(onProgress, `Trying cached ${candidate.name} first`, 48 + index * 8);
            const loadedFromCache = await ModelManager.loadModel(candidate.id);
            if (loadedFromCache === false) {
              throw new Error(`Model cache entry for ${candidate.id} was not loadable.`);
            }
            selectedModel = candidate;
            break;
          } catch {
            try {
              reportProgress(onProgress, `Downloading ${candidate.name} for local use`, 54 + index * 8);
              await ModelManager.downloadModel(candidate.id);
              reportProgress(onProgress, `Loading ${candidate.name} into browser memory`, 78 + index * 6);
              const loadedAfterDownload = await ModelManager.loadModel(candidate.id);
              if (loadedAfterDownload === false) {
                throw new Error(`Downloaded model ${candidate.id} could not be loaded.`);
              }
              selectedModel = candidate;
              break;
            } catch (error) {
              try {
                if (typeof ModelManager.deleteModel !== 'function') {
                  throw error;
                }

                reportProgress(onProgress, `Repairing cache for ${candidate.name}`, 70 + index * 6);
                await ModelManager.deleteModel(candidate.id);
                reportProgress(onProgress, `Re-downloading ${candidate.name}`, 76 + index * 6);
                await ModelManager.downloadModel(candidate.id);
                reportProgress(onProgress, `Retrying ${candidate.name} load`, 82 + index * 6);
                const loadedAfterRepair = await ModelManager.loadModel(candidate.id);
                if (loadedAfterRepair === false) {
                  throw new Error(`Recovered model ${candidate.id} could not be loaded.`);
                }
                selectedModel = candidate;
                break;
              } catch (repairError) {
                lastError = repairError;
                console.warn(`Model candidate failed: ${candidate.id}`, repairError);
              }
            }
          }
        }

        if (!selectedModel) {
          throw lastError instanceof Error
            ? lastError
            : new Error('All engine candidates failed to download or load.');
        }

        activeModelCandidate = selectedModel;
      } finally {
        if (typeof detachProgressListener === 'function') {
          detachProgressListener();
        }
      }

      runtime = getAccelerationRuntime(llama);
      modelReady = true;
    })().catch((error) => {
      modelReady = false;
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
  reportProgress(onProgress, `Engine ready on ${runtime.toUpperCase()} (${activeModelCandidate.name})`, 100);

  return {
    ready: true,
    engineLabel: `Core Engine - ${activeModelCandidate.name}`,
    runtimeLabel: runtime.toUpperCase(),
    runtime,
    status: `Engine ready on ${runtime.toUpperCase()} (${activeModelCandidate.name})`,
  };
};

export async function generateLocalText(
  prompt: string,
  {
    signal,
    maxTokens,
    temperature,
    onProgress,
  }: {
    signal?: AbortSignal;
    maxTokens?: number;
    temperature?: number;
    onProgress?: ProgressCallback;
  } = {},
) {
  await ensureModelReady(onProgress);
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
    throw new Error('Text generation module was not available.');
  }

  reportProgress(onProgress, 'Running local inference', 84);
  const { stream, result, cancel } = await TextGeneration.generateStream(prompt, {
    maxTokens: maxTokens ?? MAX_GENERATION_TOKENS_BALANCED,
    temperature: temperature ?? 0.2,
  });

  if (signal?.aborted) {
    cancel?.();
    throw new DOMException('Generation aborted', 'AbortError');
  }

  let removeAbortListener: (() => void) | null = null;
  const abortPromise = signal
    ? new Promise<never>((_, reject) => {
        const abortHandler = () => {
          cancel?.();
          reject(new DOMException('Generation aborted', 'AbortError'));
        };

        signal.addEventListener('abort', abortHandler, { once: true });
        removeAbortListener = () => {
          signal.removeEventListener('abort', abortHandler);
        };
      })
    : null;

  const streamPumpPromise = (async () => {
    for await (const _token of stream) {
      if (signal?.aborted) {
        throw new DOMException('Generation aborted', 'AbortError');
      }
    }
  })();

  let finalResult: { text?: string } | undefined;
  try {
    await (abortPromise ? Promise.race([streamPumpPromise, abortPromise]) : streamPumpPromise);
    finalResult = abortPromise ? await Promise.race([result, abortPromise]) : await result;
  } finally {
    removeAbortListener?.();
  }

  if (signal?.aborted) {
    throw new DOMException('Generation aborted', 'AbortError');
  }

  return typeof finalResult?.text === 'string' ? finalResult.text.trim() : '';
}

export async function runLocalAI(
  prompt: string,
  {
    signal,
    maxTokens,
    temperature,
    onProgress,
  }: {
    signal?: AbortSignal;
    maxTokens?: number;
    temperature?: number;
    onProgress?: ProgressCallback;
  } = {},
) {
  const outputText = await generateLocalText(prompt, {
    signal,
    maxTokens: maxTokens ?? MAX_GENERATION_TOKENS_BALANCED,
    temperature: temperature ?? 0.2,
    onProgress,
  });

  const parsed = parseRunAnywhereJson(outputText);
  if (parsed) {
    return parsed;
  }

  const preview = outputText.replace(/\s+/g, ' ').trim().slice(0, 220);
  throw new Error(
    `Engine returned non-JSON output. Try again with shorter input. Preview: ${preview}${
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

  const plan = selectGenerationPlan(`${trimmedQuestion}\n${(context ?? '').slice(0, 1200)}`);
  const compactContextLimit = plan.speedProfile === 'fast' ? 2400 : MAX_CHAT_CONTEXT_CHARACTERS;
  const maxHistoryTurns =
    plan.speedProfile === 'fast' ? MAX_CHAT_HISTORY_TURNS_FAST : MAX_CHAT_HISTORY_TURNS_BALANCED;
  const maxTokens = plan.speedProfile === 'fast' ? MAX_CHAT_TOKENS_FAST : MAX_CHAT_TOKENS_BALANCED;

  const compactContext = context ? compressSourceText(context).slice(0, compactContextLimit) : '';
  const trimmedHistory = history
    .map((turn) => ({
      role: turn.role,
      content: turn.content.trim(),
    }))
    .filter((turn) => turn.content.length > 0)
    .slice(-maxHistoryTurns);

  const historyText = trimmedHistory
    .map((turn) => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`)
    .join('\n');

  const prompt = `You are the content assistant for this workspace.
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
    maxTokens,
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

  if (shouldUseQuickDraftBeforeWarmup(trimmed)) {
    reportProgress(onProgress, 'Using adaptive quick draft for this device', 42);
    const quickDraft = generateQuickCopilotResponse({
      content: trimmed,
      mode,
      sourceType,
      sourceLabel,
    });
    reportProgress(onProgress, 'Quick draft ready', 100);
    return quickDraft;
  }

  const plan = selectGenerationPlan(trimmed);
  reportProgress(onProgress, 'Preparing structured prompt', 28);
  const preparedContent = compressSourceText(trimmed);
  if (preparedContent !== trimmed) {
    reportProgress(onProgress, 'Condensing long source for faster local inference', 38);
  }

  const prompt = buildRunAnywherePrompt({
    content: preparedContent,
    mode,
    sourceType,
    speedProfile: plan.speedProfile,
  });
  reportProgress(onProgress, 'Generating structured output', 62);

  const raw = await runLocalAI(prompt, {
    signal,
    maxTokens: plan.maxTokens,
    temperature: plan.speedProfile === 'fast' ? 0.15 : 0.2,
    onProgress,
  });
  const normalized = normalizeResult(raw, { sourceType, sourceLabel });
  const profiledResult: GenerationResult = {
    ...normalized,
    meta: {
      ...normalized.meta,
      engine: plan.speedProfile === 'fast' ? 'Core Engine (Fast Profile)' : normalized.meta.engine,
    },
  };

  writeCache(cacheKey, profiledResult);
  reportProgress(onProgress, 'Generation complete', 100);
  return profiledResult;
};


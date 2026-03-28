import { YouTubeTimelineItem } from '../../types/ai.types';

const MAX_TIMELINE_ITEMS = 8;
const MIN_TIMELINE_TEXT_LENGTH = 36;
const ESTIMATED_WORDS_PER_SECOND = 2.4;
const STOP_WORDS = new Set([
  'about', 'after', 'again', 'also', 'because', 'been', 'being', 'between', 'could', 'didn', 'does',
  'from', 'have', 'just', 'like', 'more', 'much', 'only', 'other', 'over', 'really', 'that', 'their',
  'there', 'these', 'they', 'this', 'those', 'what', 'when', 'where', 'which', 'while', 'with', 'would',
  'your', 'into', 'than', 'then', 'them', 'were', 'will',
]);

interface CaptionCue {
  startSeconds: number;
  durationSeconds: number;
  text: string;
}

interface CaptionTrack {
  languageCode?: string;
  baseUrl?: string;
  vssId?: string;
  kind?: string;
}

const extractVideoId = (url: string) => {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.split('/').filter(Boolean)[0] ?? null;
    }

    if (parsed.hostname.includes('youtube.com')) {
      const queryId = parsed.searchParams.get('v');
      if (queryId) {
        return queryId;
      }

      const segments = parsed.pathname.split('/').filter(Boolean);
      const shortsIndex = segments.indexOf('shorts');
      if (shortsIndex !== -1) {
        return segments[shortsIndex + 1] ?? null;
      }
    }
  } catch {
    return null;
  }

  return null;
};

const decodeEntities = (value: string) =>
  value
    .replace(/&#(\d+);/g, (_match, code: string) => {
      const parsed = Number.parseInt(code, 10);
      return Number.isFinite(parsed) ? String.fromCharCode(parsed) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => {
      const parsed = Number.parseInt(code, 16);
      return Number.isFinite(parsed) ? String.fromCharCode(parsed) : '';
    })
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

const normalizeText = (value: string) => decodeEntities(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

const formatTimestamp = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const parseTimestamp = (label: string) => {
  const parts = label.split(':').map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return null;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const toTitleCase = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

const buildSmartTitle = (text: string, index: number) => {
  const cleaned = normalizeText(text);
  if (!cleaned) {
    return `Section ${index + 1}`;
  }

  const words = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));
  const uniqueKeywords = [...new Set(words)].slice(0, 4);

  if (uniqueKeywords.length >= 2) {
    return uniqueKeywords.map(toTitleCase).join(' ');
  }

  const sentence = cleaned.split(/[.!?]/)[0].trim();
  if (!sentence) {
    return `Section ${index + 1}`;
  }

  const compact = sentence.split(/\s+/).slice(0, 8).join(' ');
  return compact.length > 72 ? `${compact.slice(0, 69)}...` : compact;
};

const buildTimelineLink = (baseVideoUrl: string, startSeconds: number) =>
  `${baseVideoUrl}&t=${Math.max(0, Math.floor(startSeconds))}s`;

const createTimelineItem = (
  startSeconds: number,
  text: string,
  index: number,
  baseVideoUrl: string,
): YouTubeTimelineItem | null => {
  const normalized = normalizeText(text);
  if (normalized.length < MIN_TIMELINE_TEXT_LENGTH) {
    return null;
  }

  const summary = normalized.length > 220 ? `${normalized.slice(0, 217)}...` : normalized;
  return {
    startSeconds: Math.max(0, Math.floor(startSeconds)),
    timeLabel: formatTimestamp(startSeconds),
    title: buildSmartTitle(normalized, index),
    summary,
    link: buildTimelineLink(baseVideoUrl, startSeconds),
  };
};

const extractCaptionTracksFromHtml = (html: string): CaptionTrack[] => {
  const captionMatch = html.match(
    /"captions":\s*(\{.*?"playerCaptionsTracklistRenderer".*?\})\s*,\s*"videoDetails"/s,
  );

  if (captionMatch) {
    try {
      const captionJson = JSON.parse(
        `{${captionMatch[1].slice(captionMatch[1].indexOf('"playerCaptionsTracklistRenderer"'))}}`,
      );
      const tracks = captionJson?.playerCaptionsTracklistRenderer?.captionTracks;
      if (Array.isArray(tracks)) {
        return tracks as CaptionTrack[];
      }
    } catch {
      // Best effort parse.
    }
  }

  const trackArrayMatch = html.match(/"captionTracks":(\[[\s\S]*?\])/);
  if (trackArrayMatch) {
    try {
      const normalized = trackArrayMatch[1]
        .replace(/\\u0026/g, '&')
        .replace(/\\"/g, '"');
      const tracks = JSON.parse(normalized);
      if (Array.isArray(tracks)) {
        return tracks as CaptionTrack[];
      }
    } catch {
      // Best effort parse.
    }
  }

  return [];
};

const pickTrack = (tracks: CaptionTrack[]) => {
  if (tracks.length === 0) {
    return null;
  }

  return (
    tracks.find((track) => track.languageCode === 'en' && track.kind !== 'asr') ??
    tracks.find((track) => track.languageCode === 'en') ??
    tracks[0]
  );
};

const parseCaptionCues = (captionXml: string): CaptionCue[] => {
  const cues: CaptionCue[] = [];
  const cueRegex = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;

  for (let match = cueRegex.exec(captionXml); match !== null; match = cueRegex.exec(captionXml)) {
    const attrs = match[1] ?? '';
    const rawText = match[2] ?? '';
    const startMatch = attrs.match(/\bstart="([^"]+)"/);
    const durMatch = attrs.match(/\bdur="([^"]+)"/);
    const startSeconds = startMatch ? Number.parseFloat(startMatch[1]) : Number.NaN;
    const durationSeconds = durMatch ? Number.parseFloat(durMatch[1]) : 0;
    const text = normalizeText(rawText);

    if (!Number.isFinite(startSeconds) || !text) {
      continue;
    }

    cues.push({
      startSeconds: Math.max(0, startSeconds),
      durationSeconds: Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 2,
      text,
    });
  }

  return cues;
};

const buildTimelineFromCaptionCues = (cues: CaptionCue[], baseVideoUrl: string): YouTubeTimelineItem[] => {
  if (cues.length === 0) {
    return [];
  }

  const duration = cues.reduce((max, cue) => Math.max(max, cue.startSeconds + cue.durationSeconds), 0);
  const targetSegments = clamp(Math.round(duration / 150), 4, MAX_TIMELINE_ITEMS);
  const windowSeconds = Math.max(60, duration / targetSegments);
  const grouped = new Map<number, { startSeconds: number; snippets: string[] }>();

  for (const cue of cues) {
    const bucket = Math.floor(cue.startSeconds / windowSeconds);
    const existing = grouped.get(bucket);
    if (existing) {
      if (existing.snippets.join(' ').length < 700) {
        existing.snippets.push(cue.text);
      }
      continue;
    }

    grouped.set(bucket, {
      startSeconds: cue.startSeconds,
      snippets: [cue.text],
    });
  }

  const candidateItems = [...grouped.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([, value], index) => createTimelineItem(value.startSeconds, value.snippets.join(' '), index, baseVideoUrl))
    .filter((item): item is YouTubeTimelineItem => item !== null)
    .slice(0, MAX_TIMELINE_ITEMS);

  if (candidateItems.length > 0) {
    return candidateItems;
  }

  const fallbackStep = Math.max(1, Math.floor(cues.length / MAX_TIMELINE_ITEMS));
  const fallback: YouTubeTimelineItem[] = [];

  for (let index = 0; index < cues.length && fallback.length < MAX_TIMELINE_ITEMS; index += fallbackStep) {
    const cue = cues[index];
    const item = createTimelineItem(cue.startSeconds, cue.text, fallback.length, baseVideoUrl);
    if (item) {
      fallback.push(item);
    }
  }

  return fallback;
};

const splitIntoWordChunks = (value: string, maxWordsPerChunk: number) => {
  const words = normalizeText(value).split(/\s+/).filter(Boolean);
  const chunks: string[] = [];

  for (let offset = 0; offset < words.length; offset += maxWordsPerChunk) {
    chunks.push(words.slice(offset, offset + maxWordsPerChunk).join(' '));
  }

  return chunks.filter((chunk) => chunk.length >= MIN_TIMELINE_TEXT_LENGTH);
};

const buildTimelineFromManualTranscript = (transcript: string, baseVideoUrl: string): YouTubeTimelineItem[] => {
  const lines = transcript
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const explicitTimeline: Array<{ startSeconds: number; text: string }> = [];
  const explicitRegex = /^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(?:[-|:]\s*)?(.*)$/;

  for (const line of lines) {
    const match = line.match(explicitRegex);
    if (!match) {
      continue;
    }

    const parsed = parseTimestamp(match[1]);
    const remainder = match[2]?.trim() ?? '';
    if (parsed === null || remainder.length < 8) {
      continue;
    }

    explicitTimeline.push({ startSeconds: parsed, text: remainder });
  }

  if (explicitTimeline.length >= 2) {
    return explicitTimeline
      .slice(0, MAX_TIMELINE_ITEMS)
      .map((entry, index) => createTimelineItem(entry.startSeconds, entry.text, index, baseVideoUrl))
      .filter((item): item is YouTubeTimelineItem => item !== null);
  }

  const paragraphChunks = transcript
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map((chunk) => normalizeText(chunk))
    .filter((chunk) => chunk.length >= MIN_TIMELINE_TEXT_LENGTH);
  const chunks = paragraphChunks.length >= 3 ? paragraphChunks : splitIntoWordChunks(transcript, 120);

  let consumedWords = 0;
  const heuristic: YouTubeTimelineItem[] = [];

  for (const chunk of chunks) {
    const startSeconds = Math.floor(consumedWords / ESTIMATED_WORDS_PER_SECOND);
    const item = createTimelineItem(startSeconds, chunk, heuristic.length, baseVideoUrl);
    consumedWords += chunk.split(/\s+/).length;
    if (item) {
      heuristic.push(item);
    }

    if (heuristic.length >= MAX_TIMELINE_ITEMS) {
      break;
    }
  }

  return heuristic;
};

const appendTimelineSection = (transcript: string, timeline: YouTubeTimelineItem[]) => {
  if (timeline.length === 0) {
    return `Transcript:\n${transcript}`;
  }

  const timelineLines = timeline
    .map((item) => `- [${item.timeLabel}] ${item.title}: ${item.summary}`)
    .join('\n');

  return `Smart Timeline:\n${timelineLines}\n\nTranscript:\n${transcript}`;
};

export interface YouTubeTranscriptResult {
  text: string;
  label: string;
  autoFetched: boolean;
  timeline: YouTubeTimelineItem[];
}

export const fetchYoutubeTranscript = async (
  url: string,
  manualTranscript: string,
): Promise<YouTubeTranscriptResult> => {
  const videoId = extractVideoId(url);

  if (!videoId) {
    throw new Error('Enter a valid YouTube video URL.');
  }

  const baseVideoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const cleanTranscript = manualTranscript.trim();
  if (cleanTranscript) {
    const timeline = buildTimelineFromManualTranscript(cleanTranscript, baseVideoUrl);
    return {
      text: appendTimelineSection(cleanTranscript, timeline),
      label: `YouTube ${videoId}`,
      autoFetched: false,
      timeline,
    };
  }

  try {
    const pageResponse = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(baseVideoUrl)}`);
    if (!pageResponse.ok) {
      throw new Error('Failed to reach the CORS proxy.');
    }

    const pagePayload = (await pageResponse.json()) as { contents?: unknown };
    const html = typeof pagePayload.contents === 'string' ? pagePayload.contents : '';
    if (!html) {
      throw new Error('YouTube page payload was empty.');
    }

    const titleMatch = html.match(/<title>([^<]*)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(/ - YouTube$/i, '').trim() : `YouTube ${videoId}`;
    const tracks = extractCaptionTracksFromHtml(html);
    const selectedTrack = pickTrack(tracks);

    if (selectedTrack?.baseUrl) {
      try {
        const captionResponse = await fetch(
          `https://api.allorigins.win/get?url=${encodeURIComponent(selectedTrack.baseUrl)}`,
        );
        if (captionResponse.ok) {
          const captionPayload = (await captionResponse.json()) as { contents?: unknown };
          const captionXml = typeof captionPayload.contents === 'string' ? captionPayload.contents : '';
          const cues = parseCaptionCues(captionXml);
          const transcript = cues.map((cue) => cue.text).join(' ').replace(/\s+/g, ' ').trim();
          const timeline = buildTimelineFromCaptionCues(cues, baseVideoUrl);

          if (transcript.length > 20) {
            return {
              text: `Video: ${title}\n\n${appendTimelineSection(transcript, timeline)}`,
              label: title,
              autoFetched: true,
              timeline,
            };
          }
        }
      } catch {
        // Best effort only. Fall through to metadata fallback below.
      }
    }

    return {
      text: `YouTube Video: ${title}\nSource URL: ${url.trim()}\n\nNo transcript was provided or auto-fetched. Generate a best-effort output from the available source title and metadata only.\nLimitations:\n- You cannot summarize specific video content accurately without transcript/captions.\n- Provide transcript text for high-quality insights in the future.`,
      label: title,
      autoFetched: false,
      timeline: [],
    };
  } catch {
    return {
      text: `YouTube source URL: ${url.trim()}\n\nCould not auto-fetch transcript due to a network error. Generate a best-effort output from the URL only.\nLimitations:\n- You cannot summarize video content accurately without transcript/captions.`,
      label: `YouTube ${videoId}`,
      autoFetched: false,
      timeline: [],
    };
  }
};

// Keep the sync version for backward compatibility (unused now, but safe to keep)
export const prepareYoutubeTranscript = (url: string, transcript: string) => {
  const videoId = extractVideoId(url);

  if (!videoId) {
    throw new Error('Enter a valid YouTube video URL.');
  }

  const cleanTranscript = transcript.trim();
  if (!cleanTranscript) {
    return {
      text: `YouTube source URL: ${url.trim()}

No transcript was provided. Generate a best-effort output from the available source metadata only.
Limitations:
- You cannot summarize video content accurately without transcript/captions.
- Provide transcript text for high-quality insights.`,
      label: `YouTube ${videoId}`,
      timeline: [] as YouTubeTimelineItem[],
    };
  }

  const timeline = buildTimelineFromManualTranscript(cleanTranscript, `https://www.youtube.com/watch?v=${videoId}`);
  return {
    text: appendTimelineSection(cleanTranscript, timeline),
    label: `YouTube ${videoId}`,
    timeline,
  };
};

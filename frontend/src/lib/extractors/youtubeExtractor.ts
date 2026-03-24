const extractVideoId = (url: string) => {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.split('/').filter(Boolean)[0] ?? null;
    }

    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v');
    }
  } catch {
    return null;
  }

  return null;
};

export interface YouTubeTranscriptResult {
  text: string;
  label: string;
  autoFetched: boolean;
}

export const fetchYoutubeTranscript = async (
  url: string,
  manualTranscript: string,
): Promise<YouTubeTranscriptResult> => {
  const videoId = extractVideoId(url);

  if (!videoId) {
    throw new Error('Enter a valid YouTube video URL.');
  }

  // If user manually pasted a transcript, use that directly
  const cleanTranscript = manualTranscript.trim();
  if (cleanTranscript) {
    return {
      text: cleanTranscript,
      label: `YouTube ${videoId}`,
      autoFetched: false,
    };
  }

  // Auto-fetch transcript from our local proxy
  try {
    const response = await fetch(`/api/youtube-transcript/${videoId}`);

    if (!response.ok) {
      throw new Error('Failed to reach the local transcript proxy.');
    }

    const data = (await response.json()) as {
      transcript?: string;
      title?: string;
      videoId?: string;
      note?: string;
    };

    const transcript = data.transcript?.trim();
    const title = data.title || `YouTube ${videoId}`;

    if (transcript && transcript.length > 20) {
      return {
        text: `Video: ${title}\n\nTranscript:\n${transcript}`,
        label: title,
        autoFetched: true,
      };
    }

    // Transcript not available — return a fallback so AI can still try with metadata
    return {
      text: `YouTube Video: ${title}\nSource URL: ${url.trim()}\n\nNo transcript was provided or auto-fetched. Generate a best-effort output from the available source title and metadata only.\nLimitations:\n- You cannot summarize specific video content accurately without transcript/captions.\n- Provide transcript text for high-quality insights in the future.`,
      label: title,
      autoFetched: false,
    };
  } catch (error) {
    // Return fallback on network error too
    const videoId = extractVideoId(url);
    return {
      text: `YouTube source URL: ${url.trim()}\n\nCould not auto-fetch transcript due to a network error. Generate a best-effort output from the URL only.\nLimitations:\n- You cannot summarize video content accurately without transcript/captions.`,
      label: `YouTube ${videoId}`,
      autoFetched: false,
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
    };
  }

  return {
    text: cleanTranscript,
    label: `YouTube ${videoId}`,
  };
};

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

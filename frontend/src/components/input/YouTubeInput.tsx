import React, { useState } from 'react';
import { Youtube, Link2, Loader2 } from 'lucide-react';
import { fetchYoutubeTranscript } from '../../lib/extractors/youtubeExtractor';

interface YouTubeInputProps {
  onExtract: (payload: { text: string; label: string }) => void;
  onError?: (message: string) => void;
}

export const YouTubeInput: React.FC<YouTubeInputProps> = ({ onExtract, onError }) => {
  const [url, setUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  const handleFetch = async () => {
    if (!url.trim()) return;

    setIsFetching(true);
    try {
      const payload = await fetchYoutubeTranscript(url, transcript);
      onExtract({ text: payload.text, label: payload.label });
      setUrl('');
      setTranscript('');
    } catch (error: any) {
      onError?.(error.message || 'Failed to prepare YouTube transcript.');
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">
          <Youtube className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste YouTube video URL..."
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          disabled={isFetching}
        />
      </div>

      <textarea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder="Optional: paste transcript here. If empty, captions will be fetched automatically."
        className="w-full min-h-28 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm resize-y focus:outline-none focus:border-emerald-500 transition-colors"
        disabled={isFetching}
      />
      
      <button
        onClick={handleFetch}
        disabled={!url.trim() || isFetching}
        className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 rounded-xl py-2.5 text-sm font-medium transition-all"
      >
        {isFetching ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Fetching transcript...
          </>
        ) : (
          <>
            <Link2 className="w-4 h-4" />
            Use YouTube Source
          </>
        )}
      </button>

      <p className="text-[11px] leading-relaxed text-text-secondary">
        Paste a YouTube URL and the transcript will be auto-fetched. You can also paste captions manually for better quality.
      </p>
    </div>
  );
};

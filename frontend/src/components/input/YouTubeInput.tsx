import React, { useState } from 'react';
import { Youtube, Link2 } from 'lucide-react';
import { prepareYoutubeTranscript } from '../../lib/extractors/youtubeExtractor';

interface YouTubeInputProps {
  onExtract: (payload: { text: string; label: string }) => void;
  onError?: (message: string) => void;
}

export const YouTubeInput: React.FC<YouTubeInputProps> = ({ onExtract, onError }) => {
  const [url, setUrl] = useState('');
  const [transcript, setTranscript] = useState('');

  const handleFetch = async () => {
    try {
      const payload = prepareYoutubeTranscript(url, transcript);
      onExtract(payload);
      setUrl('');
      setTranscript('');
    } catch (error: any) {
      onError?.(error.message || 'Failed to prepare YouTube transcript.');
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
        />
      </div>

      <textarea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder="Paste YouTube transcript or captions here..."
        className="w-full min-h-28 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm resize-y focus:outline-none focus:border-emerald-500 transition-colors"
      />
      
      <button
        onClick={handleFetch}
        disabled={!url.trim()}
        className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 rounded-xl py-2.5 text-sm font-medium transition-all"
      >
        <Link2 className="w-4 h-4" />
        Use YouTube Source
      </button>

      <p className="text-[11px] leading-relaxed text-text-secondary">
        Paste captions for best quality. If captions are empty, the app will still run using link metadata only.
      </p>
    </div>
  );
};

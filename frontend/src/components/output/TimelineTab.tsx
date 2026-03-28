import React from 'react';
import { Clock3, ExternalLink, Youtube } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppStore } from '../../store/useAppStore';

export const TimelineTab: React.FC = () => {
  const { sourceType, sourceLabel, youtubeTimeline } = useAppStore();

  if (sourceType !== 'youtube') {
    return (
      <div className="glass rounded-[28px] border border-white/10 p-6 text-sm text-text-secondary">
        Smart Timeline appears for YouTube sources. Add a YouTube link on the left to unlock timestamped segments.
      </div>
    );
  }

  if (youtubeTimeline.length === 0) {
    return (
      <div className="glass rounded-[28px] border border-white/10 p-6 text-sm text-text-secondary">
        We could not detect timestamp metadata for this video. Paste a transcript with timestamps for a richer timeline.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-3 text-xl font-black text-white">
          <span className="rounded-xl bg-accent-secondary/20 p-2 text-accent-secondary">
            <Clock3 className="h-5 w-5" />
          </span>
          Smart Timeline
        </h3>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
          {youtubeTimeline.length} segments
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-text-secondary">
        <div className="flex items-center gap-2">
          <Youtube className="h-3.5 w-3.5 text-accent-secondary" />
          Source: <span className="font-semibold text-white/90">{sourceLabel}</span>
        </div>
      </div>

      <div className="space-y-4">
        {youtubeTimeline.map((item, index) => (
          <motion.div
            key={`${item.timeLabel}-${item.title}-${index}`}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
            className="glass rounded-2xl border border-white/10 p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-accent-secondary/25 bg-accent-secondary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-accent-secondary">
                  <Clock3 className="h-3 w-3" />
                  {item.timeLabel}
                </div>
                <h4 className="text-base font-semibold text-white">{item.title}</h4>
                <p className="text-sm leading-7 text-white/75">{item.summary}</p>
              </div>

              {item.link ? (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:text-white"
                >
                  Jump
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

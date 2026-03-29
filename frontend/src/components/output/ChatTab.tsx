import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader2, Send, Square, User } from 'lucide-react';
import { answerCopilotChat, formatRunAnywhereError } from '../../lib/ai/runAnywhere';
import { useAppStore } from '../../store/useAppStore';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const createMessageId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const GENERAL_SUGGESTIONS = [
  'Give me a clear summary of this content.',
  'What are the top 3 actions I should do today?',
  'How can I plan my day better?',
];
const MAX_SOURCE_CONTEXT_CHARS = 1200;
const MAX_SUMMARY_CONTEXT_CHARS = 500;

const getScrollBehavior = (): ScrollBehavior => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'auto';
  }

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const touchDevice = (navigator.maxTouchPoints ?? 0) > 0;
  const narrowViewport = window.matchMedia?.('(max-width: 920px)').matches ?? false;

  if (reduceMotion || (touchDevice && narrowViewport)) {
    return 'auto';
  }

  return 'smooth';
};

export const ChatTab: React.FC = () => {
  const { input, sourceContent, result, sourceLabel } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createMessageId(),
      role: 'assistant',
      content:
        'Ask me anything. I can answer daily questions and also use your uploaded content when context is available.',
    },
  ]);
  const [question, setQuestion] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const didMountRef = useRef(false);

  const contextText = useMemo(() => {
    const chunks: string[] = [];
    const activeSource = input.trim().length > 0 ? input.trim() : sourceContent.trim();
    const sourceExcerpt =
      activeSource.length > MAX_SOURCE_CONTEXT_CHARS
        ? `${activeSource.slice(0, MAX_SOURCE_CONTEXT_CHARS).trim()}...`
        : activeSource;

    if (result) {
      const summaryExcerpt =
        result.summary.length > MAX_SUMMARY_CONTEXT_CHARS
          ? `${result.summary.slice(0, MAX_SUMMARY_CONTEXT_CHARS).trim()}...`
          : result.summary;

      chunks.push(`Summary:\n${summaryExcerpt}`);
      if (result.keyPoints.length) {
        chunks.push(`Key points:\n- ${result.keyPoints.slice(0, 4).join('\n- ')}`);
      }
      if (result.actionItems.length) {
        chunks.push(
          `Action items:\n- ${result.actionItems
            .slice(0, 4)
            .map((item) => `${item.task}${item.deadline ? ` (deadline: ${item.deadline})` : ''}`)
            .join('\n- ')}`,
        );
      }
    } else if (sourceExcerpt) {
      chunks.push(`Source (${sourceLabel} excerpt):\n${sourceExcerpt}`);
    }

    return chunks.join('\n\n').trim();
  }, [input, sourceContent, result, sourceLabel]);

  const hasContext = contextText.length > 0;

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    endRef.current?.scrollIntoView({ behavior: getScrollBehavior(), block: 'end' });
  }, [messages.length, isThinking]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const stopReply = () => {
    if (!abortRef.current) return;
    abortRef.current.abort();
  };

  const sendQuestion = async (rawQuestion?: string) => {
    const prompt = (rawQuestion ?? question).trim();
    if (!prompt || isThinking) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsThinking(true);
    setError(null);

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: prompt,
    };

    const history = messages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .slice(-8)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    setMessages((prev) => [...prev, userMessage]);
    setQuestion('');

    try {
      const answer = await answerCopilotChat({
        question: prompt,
        context: contextText,
        history,
        signal: controller.signal,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: 'assistant',
          content: answer || 'I could not generate a response for that. Please try rephrasing.',
        },
      ]);
    } catch (reason) {
      const message = formatRunAnywhereError(reason);
      if (message !== 'Generation canceled.') {
        setError(message);
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setIsThinking(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-3 text-xl font-black text-white">
            <span className="rounded-xl bg-accent-tertiary/20 p-2 text-accent-tertiary">
              <Bot className="h-5 w-5" />
            </span>
            Chat Assistant
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            Ask about your content or any general day-to-day question.
          </p>
        </div>
        <div
          className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${
            hasContext
              ? 'border-accent-tertiary/20 bg-accent-tertiary/10 text-accent-tertiary'
              : 'border-white/15 bg-white/5 text-text-secondary'
          }`}
        >
          {hasContext ? 'Context attached' : 'General mode'}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {GENERAL_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={isThinking}
            onClick={() => sendQuestion(suggestion)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-xs text-text-secondary transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="glass flex-1 min-h-[220px] overflow-y-auto rounded-[28px] p-4 custom-scrollbar no-scrollbar md:p-6">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="mt-1 h-8 w-8 shrink-0 rounded-xl bg-accent-tertiary/20 p-2 text-accent-tertiary">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={`max-w-[88%] break-words rounded-2xl px-4 py-3 text-sm leading-6 ${
                  message.role === 'user'
                    ? 'bg-accent-primary/20 text-white border border-accent-primary/30'
                    : 'border border-white/10 bg-white/5 text-white/90'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === 'user' && (
                <div className="mt-1 h-8 w-8 shrink-0 rounded-xl bg-accent-primary/20 p-2 text-accent-primary">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isThinking && (
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-xl bg-accent-tertiary/20 p-2 text-accent-tertiary">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-text-secondary">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-accent-tertiary" />
                  Thinking...
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <textarea
            value={question}
            disabled={isThinking}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendQuestion();
              }
            }}
            placeholder="Ask about your notes, or ask a general daily question..."
            className="custom-scrollbar h-24 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90 outline-none transition-colors placeholder:text-text-secondary/60 focus:border-accent-tertiary/50"
          />
        </div>
        {isThinking ? (
          <button
            type="button"
            onClick={stopReply}
            className="flex h-11 items-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 text-sm font-semibold text-rose-100 transition-colors hover:bg-rose-500/20"
          >
            <Square className="h-4 w-4 fill-current" />
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={() => sendQuestion()}
            disabled={!question.trim()}
            className="flex h-11 items-center gap-2 rounded-2xl border border-accent-primary/30 bg-accent-primary/15 px-4 text-sm font-semibold text-accent-primary transition-colors hover:bg-accent-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        )}
      </div>
    </div>
  );
};

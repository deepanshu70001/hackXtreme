import React, { useEffect, useRef, useState } from 'react';
import { SummaryTab } from './SummaryTab';
import { ActionsTab } from './ActionsTab';
import { FlashcardsTab } from './FlashcardsTab';
import { SlidesTab } from './SlidesTab';
import { EmailTab } from './EmailTab';
import { ChatTab } from './ChatTab';
import { NeuralLinkTab } from './NeuralLinkTab';
import { TimelineTab } from './TimelineTab';
import { FileText, ListTodo, Brain, Presentation, Mail, Loader2, Sparkles, MessageSquare, Share2, Clock3 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ExportButton } from '../shared/ExportButton';
import { SkeletonLoader } from '../shared/SkeletonLoader';
import { motion, AnimatePresence } from 'motion/react';

type TabId = 'summary' | 'timeline' | 'actions' | 'flashcards' | 'neurallink' | 'slides' | 'email' | 'chat';

const TAB_FOCUS_REQUESTS: Record<Exclude<TabId, 'chat'>, string> = {
  summary: 'Generate only a concise summary, key points, and notes.',
  timeline: 'Generate only timeline-oriented insights and sequence highlights.',
  actions: 'Generate only action items and deadlines with clear priority.',
  flashcards: 'Generate only high-quality flashcards for revision.',
  neurallink: 'Generate only concept-link outputs for neural link: concise summary, key points, and actionable nodes.',
  slides: 'Generate only a clean slide outline with titles and bullet points.',
  email: 'Generate only a professional follow-up email draft.',
};

export const OutputPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const [isCompactTabs, setIsCompactTabs] = useState(false);
  const { result, isProcessing, input, sourceContent, setGenerationRequest, triggerGenerationFromOutput, setError } =
    useAppStore();
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);

  const tabs: { id: TabId; label: string; icon: any; color: string }[] = [
    { id: 'summary', label: 'Summary', icon: FileText, color: 'text-accent-primary' },
    { id: 'timeline', label: 'Timeline', icon: Clock3, color: 'text-accent-secondary' },
    { id: 'actions', label: 'Actions', icon: ListTodo, color: 'text-accent-secondary' },
    { id: 'flashcards', label: 'Flashcards', icon: Brain, color: 'text-accent-tertiary' },
    { id: 'neurallink', label: 'Neural Link', icon: Share2, color: 'text-accent-primary' },
    { id: 'slides', label: 'PPT Outline', icon: Presentation, color: 'text-accent-primary' },
    { id: 'email', label: 'Email', icon: Mail, color: 'text-violet-400' },
    { id: 'chat', label: 'Chat', icon: MessageSquare, color: 'text-accent-tertiary' },
  ];

  useEffect(() => {
    const node = tabsContainerRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? node.clientWidth;
      setIsCompactTabs(width < 960);
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const hasAnySource = input.trim().length > 0 || sourceContent.trim().length > 0;
  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label ?? 'Tab';
  const canGenerateFocused = activeTab !== 'chat';

  const generateForActiveTab = () => {
    if (!canGenerateFocused || isProcessing) {
      return;
    }

    if (!hasAnySource) {
      setError('Add source content in Input Source before generating focused output.');
      return;
    }

    const request = TAB_FOCUS_REQUESTS[activeTab as Exclude<TabId, 'chat'>];
    setGenerationRequest(request);
    setError(null);
    triggerGenerationFromOutput();
  };

  return (
    <div className="relative flex h-full min-h-[30rem] flex-col overflow-hidden bg-transparent sm:min-h-[34rem] lg:min-h-0">
      <AnimatePresence mode="wait">
        {isProcessing && !result ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-full flex-col gap-5 p-4 sm:gap-6 sm:p-6 md:p-8"
          >
            <div className="flex flex-col gap-1">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Processing</div>
              <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Generating Insights</h2>
              <p className="text-sm text-text-secondary/70">Your content is being processed and organized into structured output.</p>
            </div>
            <div className="glass flex-1 overflow-hidden rounded-3xl p-5 sm:p-6 md:p-8">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-3 mb-8 text-white/70">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-semibold uppercase tracking-wider">Processing...</span>
                </div>
                <SkeletonLoader />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex h-full flex-col gap-5 p-4 sm:gap-6 sm:p-6 md:p-8"
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Results</div>
                  <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{result ? 'Insights' : 'Ready to Assist'}</h2>
                  {result ? (
                    <p className="text-sm text-text-secondary/70">
                      {result.meta.runtime.toUpperCase()} runtime / {result.meta.cached ? 'Loaded from recent cache' : 'Generated in this session'}
                      {result.meta.focusRequest ? ' / Focused request active' : ''}
                    </p>
                  ) : (
                    <p className="text-sm text-text-secondary/70">
                      Ask in chat now, or generate insights from content on the left.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canGenerateFocused && (
                    <button
                      type="button"
                      onClick={generateForActiveTab}
                      disabled={isProcessing || !hasAnySource}
                      className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/90 transition-colors hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isProcessing ? 'Generating...' : `Generate ${activeTabLabel}`}
                    </button>
                  )}
                  {result ? <ExportButton /> : null}
                </div>
              </div>

              {isProcessing && (
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Building structured output...
                </div>
              )}

              <div
                ref={tabsContainerRef}
                className={`glass flex w-full items-center gap-1 rounded-3xl p-1.5 custom-scrollbar ${
                  isCompactTabs ? 'overflow-x-auto' : 'overflow-hidden'
                }`}
              >
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl px-3 py-2.5 transition-all duration-300 ${
                        isCompactTabs ? 'min-w-[8.5rem]' : 'min-w-0 flex-1'
                      } ${
                        active ? 'text-white' : 'text-text-secondary hover:text-white'
                      }`}
                      title={tab.label}
                    >
                      {active && (
                        <motion.div
                          layoutId="active-output-tab"
                          className="absolute inset-0 bg-white/10 rounded-2xl border border-white/10 shadow-lg"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <Icon className={`w-3.5 h-3.5 relative z-10 shrink-0 ${active ? tab.color : ''}`} />
                      <span className="relative z-10 text-[11px] font-bold">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
              {isCompactTabs && (
                <p className="px-1 text-[11px] text-text-secondary/80">
                  Scroll horizontally to view all features with full labels.
                </p>
              )}
            </div>

            <div className="glass relative flex-1 overflow-y-auto rounded-[28px] p-4 custom-scrollbar no-scrollbar sm:p-6 md:rounded-[36px] md:p-8">
              <div className="max-w-3xl mx-auto h-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full"
                  >
                    {activeTab === 'summary' &&
                      (result ? (
                        <SummaryTab />
                      ) : (
                        <EmptyResultState label="Summary" />
                      ))}
                    {activeTab === 'timeline' && <TimelineTab />}
                    {activeTab === 'actions' &&
                      (result ? (
                        <ActionsTab />
                      ) : (
                        <EmptyResultState label="Actions" />
                      ))}
                    {activeTab === 'flashcards' &&
                      (result ? (
                        <FlashcardsTab />
                      ) : (
                        <EmptyResultState label="Flashcards" />
                      ))}
                    {activeTab === 'neurallink' &&
                      (result ? (
                        <NeuralLinkTab />
                      ) : (
                        <EmptyResultState label="Neural Link" />
                      ))}
                    {activeTab === 'slides' &&
                      (result ? (
                        <SlidesTab />
                      ) : (
                        <EmptyResultState label="PPT Outline" />
                      ))}
                    {activeTab === 'email' &&
                      (result ? (
                        <EmailTab />
                      ) : (
                        <EmptyResultState label="Follow-Up Email" />
                      ))}
                    {activeTab === 'chat' && <ChatTab />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const EmptyResultState: React.FC<{ label: string }> = ({ label }) => (
  <div className="relative flex h-full flex-col items-center justify-center p-8 text-center text-text-secondary/60">
    <div className="w-16 h-16 rounded-full border border-white/5 flex items-center justify-center mb-6 bg-white/[0.02]">
      <Sparkles className="h-6 w-6 text-white/30" />
    </div>
    <h3 className="mb-2 text-xl font-medium tracking-tight text-white/90">{label} waiting for source data</h3>
    <p className="max-w-md text-sm leading-relaxed">
      Paste or upload source content on the left to generate insights, or use the Chat tab directly.
    </p>
  </div>
);

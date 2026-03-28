import React, { useState } from 'react';
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

export const OutputPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const { result, isProcessing } = useAppStore();

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

  return (
    <div className="relative flex h-full min-h-[36rem] flex-col overflow-hidden bg-transparent">
      <AnimatePresence mode="wait">
        {isProcessing && !result ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-full flex-col gap-6 p-6 md:p-8"
          >
            <div className="flex flex-col gap-1">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Local Analysis</div>
              <h2 className="text-3xl font-black tracking-tight text-white">Generating Insights</h2>
              <p className="text-sm text-text-secondary/70">The browser model is analyzing your content and streaming a structured result.</p>
            </div>
            <div className="glass flex-1 overflow-hidden rounded-3xl p-6 md:p-8">
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
            className="flex h-full flex-col gap-6 p-6 md:p-8"
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Results</div>
                  <h2 className="text-3xl font-black tracking-tight text-white">{result ? 'Insights' : 'Ready to Assist'}</h2>
                  {result ? (
                    <p className="text-sm text-text-secondary/70">
                      {result.meta.engine} / {result.meta.runtime.toUpperCase()} / {result.meta.cached ? 'Cached on-device' : 'Fresh local run'}
                    </p>
                  ) : (
                    <p className="text-sm text-text-secondary/70">
                      Ask in chat now, or generate insights from content on the left.
                    </p>
                  )}
                </div>
                {result ? <ExportButton /> : null}
              </div>

              {isProcessing && (
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating structured output with RunAnywhere...
                </div>
              )}

              <div className="glass flex items-center gap-1 rounded-3xl p-1.5 overflow-x-auto no-scrollbar w-full">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex min-w-[6.75rem] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl px-2.5 py-2.5 transition-all duration-300 md:min-w-0 md:flex-1 ${
                        active ? 'text-white' : 'text-text-secondary hover:text-white'
                      }`}
                    >
                      {active && (
                        <motion.div
                          layoutId="active-output-tab"
                          className="absolute inset-0 bg-white/10 rounded-2xl border border-white/10 shadow-lg"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <Icon className={`w-3.5 h-3.5 relative z-10 shrink-0 ${active ? tab.color : ''}`} />
                      <span className="text-[11px] font-bold relative z-10 truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="glass relative flex-1 overflow-y-auto rounded-[36px] p-6 custom-scrollbar no-scrollbar md:p-8">
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

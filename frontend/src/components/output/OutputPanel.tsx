import React, { useState } from 'react';
import { SummaryTab } from './SummaryTab';
import { ActionsTab } from './ActionsTab';
import { FlashcardsTab } from './FlashcardsTab';
import { SlidesTab } from './SlidesTab';
import { ChatTab } from './ChatTab';
import { FileText, ListTodo, Brain, Presentation, Loader2, Sparkles, MessageSquare } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ExportButton } from '../shared/ExportButton';
import { SkeletonLoader } from '../shared/SkeletonLoader';
import { motion, AnimatePresence } from 'motion/react';

type TabId = 'summary' | 'actions' | 'flashcards' | 'slides' | 'chat';

export const OutputPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const { result, isProcessing } = useAppStore();

  const tabs: { id: TabId; label: string; icon: any; color: string }[] = [
    { id: 'summary', label: 'Summary', icon: FileText, color: 'text-accent-primary' },
    { id: 'actions', label: 'Actions', icon: ListTodo, color: 'text-accent-secondary' },
    { id: 'flashcards', label: 'Flashcards', icon: Brain, color: 'text-accent-tertiary' },
    { id: 'slides', label: 'PPT Outline', icon: Presentation, color: 'text-accent-primary' },
    { id: 'chat', label: 'Chat', icon: MessageSquare, color: 'text-accent-tertiary' },
  ];

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-transparent">
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
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.35em] text-accent-tertiary/90">Local Analysis</div>
              <h2 className="text-3xl font-black tracking-tight text-white">Generating Insights</h2>
              <p className="text-sm text-text-secondary">The browser model is analyzing your content and streaming a structured result.</p>
            </div>
            <div className="glass flex-1 overflow-hidden rounded-[36px] p-6 md:p-8">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-3 mb-8 text-accent-tertiary">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-bold uppercase tracking-widest">Processing...</span>
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
                  <div className="text-[10px] font-bold uppercase tracking-[0.35em] text-accent-primary/90">Results</div>
                  <h2 className="text-3xl font-black tracking-tight text-white">{result ? 'Insights' : 'Ready to Assist'}</h2>
                  {result ? (
                    <p className="text-sm text-text-secondary">
                      {result.meta.engine} / {result.meta.runtime.toUpperCase()} / {result.meta.cached ? 'Cached on-device' : 'Fresh local run'}
                    </p>
                  ) : (
                    <p className="text-sm text-text-secondary">
                      Ask in chat now, or generate insights from content on the left.
                    </p>
                  )}
                </div>
                {result ? <ExportButton /> : null}
              </div>

              {isProcessing && (
                <div className="flex items-center gap-3 rounded-2xl border border-accent-tertiary/20 bg-accent-tertiary/10 px-4 py-3 text-sm text-accent-tertiary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Refining quick draft with local AI in the background...
                </div>
              )}

              {result?.meta.quickDraft && !isProcessing && (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                  Showing quick local draft. For full refinement, run generation again with shorter input.
                </div>
              )}

              <div className="glass flex items-center gap-2 self-start rounded-3xl p-1.5 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300 ${
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
                      <Icon className={`w-4 h-4 relative z-10 ${active ? tab.color : ''}`} />
                      <span className="text-xs font-bold relative z-10">{tab.label}</span>
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
                    {activeTab === 'slides' &&
                      (result ? (
                        <SlidesTab />
                      ) : (
                        <EmptyResultState label="PPT Outline" />
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
  <div className="relative flex h-full flex-col items-center justify-center overflow-hidden p-8 text-center">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.12),transparent_30%)]" />
    <motion.div
      animate={{ rotate: [0, 8, -8, 0] }}
      transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
      className="mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/10 glass shadow-2xl shadow-accent-primary/10"
    >
      <Sparkles className="h-8 w-8 text-accent-primary/60" />
    </motion.div>
    <h3 className="mb-2 text-2xl font-black tracking-tight text-white">{label} is waiting for content</h3>
    <p className="max-w-lg text-sm leading-7 text-text-secondary">
      Add source text on the left and generate insights, or switch to the Chat tab to ask general questions immediately.
    </p>
  </div>
);

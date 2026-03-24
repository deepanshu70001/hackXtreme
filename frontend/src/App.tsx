import React from 'react';
import { DashboardShell } from './components/layout/DashboardShell';
import { InputPanel } from './components/input/InputPanel';
import { OutputPanel } from './components/output/OutputPanel';

function App() {
  return (
    <DashboardShell>
      <div className="grid h-full min-h-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(30rem,38rem)_minmax(0,1fr)]">
        <div className="min-h-0 overflow-hidden rounded-[32px] border border-white/5 bg-white/[0.02] shadow-2xl backdrop-blur-xl transition-all">
          <InputPanel />
        </div>
        <div className="min-h-0 overflow-hidden rounded-[36px] border border-white/5 bg-white/[0.01] shadow-2xl backdrop-blur-xl transition-all">
          <OutputPanel />
        </div>
      </div>
    </DashboardShell>
  );
}

export default App;

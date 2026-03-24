import React from 'react';
import { DashboardShell } from './components/layout/DashboardShell';
import { InputPanel } from './components/input/InputPanel';
import { OutputPanel } from './components/output/OutputPanel';

function App() {
  return (
    <DashboardShell>
      <div className="grid h-full min-h-0 grid-cols-1 gap-4 p-4 md:gap-6 md:p-6 xl:grid-cols-[minmax(30rem,38rem)_minmax(0,1fr)]">
        <div className="min-h-0 overflow-hidden rounded-[32px] border border-white/10 bg-black/25 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl">
          <InputPanel />
        </div>
        <div className="min-h-0 overflow-hidden rounded-[36px] border border-white/10 bg-slate-950/70 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <OutputPanel />
        </div>
      </div>
    </DashboardShell>
  );
}

export default App;

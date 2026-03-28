import React from 'react';
import { DashboardShell } from './components/layout/DashboardShell';
import { InputPanel } from './components/input/InputPanel';
import { OutputPanel } from './components/output/OutputPanel';

function App() {
  return (
    <DashboardShell>
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 xl:h-full xl:min-h-0 xl:grid-cols-[minmax(24rem,36rem)_minmax(0,1fr)]">
        <div className="min-h-[28rem] overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.02] shadow-2xl backdrop-blur-xl transition-all sm:min-h-[32rem] sm:rounded-[28px] xl:min-h-0 xl:rounded-[32px]">
          <InputPanel />
        </div>
        <div className="min-h-[30rem] overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.01] shadow-2xl backdrop-blur-xl transition-all sm:min-h-[34rem] sm:rounded-[30px] xl:min-h-0 xl:rounded-[36px]">
          <OutputPanel />
        </div>
      </div>
    </DashboardShell>
  );
}

export default App;

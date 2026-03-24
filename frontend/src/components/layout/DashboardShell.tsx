import React from 'react';
import { Sidebar } from './Sidebar';
import { ModelStatus } from '../shared/ModelStatus';

interface DashboardShellProps {
  children: React.ReactNode;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({ children }) => {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-bg-primary font-sans text-text-primary md:h-screen">
      {/* Background Blobs */}
      <div className="pointer-events-none absolute inset-0 app-grid opacity-30" />
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-accent-primary/8 blur-[120px] animate-pulse-glow" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-accent-secondary/8 blur-[120px] animate-pulse-glow delay-1000" />
      <div className="pointer-events-none absolute top-[20%] right-[10%] h-[20%] w-[20%] rounded-full bg-accent-tertiary/8 blur-[80px] animate-float" />

      <Sidebar />
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        <ModelStatus />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

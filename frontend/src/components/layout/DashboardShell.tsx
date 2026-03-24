import React from 'react';
import { Sidebar } from './Sidebar';
import { ModelStatus } from '../shared/ModelStatus';

interface DashboardShellProps {
  children: React.ReactNode;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({ children }) => {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-bg-primary font-sans text-text-primary md:h-screen">
      <Sidebar />
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        <ModelStatus />
        <main className="flex-1 overflow-hidden p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

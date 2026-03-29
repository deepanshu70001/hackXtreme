import React from 'react';
import { Sidebar } from './Sidebar';
import { ModelStatus } from '../shared/ModelStatus';

interface DashboardShellProps {
  children: React.ReactNode;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({ children }) => {
  return (
    <div className="relative flex min-h-dvh flex-col bg-bg-primary font-sans text-text-primary lg:h-dvh lg:flex-row">
      <Sidebar />
      <div className="relative z-10 flex min-h-dvh min-w-0 flex-1 flex-col lg:min-h-0">
        <ModelStatus />
        <main className="flex-1 overflow-visible p-2.5 sm:p-3.5 md:p-5 lg:overflow-x-hidden lg:overflow-y-auto lg:p-7">
          {children}
        </main>
      </div>
    </div>
  );
};

import { create } from 'zustand';

interface ModelStore {
  isReady: boolean;
  progress: number;
  status: string;
  engineLabel: string;
  runtimeLabel: string;
  setReady: (isReady: boolean) => void;
  setProgress: (progress: number) => void;
  setStatus: (status: string) => void;
  setEngine: (engineLabel: string, runtimeLabel: string) => void;
}

export const useModelStore = create<ModelStore>((set) => ({
  isReady: false,
  progress: 5,
  status: 'Checking local runtime',
  engineLabel: 'Booting local AI',
  runtimeLabel: 'Pending',
  setReady: (isReady) => set({ isReady }),
  setProgress: (progress) => set({ progress }),
  setStatus: (status) => set({ status }),
  setEngine: (engineLabel, runtimeLabel) => set({ engineLabel, runtimeLabel }),
}));

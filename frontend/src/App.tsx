import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DashboardShell } from './components/layout/DashboardShell';
import { InputPanel } from './components/input/InputPanel';
import { OutputPanel } from './components/output/OutputPanel';
import { Columns2, PanelLeft, PanelRightClose } from 'lucide-react';

const DEFAULT_LEFT_WIDTH = 42;
const MIN_LEFT_WIDTH = 28;
const MAX_LEFT_WIDTH = 72;
const STORAGE_KEY = 'copilot.split.leftWidth';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function App() {
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const [isDesktopLayout, setIsDesktopLayout] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktopLayout(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedWidth = window.localStorage.getItem(STORAGE_KEY);
    if (!storedWidth) return;

    const parsedWidth = Number(storedWidth);
    if (!Number.isFinite(parsedWidth)) return;
    setLeftWidth(clamp(parsedWidth, MIN_LEFT_WIDTH, MAX_LEFT_WIDTH));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, String(leftWidth));
  }, [leftWidth]);

  const clearDragState = useCallback(() => {
    setIsDragging(false);
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
  }, []);

  useEffect(() => {
    return () => clearDragState();
  }, [clearDragState]);

  const updateLeftWidthFromClientX = useCallback((clientX: number) => {
    const container = splitContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width <= 0) return;

    const minPanelPx = 320;
    const maxPanelPx = rect.width - 360;
    if (maxPanelPx <= minPanelPx) {
      setLeftWidth(DEFAULT_LEFT_WIDTH);
      return;
    }

    const leftPx = clamp(clientX - rect.left, minPanelPx, maxPanelPx);
    const leftPercent = (leftPx / rect.width) * 100;
    setLeftWidth(clamp(leftPercent, MIN_LEFT_WIDTH, MAX_LEFT_WIDTH));
  }, []);

  const startDragging = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!isDesktopLayout) return;

      event.preventDefault();
      setIsDragging(true);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onPointerMove = (moveEvent: PointerEvent) => {
        updateLeftWidthFromClientX(moveEvent.clientX);
      };

      const stopDragging = () => {
        clearDragState();
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', stopDragging);
        window.removeEventListener('pointercancel', stopDragging);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', stopDragging);
      window.addEventListener('pointercancel', stopDragging);
    },
    [clearDragState, isDesktopLayout, updateLeftWidthFromClientX]
  );

  const handleResizerKey = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!isDesktopLayout) return;

    const step = event.shiftKey ? 6 : 2;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setLeftWidth((prev) => clamp(prev - step, MIN_LEFT_WIDTH, MAX_LEFT_WIDTH));
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setLeftWidth((prev) => clamp(prev + step, MIN_LEFT_WIDTH, MAX_LEFT_WIDTH));
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setLeftWidth(MIN_LEFT_WIDTH);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setLeftWidth(MAX_LEFT_WIDTH);
    }
  }, [isDesktopLayout]);

  const leftPaneStyle = useMemo(
    () => (isDesktopLayout ? { width: `${leftWidth}%` } : undefined),
    [isDesktopLayout, leftWidth]
  );

  return (
    <DashboardShell>
      <div className="flex min-h-0 flex-col gap-3 sm:gap-4 md:gap-6 lg:h-full">
        <div className="hidden items-center justify-end gap-2 lg:flex">
          <button
            onClick={() => setLeftWidth(62)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
            title="Expand Input Source panel"
          >
            <PanelLeft className="h-3.5 w-3.5" />
            Input Focus
          </button>
          <button
            onClick={() => setLeftWidth(34)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
            title="Expand Insights panel"
          >
            <PanelRightClose className="h-3.5 w-3.5" />
            Insights Focus
          </button>
          <button
            onClick={() => setLeftWidth(DEFAULT_LEFT_WIDTH)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
            title="Reset panel widths"
          >
            <Columns2 className="h-3.5 w-3.5" />
            Reset Split
          </button>
        </div>

        <div
          ref={splitContainerRef}
          className="flex min-h-0 flex-col gap-3 sm:gap-4 md:gap-6 lg:flex-1 lg:flex-row lg:gap-0"
        >
          <div
            style={leftPaneStyle}
            className="min-h-[28rem] overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.02] shadow-2xl backdrop-blur-xl transition-all sm:min-h-[32rem] sm:rounded-[28px] lg:min-h-0 lg:rounded-[32px] lg:rounded-r-[20px] lg:border-r-0"
          >
            <InputPanel />
          </div>

          <div className="relative hidden w-4 shrink-0 lg:flex lg:items-center lg:justify-center">
            <div
              className={`absolute inset-y-8 left-1/2 w-px -translate-x-1/2 transition-colors ${
                isDragging ? 'bg-white/35' : 'bg-white/12'
              }`}
            />
            <button
              type="button"
              onPointerDown={startDragging}
              onDoubleClick={() => setLeftWidth(DEFAULT_LEFT_WIDTH)}
              onKeyDown={handleResizerKey}
              className={`relative z-10 flex h-12 w-2.5 items-center justify-center rounded-full border transition-all ${
                isDragging
                  ? 'border-white/40 bg-white/20 shadow-[0_0_0_6px_rgba(255,255,255,0.08)]'
                  : 'border-white/20 bg-white/10 hover:bg-white/20'
              }`}
              aria-label="Resize Input and Insights panels"
              role="separator"
              aria-orientation="vertical"
              aria-valuemin={MIN_LEFT_WIDTH}
              aria-valuemax={MAX_LEFT_WIDTH}
              aria-valuenow={Math.round(leftWidth)}
              aria-valuetext={`${Math.round(leftWidth)} percent input width`}
              title="Drag to resize panels. Double-click to reset."
            >
              <span className="h-7 w-[2px] rounded-full bg-white/70" />
            </button>
          </div>

          <div className="min-h-[30rem] overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.01] shadow-2xl backdrop-blur-xl transition-all sm:min-h-[34rem] sm:rounded-[30px] lg:min-h-0 lg:flex-1 lg:rounded-[36px] lg:rounded-l-[20px]">
            <OutputPanel />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

export default App;

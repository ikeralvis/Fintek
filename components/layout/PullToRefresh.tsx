'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { useDashboard } from '@/lib/DashboardContext';

const THRESHOLD = 70;
const MAX_PULL = 110;

/** Pull-to-refresh táctil: arrastrar hacia abajo desde el tope refresca datos del servidor y del contexto. */
export default function PullToRefresh() {
  const router = useRouter();
  const { refreshData } = useDashboard();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    if (!window.matchMedia('(pointer: coarse)').matches) return;

    const onStart = (e: TouchEvent) => {
      // Solo si la página está arriba del todo y no hay un diálogo abierto.
      if (busy.current || window.scrollY > 0 || document.querySelector('[role="dialog"]')) return;
      startY.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      pullRef.current = Math.min(dy * 0.5, MAX_PULL);
      setPull(pullRef.current);
    };
    const onEnd = async () => {
      if (startY.current === null) return;
      startY.current = null;
      if (pullRef.current >= THRESHOLD) {
        busy.current = true;
        setRefreshing(true);
        setPull(THRESHOLD * 0.7);
        router.refresh();
        try { await refreshData(); } catch { /* el refresh del servidor cubre el caso */ }
        busy.current = false;
        setRefreshing(false);
      }
      pullRef.current = 0;
      setPull(0);
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [router, refreshData]);

  if (pull === 0 && !refreshing) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-1/2 top-0 z-[70] -translate-x-1/2"
      style={{ transform: `translate(-50%, ${pull - 36}px)`, opacity: Math.min(1, pull / THRESHOLD) }}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card shadow-medium">
        <RefreshCw
          className={`h-4 w-4 text-primary ${refreshing ? 'animate-spin' : ''}`}
          style={refreshing ? undefined : { transform: `rotate(${pull * 3}deg)` }}
        />
      </div>
    </div>
  );
}

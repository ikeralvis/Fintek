'use client';

import { useRef, useState, useSyncExternalStore } from 'react';
import { format, getDate, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Share2, X } from 'lucide-react';
import { toast } from 'sonner';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { cn, formatCurrency } from '@/lib/utils';
import type { MonthRecap } from '@/lib/homeWidgets';
import type { HomeCategory } from '@/lib/homeInsights';

/** Días del mes en los que se muestra el resumen del mes anterior. */
const VISIBLE_UNTIL_DAY = 5;
const dismissKey = (monthKey: string) => `fintek:recapDismissed:${monthKey}`;

// localStorage como "store" externo: evita setState dentro de un efecto y es seguro en SSR.
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); return () => listeners.delete(cb); };
const notify = () => listeners.forEach(l => l());

function useDismissed(monthKey: string | null) {
  return useSyncExternalStore(
    subscribe,
    () => (monthKey ? window.localStorage.getItem(dismissKey(monthKey)) === '1' : true),
    () => true, // en el servidor no se pinta: evita un parpadeo al hidratar
  );
}

/**
 * Del día 1 al 5, cómo fue el mes anterior: ingresos, gastos, lo que sobró y la categoría top.
 * Se puede compartir como imagen o descartar (hasta el mes siguiente).
 */
export default function MonthRecapCard({ recap, categories }: { recap: MonthRecap | null; categories: HomeCategory[] }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const dismissed = useDismissed(recap?.monthKey ?? null);

  if (!recap || dismissed || getDate(new Date()) > VISIBLE_UNTIL_DAY) return null;

  const monthLabel = format(parseISO(`${recap.monthKey}-01`), 'MMMM', { locale: es });
  const top = categories.find(c => c.id === recap.topCategoryId);
  const positive = recap.balance >= 0;
  const savedPct = recap.income > 0 ? Math.round((recap.balance / recap.income) * 100) : null;

  const dismiss = () => {
    try { window.localStorage.setItem(dismissKey(recap.monthKey), '1'); } catch { /* ignore */ }
    notify();
  };

  const share = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(cardRef.current, {
        pixelRatio: 2,
        // Los botones no salen en la imagen.
        filter: node => !(node instanceof HTMLElement && node.dataset.noCapture === 'true'),
      });
      if (!blob) throw new Error('No se pudo generar la imagen');
      const file = new File([blob], `fintek-${recap.monthKey}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Mi ${monthLabel} en Fintek` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Imagen descargada');
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error(err);
        toast.error('No se pudo compartir el resumen');
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div
      ref={cardRef}
      className="relative overflow-hidden rounded-3xl p-5 sm:p-6 text-white bg-gradient-to-br from-emerald-600 to-emerald-800"
    >
      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Tu resumen</p>
            <h2 className="text-2xl font-black capitalize leading-tight">{monthLabel}</h2>
          </div>
          <div className="flex gap-1 -mr-2 -mt-1" data-no-capture="true">
            <button onClick={share} disabled={sharing} className="p-2 rounded-xl hover:bg-white/15 transition-colors disabled:opacity-50" aria-label="Compartir resumen">
              <Share2 className="w-4 h-4" />
            </button>
            <button onClick={dismiss} className="p-2 rounded-xl hover:bg-white/15 transition-colors" aria-label="Ocultar resumen">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <p className="mt-4 text-sm text-white/80">{positive ? 'Te sobraron' : 'Gastaste de más'}</p>
        <p className="text-4xl font-black tabular-nums tracking-tight">{formatCurrency(Math.abs(recap.balance))}</p>
        {savedPct !== null && positive && savedPct > 0 && (
          <p className="text-sm text-white/80 mt-1">El {savedPct} % de lo que ingresaste</p>
        )}

        <div className="grid grid-cols-2 gap-3 mt-5">
          <Stat label="Ingresos" value={formatCurrency(recap.income)} />
          <Stat
            label="Gastos"
            value={formatCurrency(recap.spent)}
            hint={recap.spentDiffPct !== null
              ? `${recap.spentDiffPct <= 0 ? '↓' : '↑'} ${Math.abs(Math.round(recap.spentDiffPct))} % vs mes anterior`
              : undefined}
            good={recap.spentDiffPct !== null ? recap.spentDiffPct <= 0 : undefined}
          />
        </div>

        {top && (
          <div className="flex items-center gap-3 mt-3 rounded-2xl bg-white/10 p-3">
            <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <CategoryIcon name={top.icon} className="w-5 h-5 text-white" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[11px] text-white/70">Donde más gastaste</span>
              <span className="block text-sm font-semibold truncate">{top.name}</span>
            </span>
            <span className="text-sm font-bold tabular-nums">{formatCurrency(recap.topCategoryAmount)}</span>
          </div>
        )}

        <p className="mt-4 text-[11px] text-white/60">{recap.txCount} movimientos · Fintek</p>
      </div>
    </div>
  );
}

function Stat({ label, value, hint, good }: { label: string; value: string; hint?: string; good?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className="text-[11px] text-white/70">{label}</p>
      <p className="text-base font-bold tabular-nums">{value}</p>
      {hint && <p className={cn('text-[11px] font-semibold', good ? 'text-emerald-200' : 'text-rose-200')}>{hint}</p>}
    </div>
  );
}

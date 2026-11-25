'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { NumericInput } from '@/components/ui/numeric-input';
import { findUndatedContributions, type InvAccount, type InvContribution, type InvSnapshot } from '@/lib/investments';
import { formatCurrency as fmt } from '@/lib/utils';

const DISMISSED_KEY = 'fintek:invJumpDismissed';
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const readRaw = () => { try { return window.localStorage.getItem(DISMISSED_KEY) ?? '[]'; } catch { return '[]'; } };

function useDismissed() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => '[]');
  const set = useMemo(() => { try { return new Set<string>(JSON.parse(raw)); } catch { return new Set<string>(); } }, [raw]);
  const dismiss = (key: string) => {
    try { window.localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set, key])); } catch { /* ignore */ }
    listeners.forEach(l => l());
  };
  return { dismissed: set, dismiss };
}

/** Total de aportado sin fecha (para el aviso del resumen). */
export function useUndatedTotal(accounts: InvAccount[], snapshots: InvSnapshot[], contributions: InvContribution[]) {
  return useMemo(
    () => findUndatedContributions(accounts, snapshots, contributions).reduce((a, r) => a + r.undated, 0),
    [accounts, snapshots, contributions]
  );
}

/**
 * Revisión de aportaciones sin fecha: por cuenta, cuánto capital no tiene fecha y los saltos
 * del historial que lo explican. Confirmar uno crea una aportación "fechada a posteriori"
 * (source = backfill): no cambia el capital total, solo coloca ese dinero en su día para que
 * no cuente como ganancia.
 */
export default function ReviewContributions({ accounts, snapshots, contributions, userId, onChanged }: {
  accounts: InvAccount[];
  snapshots: InvSnapshot[];
  contributions: InvContribution[];
  userId: string;
  onChanged: () => void;
}) {
  const reports = useMemo(() => findUndatedContributions(accounts, snapshots, contributions), [accounts, snapshots, contributions]);
  const { dismissed, dismiss } = useDismissed();
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [manual, setManual] = useState<Record<string, { date: string; amount: string }>>({});

  const visible = reports
    .map(r => ({ ...r, candidates: r.candidates.filter(c => !dismissed.has(`${c.accountId}:${c.date}`)) }))
    .filter(r => r.undated > 1 || r.candidates.length > 0);
  if (visible.length === 0) return null;

  const backfill = async (key: string, accountId: string, date: string, amount: number) => {
    if (!(amount > 0)) return;
    setBusy(key);
    const { error } = await createClient().from('investment_contributions').insert({
      user_id: userId, account_id: accountId, amount, contribution_date: date,
      source: 'backfill', status: 'invested', invested_date: date,
    });
    setBusy(null);
    if (error) {
      toast.error(error.message.includes('source_check') ? 'Falta ejecutar sql/investment_contributions_backfill.sql' : 'No se pudo guardar');
      return;
    }
    toast.success('Aportación fechada');
    onChanged();
  };

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 md:col-span-2">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <AlertTriangle className="w-4 h-4 text-amber-500" /> Revisa tus aportaciones
      </h2>
      <p className="text-xs text-muted-foreground mt-0.5">
        Parte de lo aportado no tiene fecha, así que esos ingresos cuentan como ganancia. Confirma los saltos que fueron aportaciones: tu capital total no cambia. Cuando el &quot;sin fecha&quot; de una cuenta llegue a 0, está cuadrada.
      </p>

      <div className="mt-4 space-y-5">
        {visible.map(r => {
          const acc = accounts.find(a => a.id === r.accountId)!;
          const m = manual[r.accountId] ?? { date: '', amount: '' };
          return (
            <div key={r.accountId}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-foreground truncate">{acc.name}</p>
                {r.undated > 1 && <p className="text-xs text-amber-700 dark:text-amber-400 tabular-nums shrink-0">{fmt(r.undated)} sin fecha</p>}
              </div>
              <div className="mt-2 space-y-2">
                {r.candidates.map(c => {
                  const key = `${c.accountId}:${c.date}`;
                  const value = amounts[key] ?? String(c.suggested);
                  return (
                    <div key={key} className="rounded-xl bg-card border border-border p-3">
                      <p className="text-xs text-foreground">
                        {format(parseISO(c.date), 'd MMM yyyy', { locale: es })}: el valor subió <span className="font-semibold tabular-nums">+{fmt(c.jump)}</span>. ¿Fue una aportación?
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                      <NumericInput
                        value={value}
                        onValueChange={v => setAmounts(p => ({ ...p, [key]: v }))}
                        currencySymbol="€"
                        aria-label="Importe aportado"
                        wrapperClassName="flex-1 min-w-0"
                        className="h-10 text-right bg-muted/60 border-border tabular-nums"
                      />
                      <button
                        onClick={() => backfill(key, c.accountId, c.date, Number.parseFloat(value))}
                        disabled={busy === key}
                        className="h-10 px-3 flex items-center gap-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 shrink-0"
                      >
                        <Check className="w-4 h-4" /> Sí
                      </button>
                      <button onClick={() => dismiss(key)} className="h-10 px-3 flex items-center gap-1 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted shrink-0">
                        <X className="w-4 h-4" /> No
                      </button>
                      </div>
                    </div>
                  );
                })}
                {/* Por si la aportación no dejó un salto claro (p. ej. coincidió con una caída). */}
                <p className="pt-1 text-[11px] text-muted-foreground">¿Falta alguna? Ponle fecha a mano:</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={m.date}
                    onChange={e => setManual(p => ({ ...p, [r.accountId]: { ...m, date: e.target.value } }))}
                    className="h-10 min-w-0 rounded-lg border border-border bg-card px-2 text-xs"
                    aria-label="Fecha de la aportación"
                  />
                  <NumericInput
                    value={m.amount}
                    onValueChange={v => setManual(p => ({ ...p, [r.accountId]: { ...m, amount: v } }))}
                    placeholder="Importe"
                    currencySymbol="€"
                    wrapperClassName="min-w-0"
                    className="h-10 bg-card border-border text-xs"
                  />
                  <button
                    onClick={() => backfill(`m:${r.accountId}`, r.accountId, m.date, Number.parseFloat(m.amount))}
                    disabled={!m.date || !(Number.parseFloat(m.amount) > 0) || busy === `m:${r.accountId}`}
                    className="col-span-2 h-10 rounded-lg border border-border bg-card text-xs font-semibold disabled:opacity-50"
                  >
                    Poner fecha
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

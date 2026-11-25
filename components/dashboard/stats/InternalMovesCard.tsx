'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowRight, ChevronDown, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { useDashboard } from '@/lib/DashboardContext';
import { convertToTransfer } from '@/lib/actions/internalMoves';
import { findInternalMoves, type MoveTx } from '@/lib/internalMoves';
import { invalidateHomeData } from '@/lib/useHomeData';
import { invalidateYearTransactions } from '@/lib/useYearTransactions';
import { cn, formatCurrency as fmt } from '@/lib/utils';
import { BankLogo } from '@/components/ui/account-picker-sheet';

type Account = { id: string; name: string; banks?: { name?: string; color?: string; logo_url?: string | null } | null };

const DISMISSED_KEY = 'fintek:notInternalMove';
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const readRaw = () => { try { return window.localStorage.getItem(DISMISSED_KEY) ?? '[]'; } catch { return '[]'; } };

/**
 * "Posibles traspasos mal registrados": parejas gasto + ingreso entre tus cuentas y gastos
 * sueltos que parecen aportaciones. Convertirlos en transferencia los saca de gastos e ingresos
 * sin cambiar ningún saldo.
 */
export default function InternalMovesCard({ transactions, accounts, year }: { transactions: MoveTx[]; accounts: Account[]; year: number }) {
  const router = useRouter();
  const { refreshData } = useDashboard();
  const raw = useSyncExternalStore(subscribe, readRaw, () => '[]');
  const dismissed = useMemo(() => { try { return new Set<string>(JSON.parse(raw)); } catch { return new Set<string>(); } }, [raw]);
  const { pairs, lone, inflated } = useMemo(() => findInternalMoves(transactions, dismissed), [transactions, dismissed]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [destinations, setDestinations] = useState<Record<string, string>>({});

  if (pairs.length + lone.length === 0) return null;

  /** Logo/siglas del banco + nombre de la cuenta. */
  const AccountTag = ({ id }: { id?: string | null }) => {
    const acc = accounts.find(a => a.id === id);
    return (
      <span className="inline-flex items-center gap-1 min-w-0">
        <BankLogo account={acc ? { id: acc.id, name: acc.name, banks: acc.banks } : null} size="sm" />
        <span className="truncate">{acc?.name ?? 'Cuenta'}</span>
      </span>
    );
  };
  const dateLabel = (d: string) => format(parseISO(d.slice(0, 10)), 'd MMM yyyy', { locale: es });

  const dismiss = (id: string) => {
    try { window.localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed, id])); } catch { /* ignore */ }
    listeners.forEach(l => l());
  };

  const convert = async (expenseId: string, incomeId: string | null, toAccountId: string | null) => {
    setBusy(expenseId);
    const res = await convertToTransfer({ expenseId, incomeId, toAccountId });
    setBusy(null);
    if (res.error) { toast.error(res.error); return; }
    toast.success('Convertido en transferencia');
    invalidateYearTransactions();
    invalidateHomeData();
    await refreshData();
    router.refresh();
  };

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5">
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="w-full flex items-start gap-3 text-left">
        <span className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Repeat className="w-4.5 h-4.5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-foreground">
            {pairs.length + lone.length} posibles traspasos mal registrados en {year}
          </span>
          <span className="block text-xs text-muted-foreground mt-0.5">
            Dinero que pasó entre tus cuentas pero cuenta como gasto{pairs.length > 0 ? ' e ingreso' : ''}: {fmt(inflated)} de más.
          </span>
        </span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground shrink-0 mt-1 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {pairs.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground">Gasto + ingreso del mismo importe</p>
              {pairs.map(({ expense: e, income: i }) => (
                <div key={e.id} className="rounded-xl bg-card border border-border p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-foreground truncate">{e.description?.trim() || 'Sin concepto'}</span>
                    <span className="text-sm font-bold tabular-nums text-foreground shrink-0">{fmt(Number(e.amount))}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{dateLabel(e.transaction_date)}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-foreground min-w-0">
                    <AccountTag id={e.account_id} /> <ArrowRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" /> <AccountTag id={i.account_id} />
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => convert(e.id, i.id, null)}
                      disabled={busy === e.id}
                      className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                    >
                      Convertir en transferencia
                    </button>
                    <button onClick={() => dismiss(e.id)} className="h-9 px-3 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted">
                      No lo es
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {lone.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground">Gastos que parecen aportaciones a otra cuenta</p>
              {lone.map(({ expense: e }) => {
                const dest = destinations[e.id] ?? '';
                return (
                  <div key={e.id} className="rounded-xl bg-card border border-border p-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium text-foreground truncate">{e.description?.trim() || 'Sin concepto'}</span>
                      <span className="text-sm font-bold tabular-nums text-foreground shrink-0">{fmt(Number(e.amount))}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{dateLabel(e.transaction_date)}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-foreground min-w-0">
                      <span className="text-muted-foreground shrink-0">Desde</span> <AccountTag id={e.account_id} />
                    </p>
                    <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                      <select
                        value={dest}
                        onChange={ev => setDestinations(p => ({ ...p, [e.id]: ev.target.value }))}
                        className="h-9 min-w-0 rounded-lg border border-border bg-card px-2 text-xs"
                        aria-label="Cuenta de destino"
                      >
                        <option value="">¿A qué cuenta fue?</option>
                        {accounts.filter(a => a.id !== e.account_id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <button onClick={() => dismiss(e.id)} className="h-9 px-3 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted">
                        Es un gasto
                      </button>
                      <button
                        onClick={() => convert(e.id, null, dest)}
                        disabled={!dest || busy === e.id}
                        className="col-span-2 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                      >
                        Convertir en transferencia
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Convertir no cambia el saldo de ninguna cuenta: solo deja de contarlo como gasto e ingreso.
          </p>
        </div>
      )}
    </section>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NumericInput } from '@/components/ui/numeric-input';
import { saveDailyValues } from '@/lib/actions/investments';
import { cn, formatCurrency } from '@/lib/utils';
import type { InvAccount, InvContribution, InvSnapshot } from '@/lib/investments';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  accounts: InvAccount[];
  snapshots: InvSnapshot[];
  contributions: InvContribution[];
};

/**
 * "Valores de hoy": todas las cuentas a la vez. Cada fila parte del último valor apuntado y
 * enseña el cambio mientras escribes. Si hay aportaciones pendientes de invertir, se pregunta
 * si el valor ya las incluye (y se sugiere cuando el salto encaja con el importe).
 */
export default function DailyValuesDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={o => { if (!o) props.onClose(); }}>
      <DialogContent className="w-full sm:max-w-lg p-0 gap-0 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] max-h-[min(92dvh,calc(var(--vvh,100dvh)-1rem))] overflow-hidden">
        {props.open && <Body {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function Body({ onClose, onSaved, accounts, snapshots, contributions }: Props) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [values, setValues] = useState<Record<string, string>>({});
  /** Aportaciones pendientes marcadas a mano (true/false); sin entrada = se usa la sugerencia. */
  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const lastByAccount = useMemo(() => {
    const map: Record<string, InvSnapshot | undefined> = {};
    for (const acc of accounts) {
      map[acc.id] = snapshots
        .filter(s => s.account_id === acc.id && s.snapshot_date < date)
        .sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date))[0];
    }
    return map;
  }, [accounts, snapshots, date]);

  const pendingByAccount = useMemo(() => {
    const map: Record<string, InvContribution[]> = {};
    for (const c of contributions) {
      if (c.status === 'pending' && Number(c.amount) > 0 && c.contribution_date <= date) {
        (map[c.account_id] ||= []).push(c);
      }
    }
    return map;
  }, [contributions, date]);

  const num = (s: string | undefined) => (s ? Number.parseFloat(s) : NaN);

  /** ¿El valor nuevo ya incluye esta aportación? Si el salto cubre al menos el 80 % del importe, se sugiere que sí. */
  const isIncluded = (accId: string, c: InvContribution) => {
    if (c.id in included) return included[c.id];
    const v = num(values[accId]);
    const last = lastByAccount[accId]?.value;
    if (Number.isNaN(v) || last === undefined) return false;
    return v - Number(last) >= Number(c.amount) * 0.8;
  };

  const filled = accounts.filter(a => !Number.isNaN(num(values[a.id])) && num(values[a.id]) > 0);

  const handleSave = async () => {
    if (filled.length === 0) return;
    setSaving(true);
    const res = await saveDailyValues({
      date,
      values: filled.map(a => ({
        accountId: a.id,
        value: num(values[a.id]),
        investedContributionIds: (pendingByAccount[a.id] ?? []).filter(c => isIncluded(a.id, c)).map(c => c.id),
      })),
    });
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(filled.length === 1 ? 'Valor guardado' : `${filled.length} valores guardados`);
    onSaved();
    onClose();
  };

  return (
    <>
      <DialogHeader className="px-5 py-4 border-b border-border">
        <DialogTitle>Valores del día</DialogTitle>
      </DialogHeader>

      <div className="overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
        <label className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-4 py-2.5">
          <span className="text-sm text-muted-foreground">Fecha</span>
          <input
            type="date"
            value={date}
            max={format(new Date(), 'yyyy-MM-dd')}
            onChange={e => setDate(e.target.value)}
            className="bg-transparent text-right text-sm font-semibold text-foreground outline-none"
          />
        </label>

        {accounts.map(acc => {
          const last = lastByAccount[acc.id];
          const v = num(values[acc.id]);
          const pend = pendingByAccount[acc.id] ?? [];
          // Cambio "real": lo que se mueve el valor sin contar las aportaciones que ahora entran.
          const newlyIncluded = pend.filter(c => isIncluded(acc.id, c)).reduce((a, c) => a + Number(c.amount), 0);
          const diff = !Number.isNaN(v) && last ? v - Number(last.value) - newlyIncluded : null;
          const diffPct = diff !== null && last && Number(last.value) > 0 ? (diff / Number(last.value)) * 100 : null;
          return (
            <div key={acc.id} className="rounded-2xl border border-border p-3.5">
              <div className="flex items-center gap-3">
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-foreground truncate">{acc.name}</span>
                  <span className="block text-[11px] text-muted-foreground tabular-nums">
                    {last ? <>Último: {formatCurrency(Number(last.value))} · {format(parseISO(last.snapshot_date), 'd MMM', { locale: es })}</> : 'Sin registros'}
                  </span>
                </span>
                <NumericInput
                  value={values[acc.id] ?? ''}
                  onValueChange={s => setValues(p => ({ ...p, [acc.id]: s }))}
                  placeholder={last ? String(Number(last.value)) : '0'}
                  currencySymbol="€"
                  aria-label={`Valor de ${acc.name}`}
                  wrapperClassName="w-36 shrink-0"
                  className="h-11 text-right bg-muted/60 border-border font-semibold tabular-nums"
                />
              </div>
              {diff !== null && (
                <p className={cn('mt-1.5 text-right text-xs font-semibold tabular-nums', diff >= 0 ? 'text-secondary-600 dark:text-secondary-400' : 'text-accent-600 dark:text-accent-400')}>
                  {diff >= 0 ? '+' : ''}{formatCurrency(diff)}{diffPct !== null && ` (${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(2)} %)`}
                </p>
              )}
              {pend.length > 0 && (
                <div className="mt-2.5 space-y-1.5 rounded-xl bg-amber-500/10 p-2.5">
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Aportaciones pendientes de invertir</p>
                  {pend.map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isIncluded(acc.id, c)}
                        onChange={e => setIncluded(p => ({ ...p, [c.id]: e.target.checked }))}
                        className="h-4 w-4 accent-current"
                      />
                      <span className="flex-1">
                        Este valor ya incluye <span className="font-semibold tabular-nums">{formatCurrency(Number(c.amount))}</span> del {format(parseISO(c.contribution_date), 'd MMM', { locale: es })}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-border px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-card">
        <button
          onClick={handleSave}
          disabled={saving || filled.length === 0}
          className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm disabled:opacity-50"
        >
          {saving ? 'Guardando…' : filled.length > 1 ? `Guardar ${filled.length} valores` : 'Guardar'}
        </button>
      </div>
    </>
  );
}

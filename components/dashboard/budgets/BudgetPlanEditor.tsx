'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NumericInput } from '@/components/ui/numeric-input';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { saveBudgetPlan } from '@/lib/actions/budgets';
import { cn, formatCurrency } from '@/lib/utils';
import type { PlanBudget, PlanCategory, PlanSettings } from '@/lib/budgetPlan';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: PlanCategory[];
  budgets: PlanBudget[];
  settings: PlanSettings | null;
  /** Gasto medio mensual por categoría (sugerencia). */
  averages: Record<string, number>;
  /** Categorías de ahorro: no se presupuestan como gasto. */
  savingsCategories: Set<string>;
  /** Categorías con algún gasto en el historial (las demás van plegadas). */
  usedCategoryIds: Set<string>;
};

const toStr = (n: number | null | undefined) => (n && n > 0 ? String(Math.round(n * 100) / 100) : '');
const num = (s: string) => Number.parseFloat(s) || 0;

/**
 * "Configura tu mes": ingreso, ahorro previsto y margen arriba; debajo, todas las categorías
 * para repartir lo que queda, con la media de cada una como sugerencia. Se guarda todo de una vez.
 */
export default function BudgetPlanEditor(props: Props) {
  // Se monta de cero al abrir: el formulario parte siempre del plan guardado.
  return (
    <Dialog open={props.open} onOpenChange={o => { if (!o) props.onClose(); }}>
      <DialogContent className="w-full sm:max-w-lg p-0 gap-0 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] max-h-[min(92dvh,calc(var(--vvh,100dvh)-1rem))] overflow-hidden">
        {props.open && <EditorBody {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function EditorBody({ onClose, onSaved, categories, budgets, settings, averages, savingsCategories, usedCategoryIds }: Props) {
  const [income, setIncome] = useState(toStr(settings?.monthly_income));
  const [savings, setSavings] = useState(toStr(
    Number(settings?.savings_target) > 0
      ? settings!.savings_target
      : budgets.filter(b => b.is_savings).reduce((a, b) => a + Number(b.amount), 0)
  ));
  const [cushion, setCushion] = useState(toStr(settings?.cushion));
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(budgets.filter(b => !b.is_savings).map(b => [b.category_id, toStr(b.amount)]))
  );
  const [showMore, setShowMore] = useState(false);
  const [saving, setSaving] = useState(false);

  const { main, more } = useMemo(() => {
    const eligible = categories.filter(c => !savingsCategories.has(c.id));
    const isMain = (c: PlanCategory) => usedCategoryIds.has(c.id) || !!amounts[c.id] || (averages[c.id] ?? 0) > 0;
    const byAvg = (a: PlanCategory, b: PlanCategory) => (averages[b.id] ?? 0) - (averages[a.id] ?? 0) || a.name.localeCompare(b.name);
    return {
      main: eligible.filter(isMain).sort(byAvg),
      more: eligible.filter(c => !isMain(c)).sort(byAvg),
    };
    // El orden se fija al abrir para que las filas no salten mientras se escribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, savingsCategories, usedCategoryIds, averages]);

  const toAssign = num(income) - num(savings) - num(cushion);
  const assigned = Object.values(amounts).reduce((a, s) => a + num(s), 0);
  const unassigned = toAssign - assigned;
  const pctAssigned = toAssign > 0 ? Math.min(100, (assigned / toAssign) * 100) : 0;

  const fillWithAverages = () => {
    setAmounts(prev => {
      const next = { ...prev };
      for (const c of [...main, ...more]) {
        const avg = averages[c.id];
        if (!next[c.id] && avg && avg > 0) next[c.id] = String(Math.ceil(avg / 5) * 5); // redondeo a 5 €
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const allIds = new Set([...Object.keys(amounts), ...budgets.filter(b => !b.is_savings).map(b => b.category_id)]);
    const res = await saveBudgetPlan({
      monthlyIncome: num(income),
      savingsTarget: num(savings),
      cushion: num(cushion),
      budgets: [...allIds].map(categoryId => ({ categoryId, amount: num(amounts[categoryId] ?? '') })),
    });
    setSaving(false);
    if ('error' in res && res.error) {
      toast.error(`No se pudo guardar: ${res.error}`);
      return;
    }
    toast.success('Plan del mes guardado');
    onSaved();
    onClose();
  };

  const row = (c: PlanCategory) => {
    const avg = averages[c.id];
    return (
      <div key={c.id} className="flex items-center gap-3 py-2">
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: c.color ? `${c.color}1f` : 'var(--muted)' }}
        >
          <CategoryIcon name={c.icon} className="w-4.5 h-4.5" style={{ color: c.color || 'var(--muted-foreground)' }} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium text-foreground truncate">{c.name}</span>
          {avg ? (
            <button
              type="button"
              onClick={() => setAmounts(p => ({ ...p, [c.id]: String(Math.ceil(avg / 5) * 5) }))}
              className="text-[11px] text-muted-foreground hover:text-foreground tabular-nums"
            >
              Media {formatCurrency(avg)}/mes
            </button>
          ) : (
            <span className="block text-[11px] text-muted-foreground">Sin historial</span>
          )}
        </span>
        <NumericInput
          value={amounts[c.id] ?? ''}
          onValueChange={v => setAmounts(p => ({ ...p, [c.id]: v }))}
          placeholder="0"
          currencySymbol="€"
          aria-label={`Presupuesto de ${c.name}`}
          wrapperClassName="w-28 shrink-0"
          className="h-10 text-right bg-muted/60 border-border font-semibold tabular-nums"
        />
      </div>
    );
  };

  return (
    <>
      <DialogHeader className="px-5 py-4 border-b border-border">
        <DialogTitle>Configura tu mes</DialogTitle>
      </DialogHeader>

      <div className="overflow-y-auto overscroll-contain px-5 py-4 space-y-6">
        {/* Plan */}
        <section className="space-y-2">
          <PlanField label="Ingreso mensual" hint="Lo que entra cada mes" value={income} onChange={setIncome} />
          <PlanField label="Ahorro previsto" hint="Lo que quieres apartar" value={savings} onChange={setSavings} sign="−" tone="text-secondary-600 dark:text-secondary-400" />
          <PlanField label="Margen de seguridad" hint="Colchón para imprevistos" value={cushion} onChange={setCushion} sign="−" tone="text-amber-600 dark:text-amber-400" />
          <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
            <span className="text-sm font-semibold text-foreground">Para repartir en gastos</span>
            <span className={cn('text-base font-bold tabular-nums', toAssign < 0 ? 'text-accent-600 dark:text-accent-400' : 'text-foreground')}>
              {formatCurrency(toAssign)}
            </span>
          </div>
        </section>

        {/* Categorías */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-foreground">Por categoría</h3>
            {Object.keys(averages).length > 0 && (
              <button type="button" onClick={fillWithAverages} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                <Sparkles className="w-3.5 h-3.5" /> Rellenar con mis medias
              </button>
            )}
          </div>
          <div className="divide-y divide-border">{main.map(row)}</div>
          {more.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowMore(v => !v)}
                className="mt-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                {showMore ? 'Ocultar' : `Más categorías (${more.length})`}
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showMore && 'rotate-180')} />
              </button>
              {showMore && <div className="divide-y divide-border">{more.map(row)}</div>}
            </>
          )}
        </section>
      </div>

      {/* Pie fijo: cuánto queda por repartir */}
      <div className="border-t border-border px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3 bg-card">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground tabular-nums">Repartido {formatCurrency(assigned)}</span>
            <span className={cn('font-semibold tabular-nums', unassigned < 0 ? 'text-accent-600 dark:text-accent-400' : unassigned === 0 ? 'text-secondary-600 dark:text-secondary-400' : 'text-foreground')}>
              {unassigned < 0 ? `Te pasas ${formatCurrency(-unassigned)}` : unassigned === 0 ? 'Todo repartido' : `Sin repartir ${formatCurrency(unassigned)}`}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={cn('h-full rounded-full transition-[width] duration-300', unassigned < 0 ? 'bg-accent-500' : 'bg-primary')} style={{ width: `${unassigned < 0 ? 100 : pctAssigned}%` }} />
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar plan'}
        </button>
      </div>
    </>
  );
}

function PlanField({ label, hint, value, onChange, sign, tone }: {
  label: string; hint: string; value: string; onChange: (v: string) => void; sign?: string; tone?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex-1 min-w-0">
        <span className={cn('block text-sm font-medium text-foreground', tone)}>{sign && <span className="mr-1">{sign}</span>}{label}</span>
        <span className="block text-[11px] text-muted-foreground">{hint}</span>
      </span>
      <NumericInput
        value={value}
        onValueChange={onChange}
        placeholder="0"
        currencySymbol="€"
        aria-label={label}
        wrapperClassName="w-36 shrink-0"
        className="h-11 text-right bg-muted/60 border-border font-semibold tabular-nums"
      />
    </div>
  );
}

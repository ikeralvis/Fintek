'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, PiggyBank } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { NumericInput } from '@/components/ui/numeric-input';
import { createPocket, movePocketMoney, deletePocket } from '@/lib/actions/pockets';
import { cn, formatCurrency } from '@/lib/utils';

type Pocket = { id: string; name: string; color: string; target_amount: number | null; balance: number };
type Account = { id: string; name: string; current_balance: number };
type MoveMode = { pocket: Pocket; kind: 'add' | 'withdraw' };

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#a855f7', '#14b8a6', '#71717a'];

export default function PocketsView({ account, pockets }: Readonly<{ account: Account; pockets: Pocket[] }>) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [move, setMove] = useState<MoveMode | null>(null);
  const [busy, setBusy] = useState(false);

  const pocketed = pockets.reduce((s, p) => s + Number(p.balance), 0);
  const available = account.current_balance - pocketed;

  // Form state compartido por los dos diálogos
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [target, setTarget] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const resetForm = () => { setName(''); setColor(COLORS[0]); setTarget(''); setAmount(''); setNote(''); };

  const run = async (fn: () => Promise<{ error: string | null }>, okMsg: string, close: () => void) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(okMsg);
    close();
    resetForm();
    router.refresh();
  };

  const handleCreate = () =>
    run(
      () => createPocket({ accountId: account.id, name, color, targetAmount: Number.parseFloat(target) > 0 ? Number.parseFloat(target) : null }),
      'Apartado creado',
      () => setCreating(false)
    );

  const handleMove = () => {
    if (!move) return;
    const value = Number.parseFloat(amount) || 0;
    if (value <= 0) return;
    return run(
      () => movePocketMoney(account.id, { pocketId: move.pocket.id, amount: move.kind === 'add' ? value : -value, note }),
      move.kind === 'add' ? 'Dinero añadido' : 'Dinero retirado',
      () => setMove(null)
    );
  };

  const handleDelete = async (p: Pocket) => {
    if (!confirm(`¿Eliminar "${p.name}"? Su dinero volverá a estar disponible en la cuenta.`)) return;
    const res = await deletePocket(account.id, p.id);
    if (res.error) toast.error(res.error);
    else { toast.success('Apartado eliminado'); router.refresh(); }
  };

  const maxForMove = move ? (move.kind === 'add' ? available : Number(move.pocket.balance)) : 0;
  const moveValue = Number.parseFloat(amount) || 0;

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8">
      <div className="sticky top-0 z-20 glass-nav border-b px-5 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <button onClick={() => router.back()} className="-ml-2 rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="mx-3 truncate text-sm font-semibold text-foreground">Apartados · {account.name}</h1>
          <button onClick={() => { resetForm(); setCreating(true); }} className="rounded-xl p-2 text-primary hover:bg-muted" aria-label="Nuevo apartado">
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-4 px-5 pt-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/50 bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Disponible</p>
            <p className={cn('text-2xl font-semibold tabular-nums', available < 0 && 'text-destructive')}>{formatCurrency(available)}</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">En apartados</p>
            <p className="text-2xl font-semibold tabular-nums">{formatCurrency(pocketed)}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Saldo de la cuenta: {formatCurrency(account.current_balance)}. Los apartados solo reparten ese saldo; no mueven dinero real.
        </p>
        {available < 0 && (
          <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
            El saldo de la cuenta es menor que lo apartado. Retira dinero de algún apartado para cuadrarlo.
          </p>
        )}

        {pockets.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-14 text-center">
            <PiggyBank className="h-10 w-10 text-muted-foreground/50" />
            <p className="max-w-xs text-sm text-muted-foreground">Crea un apartado para reservar parte del saldo (viajes, compras, imprevistos…).</p>
            <button onClick={() => { resetForm(); setCreating(true); }} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Crear apartado
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {pockets.map(p => {
              const pct = p.target_amount ? Math.min(100, (Number(p.balance) / p.target_amount) * 100) : null;
              return (
                <div key={p.id} className="space-y-3 rounded-2xl border border-border/50 bg-card p-4">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</p>
                    <p className="text-lg font-semibold tabular-nums">{formatCurrency(Number(p.balance))}</p>
                    <button onClick={() => handleDelete(p)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Eliminar apartado">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {pct !== null && (
                    <div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{Math.round(pct)}% de {formatCurrency(p.target_amount!)}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => { resetForm(); setMove({ pocket: p, kind: 'add' }); }} className="flex-1 rounded-xl bg-primary/10 py-2 text-xs font-bold text-primary active:scale-95">
                      Añadir dinero
                    </button>
                    <button
                      onClick={() => { resetForm(); setMove({ pocket: p, kind: 'withdraw' }); }}
                      disabled={Number(p.balance) <= 0}
                      className="flex-1 rounded-xl bg-muted py-2 text-xs font-bold text-foreground active:scale-95 disabled:opacity-40"
                    >
                      Retirar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Crear apartado */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogTitle>Nuevo apartado</DialogTitle>
          <div className="space-y-4">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nombre (ej. Viajes)"
              maxLength={60}
              className="w-full rounded-xl bg-muted/60 px-4 py-3 text-base font-medium outline-none focus:ring-2 focus:ring-ring"
            />
            <NumericInput value={target} onValueChange={setTarget} placeholder="Objetivo (opcional)" currencySymbol="€" className="w-full rounded-xl bg-muted/60 px-4 py-3 text-base" />
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  className={cn('h-8 w-8 rounded-full border-2', color === c ? 'border-foreground' : 'border-transparent')}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              onClick={handleCreate}
              disabled={busy || !name.trim()}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy ? 'Creando…' : 'Crear apartado'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Añadir / retirar */}
      <Dialog open={!!move} onOpenChange={o => !o && setMove(null)}>
        <DialogContent>
          <DialogTitle>{move?.kind === 'add' ? 'Añadir a' : 'Retirar de'} {move?.pocket.name}</DialogTitle>
          <div className="space-y-4">
            <NumericInput value={amount} onValueChange={setAmount} placeholder="0,00" currencySymbol="€" className="w-full rounded-xl bg-muted/60 px-4 py-3 text-lg font-semibold" />
            <p className={cn('text-xs', moveValue > maxForMove ? 'text-destructive' : 'text-muted-foreground')}>
              {move?.kind === 'add' ? 'Disponible en la cuenta' : 'Saldo del apartado'}: {formatCurrency(maxForMove)}
            </p>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Nota (opcional)"
              maxLength={200}
              className="w-full rounded-xl bg-muted/60 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleMove}
              disabled={busy || moveValue <= 0 || moveValue > maxForMove}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy ? 'Guardando…' : move?.kind === 'add' ? 'Añadir dinero' : 'Retirar dinero'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

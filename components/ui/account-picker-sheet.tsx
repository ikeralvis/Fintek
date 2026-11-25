'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Check, ChevronRight, Landmark } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

export type PickerAccount = {
  id: string;
  name: string;
  current_balance?: number;
  banks?: { name?: string; color?: string; logo_url?: string | null } | null;
};

/** Logo del banco de la cuenta: imagen si la hay, si no sus iniciales sobre el color del banco. */
export function BankLogo({ account, size = 'md' }: { account?: PickerAccount | null; size?: 'sm' | 'md' }) {
  const bank = account?.banks;
  const box = size === 'sm' ? 'w-6 h-6 rounded-md text-[8px]' : 'w-9 h-9 rounded-xl text-[10px]';
  return (
    <span
      className={cn(box, 'flex items-center justify-center font-bold text-white shrink-0 overflow-hidden')}
      style={{ backgroundColor: bank?.logo_url ? 'transparent' : (bank?.color || 'var(--muted-foreground)') }}
      aria-hidden
    >
      {bank?.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bank.logo_url} alt="" className="w-full h-full object-contain" />
      ) : bank?.name ? (
        bank.name.substring(0, 2).toUpperCase()
      ) : (
        <Landmark className="w-3.5 h-3.5" />
      )}
    </span>
  );
}

type Props = {
  accounts: PickerAccount[];
  value: string;
  onValueChange: (id: string) => void;
  /** Texto a la izquierda de la fila ("Cuenta", "Desde", "Hacia"…). */
  label: string;
  title?: string;
  placeholder?: string;
  /** Cuentas que no se pueden elegir (p. ej. la de origen al elegir destino). */
  excludeIds?: string[];
  className?: string;
};

/**
 * Selector de cuenta con el mismo aspecto que Nueva Transacción: fila con el logo del banco y
 * la cuenta elegida, que abre un bottom sheet con las cuentas agrupadas por banco y su saldo.
 */
export function AccountPickerSheet({
  accounts, value, onValueChange, label, title = 'Elegir cuenta', placeholder = 'Elegir', excludeIds = [], className,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const selected = accounts.find(a => a.id === value);

  const groups = React.useMemo(() => {
    const map = new Map<string, PickerAccount[]>();
    for (const acc of accounts) {
      if (excludeIds.includes(acc.id)) continue;
      const key = acc.banks?.name || 'Otras';
      map.set(key, [...(map.get(key) ?? []), acc]);
    }
    return [...map.entries()];
  }, [accounts, excludeIds]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            'w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left hover:bg-muted/60 active:bg-muted transition-colors',
            className
          )}
        >
          <span className="text-sm text-muted-foreground shrink-0">{label}</span>
          <span className="flex items-center gap-2 min-w-0">
            {selected ? (
              <>
                <BankLogo account={selected} size="sm" />
                <span className="text-sm font-semibold text-foreground truncate">{selected.name}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">{placeholder}</span>
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </span>
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'fixed inset-x-0 bottom-0 z-[110] flex max-h-[75dvh] w-full flex-col rounded-t-3xl border border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-card-foreground shadow-strong duration-300 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0'
          )}
        >
          <div className="mx-auto mb-2 h-1.5 w-10 shrink-0 rounded-full bg-muted sm:hidden" />
          <DialogPrimitive.Title className="px-2 pb-2 text-sm font-semibold text-foreground">{title}</DialogPrimitive.Title>
          <div className="flex-1 overflow-y-auto space-y-3">
            {groups.map(([bankName, list]) => (
              <div key={bankName}>
                <p className="px-2 pb-1 text-[11px] font-semibold text-muted-foreground">{bankName}</p>
                <div className="space-y-0.5">
                  {list.map(acc => {
                    const isSelected = acc.id === value;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => { onValueChange(acc.id); setOpen(false); }}
                        className={cn(
                          'w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors',
                          isSelected ? 'bg-muted' : 'hover:bg-muted/60'
                        )}
                      >
                        <BankLogo account={acc} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-foreground truncate">{acc.name}</span>
                          {acc.current_balance !== undefined && (
                            <span className="block text-xs text-muted-foreground tabular-nums">{formatCurrency(acc.current_balance)}</span>
                          )}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectSheetOption {
  value: string;
  label: string;
  description?: string;
  /** Icono representativo mostrado a la izquierda de la opción (opcional). */
  icon?: React.ReactNode;
}

export interface SelectSheetProps {
  options: SelectSheetOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  title?: string;
  /** Icono representativo mostrado a la izquierda del trigger (opcional). */
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  /** Oculta el trigger por defecto para abrir el sheet desde un control externo. */
  hideTrigger?: boolean;
  /** Estado de apertura controlado externamente (junto a `onOpenChange`). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Sustituto universal de <select> / dropdowns inline: en cualquier tamaño de pantalla abre
 * un Bottom Sheet nativo (desliza desde abajo en móvil, diálogo centrado en desktop),
 * reutilizando la misma mecánica responsive que <Dialog>.
 */
export function SelectSheet({
  options,
  value,
  onValueChange,
  placeholder = 'Selecciona una opción',
  title,
  icon,
  disabled,
  className,
  triggerClassName,
  hideTrigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: SelectSheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = setControlledOpen ?? setUncontrolledOpen;
  const selected = options.find((o) => o.value === value);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogPrimitive.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'flex h-10 w-full items-center gap-2 rounded-xl border border-input bg-card px-3.5 py-2 text-sm text-foreground shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
              triggerClassName
            )}
          >
            {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
            <span className={cn('flex-1 truncate text-left', !selected && 'text-muted-foreground')}>
              {selected ? selected.label : placeholder}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </DialogPrimitive.Trigger>
      )}

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm duration-200 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex max-h-[75vh] w-full flex-col gap-1 rounded-t-3xl border border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-card-foreground shadow-strong duration-300 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0',
            className
          )}
        >
          <div className="mx-auto mb-1 h-1.5 w-10 shrink-0 rounded-full bg-muted sm:hidden" />
          {title && (
            <DialogPrimitive.Title className="px-2 pb-2 pt-1 text-sm font-semibold text-foreground">
              {title}
            </DialogPrimitive.Title>
          )}
          <div className="flex-1 overflow-y-auto">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted',
                    isSelected ? 'font-semibold text-foreground' : 'text-foreground/90'
                  )}
                >
                  {option.icon && <span className="shrink-0 text-muted-foreground">{option.icon}</span>}
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">{option.label}</span>
                    {option.description && (
                      <span className="block truncate text-xs text-muted-foreground">{option.description}</span>
                    )}
                  </span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Search, X } from 'lucide-react';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { groupCategories } from '@/lib/categoryGroups';
import { cn } from '@/lib/utils';

type Category = { id: string; name: string; icon?: string; color?: string };

type Props = {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Ids (en orden) de las categorías más usadas/recientes: tira de 1-tap arriba del todo. */
  frequentIds?: string[];
  title?: string;
};

const SELECT_FEEDBACK_MS = 200;
const EXIT_MS = 180;
// Curva tipo drawer de iOS: arranca rápido y asienta suave (mejor que el ease-out genérico).
const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

/**
 * Popup flotante para elegir categoría: tarjeta con esquinas redondeadas por los 4 lados, con
 * margen respecto al borde de la pantalla (no es pantalla completa), anclada abajo para dejar
 * ver — oscurecido y ligeramente difuminado — el importe y los datos del formulario detrás.
 * Los tamaños críticos van inline para que no dependan de que el CSS de Tailwind esté al día.
 *
 * Va sobre Radix Dialog para poder apilarse encima de otro modal (Editar Transacción ya es un
 * Dialog de Radix, que bloquearía los clics y el foco de un overlay "normal"), y de paso da
 * Escape, foco atrapado y bloqueo de scroll del fondo gratis.
 */
export function CategoryPickerSheet(props: Props) {
  // Se monta de cero en cada apertura: búsqueda, selección y animación arrancan limpias sin
  // tener que resetear estado a mano.
  return props.open ? <CategoryPickerSheetInner {...props} /> : null;
}

function CategoryPickerSheetInner({ onClose, categories, selectedId, onSelect, frequentIds = [], title = 'Elegir categoría' }: Props) {
  const [query, setQuery] = useState('');
  const [justSelectedId, setJustSelectedId] = useState<string | null>(null);
  // `visible` gobierna las transiciones (interrumpibles, mejor que keyframes): false al montar,
  // true un frame después → entra; vuelve a false al cerrar → sale más rápido de lo que entró.
  const [visible, setVisible] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (fn: () => void, ms: number) => {
    timeoutsRef.current.push(setTimeout(fn, ms));
  };

  useEffect(() => {
    // Cierra el teclado del input de importe para que el sheet no quede debajo.
    (document.activeElement as HTMLElement | null)?.blur?.();
    const raf = requestAnimationFrame(() => setVisible(true));
    const timeouts = timeoutsRef.current;
    return () => {
      cancelAnimationFrame(raf);
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const requestClose = () => {
    setVisible(false);
    later(onClose, EXIT_MS);
  };

  const handlePick = (id: string) => {
    if (justSelectedId) return; // evita doble-tap mientras se confirma la elección
    setJustSelectedId(id);
    later(() => {
      onSelect(id);
      requestClose();
    }, SELECT_FEEDBACK_MS);
  };

  const frequentCategories = useMemo(
    () => frequentIds.map(id => categories.find(c => c.id === id)).filter((c): c is Category => !!c),
    [frequentIds, categories]
  );
  const groups = useMemo(() => groupCategories(categories, query), [categories, query]);
  // Posición global de cada categoría (a través de todos los grupos) para escalonar la entrada.
  const staggerIndex = useMemo(() => {
    const map = new Map<string, number>();
    groups.forEach(({ items }) => items.forEach(c => map.set(c.id, map.size)));
    return map;
  }, [groups]);

  return (
    <DialogPrimitive.Root open onOpenChange={(o) => { if (!o) requestClose(); }}>
      <DialogPrimitive.Portal>
      {/* Fondo oscurecido: se sigue leyendo el formulario detrás, pero claramente en segundo plano.
          Tocarlo cuenta como "fuera" del Content → Radix llama a onOpenChange(false). */}
      <DialogPrimitive.Overlay
        className="fixed inset-0 z-[110]"
        style={{
          backgroundColor: 'rgba(9, 9, 11, 0.55)',
          opacity: visible ? 1 : 0,
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          transition: `opacity ${visible ? 220 : EXIT_MS}ms ease-out`,
        }}
      />

      <div
        className="pointer-events-none fixed inset-0 z-[110] flex items-end justify-center sm:items-center"
        style={{ padding: '0.75rem', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
      <DialogPrimitive.Content
        aria-describedby={undefined}
        // No enfocar nada al abrir: en móvil evita el anillo de foco en la X y que salte el teclado.
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="pointer-events-auto relative flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-strong outline-none"
        style={{
          height: 'min(68dvh, 36rem)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.96)',
          transformOrigin: 'bottom center',
          transition: visible
            ? `transform 320ms ${EASE_DRAWER}, opacity 200ms ease-out`
            : `transform ${EXIT_MS}ms ${EASE_OUT}, opacity ${EXIT_MS}ms ease-out`,
        }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <DialogPrimitive.Title className="text-base font-bold text-foreground">{title}</DialogPrimitive.Title>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Cerrar"
            className="rounded-full bg-muted/70 p-2 text-foreground transition-transform duration-150 ease-out hover:bg-muted active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="shrink-0 border-b border-border px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar categoría..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl bg-muted/60 py-2.5 pl-9 pr-4 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Body: su propio scroll */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
          {!query && frequentCategories.length > 0 && (
            <div className="mb-4">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Frecuentes</p>
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-hide">
                {frequentCategories.map(cat => {
                  const selected = selectedId === cat.id;
                  return (
                    <button
                      key={`freq-${cat.id}`}
                      type="button"
                      onClick={() => handlePick(cat.id)}
                      className={cn(
                        'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 transition-transform duration-150 ease-out active:scale-95',
                        selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted/40 text-foreground'
                      )}
                    >
                      <CategoryIcon name={cat.icon} className="h-4 w-4 shrink-0" style={selected ? undefined : { color: cat.color || undefined }} />
                      <span className="whitespace-nowrap text-xs font-semibold">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {groups.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">Sin resultados para &ldquo;{query}&rdquo;</p>
          )}

          <div className="space-y-5">
            {groups.map(({ group, items }) => (
              <div key={group}>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{group}</p>
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                  {items.map(cat => {
                    const selected = selectedId === cat.id;
                    const justSelected = justSelectedId === cat.id;
                    const active = selected || justSelected;
                    // Entrada escalonada corta (20ms/ítem, tope 220ms): da vida sin hacer esperar.
                    const delay = Math.min((staggerIndex.get(cat.id) ?? 0) * 20, 220);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handlePick(cat.id)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 rounded-2xl p-2.5 active:scale-95',
                          active ? 'bg-primary' : 'bg-muted/50'
                        )}
                        style={{
                          opacity: visible ? 1 : 0,
                          transform: visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.95)',
                          transition: visible
                            ? `opacity 260ms ${EASE_OUT} ${delay}ms, transform 260ms ${EASE_OUT} ${delay}ms, background-color 150ms ease-out`
                            : `opacity ${EXIT_MS}ms ease-out`,
                        }}
                      >
                        <div
                          className={cn('flex h-11 w-11 items-center justify-center rounded-xl', justSelected && 'animate-select-bounce')}
                          style={{ backgroundColor: active ? 'rgba(255,255,255,0.22)' : cat.color ? `${cat.color}25` : 'var(--muted)' }}
                        >
                          <CategoryIcon
                            name={cat.icon}
                            className="h-5 w-5"
                            style={{ color: active ? '#fff' : (cat.color || 'var(--muted-foreground)') }}
                          />
                        </div>
                        <span className={cn('w-full truncate text-center text-[11px] font-semibold leading-tight', active ? 'text-primary-foreground' : 'text-foreground')}>
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={requestClose}
            className="w-full rounded-xl bg-muted/60 py-2.5 text-sm font-bold text-muted-foreground transition-transform duration-150 ease-out hover:bg-muted active:scale-[0.98]"
          >
            Cerrar
          </button>
        </div>
      </DialogPrimitive.Content>
      </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

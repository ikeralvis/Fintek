'use client';

import { Receipt } from 'lucide-react';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { cn } from '@/lib/utils';
import { matchService, initialsOf, isLightColor } from '@/lib/subscriptionCatalog';

type Category = { id?: string; name?: string; icon?: string; color?: string };

/**
 * "Logo" del pago: marca conocida (color + monograma propio, sin pedir imágenes fuera), si no
 * el icono de su categoría y, en último caso, las iniciales del nombre.
 */
export function ServiceLogo({ name, category, size = 'md' }: { name: string; category?: Category | null; size?: 'sm' | 'md' | 'lg' }) {
  const service = matchService(name);
  const box = size === 'lg' ? 'w-12 h-12 rounded-2xl text-base' : size === 'sm' ? 'w-8 h-8 rounded-lg text-[11px]' : 'w-10 h-10 rounded-xl text-sm';

  if (service) {
    return (
      <div
        className={cn(box, 'flex items-center justify-center shrink-0 font-black tracking-tight', isLightColor(service.bg) && 'ring-1 ring-inset ring-border')}
        style={{ backgroundColor: service.bg, color: service.fg }}
        aria-hidden
      >
        {service.mark}
      </div>
    );
  }
  if (category?.icon) {
    return (
      <div
        className={cn(box, 'flex items-center justify-center shrink-0')}
        style={{ backgroundColor: category.color ? `${category.color}1f` : 'var(--muted)' }}
        aria-hidden
      >
        <CategoryIcon name={category.icon} className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} style={{ color: category.color || 'var(--muted-foreground)' }} />
      </div>
    );
  }
  return (
    <div className={cn(box, 'flex items-center justify-center shrink-0 font-bold bg-muted text-muted-foreground')} aria-hidden>
      {name.trim() ? initialsOf(name) : <Receipt className="w-4 h-4" />}
    </div>
  );
}


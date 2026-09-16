import { cn } from '@/lib/utils';

/** Bloque de carga con animación de pulso, para sustituir spinners genéricos. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-lg bg-muted/60', className)} {...props} />;
}

export { Skeleton };

import { cn } from '@/lib/utils';

/** Bloque de carga con shimmer, para sustituir spinners genéricos. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg bg-neutral-200/80 dark:bg-neutral-800/80',
        'before:absolute before:inset-0 before:animate-shimmer',
        'before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent',
        'dark:before:via-white/10',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };

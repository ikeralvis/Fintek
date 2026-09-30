import { Skeleton } from '@/components/ui/skeleton';

/** Skeletons con la forma real de cada sección (antes todas mostraban el skeleton de Home). */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <div className="px-5 pt-8 pb-6 md:max-w-6xl md:mx-auto">
        <Skeleton className="h-4 w-16 mb-2" />
        <Skeleton className="h-7 w-40" />
      </div>
      <div className="px-5 md:max-w-6xl md:mx-auto space-y-5">{children}</div>
    </div>
  );
}

function Row({ withIcon = true }: { withIcon?: boolean }) {
  return (
    <div className="px-4 py-3 flex items-center gap-3 border-b border-border last:border-0">
      {withIcon && <Skeleton className="w-10 h-10 rounded-xl shrink-0" />}
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-4 w-14" />
    </div>
  );
}

/** Cuentas: resumen total + tarjetas de cuenta. */
export function AccountsSkeleton() {
  return (
    <Shell>
      <Skeleton className="h-24 rounded-2xl" />
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </Shell>
  );
}

/** Movimientos: buscador/filtros + lista agrupada por día. */
export function TransactionsSkeleton() {
  return (
    <Shell>
      <Skeleton className="h-11 rounded-xl" />
      <div className="flex gap-2">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}
      </div>
      {[1, 2].map(g => (
        <div key={g} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {[1, 2, 3].map(i => <Row key={i} />)}
          </div>
        </div>
      ))}
    </Shell>
  );
}

/** Análisis / estadísticas: gráficos y tarjetas de métricas. */
export function ChartsSkeleton() {
  return (
    <Shell>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
    </Shell>
  );
}

/** Presupuestos: tarjetas con barra de progreso. */
export function BudgetsSkeleton() {
  return (
    <Shell>
      <Skeleton className="h-28 rounded-2xl" />
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-14 ml-auto" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </Shell>
  );
}

/** Suscripciones / cartera: lista simple en tarjeta. */
export function ListSkeleton() {
  return (
    <Shell>
      <Skeleton className="h-24 rounded-2xl" />
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {[1, 2, 3, 4, 5].map(i => <Row key={i} />)}
      </div>
    </Shell>
  );
}

/** Configuración: grupos de filas de ajustes. */
export function SettingsSkeleton() {
  return (
    <Shell>
      {[1, 2].map(g => (
        <div key={g} className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {[1, 2, 3].map(i => <Row key={i} withIcon={false} />)}
          </div>
        </div>
      ))}
    </Shell>
  );
}

/** Formulario de nuevo movimiento (pantalla completa, sin barra inferior). */
export function TransactionFormSkeleton() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-8 w-40 rounded-full" />
        <div className="w-9" />
      </div>
      <div className="flex flex-col items-center gap-6 px-5 pt-10">
        <Skeleton className="h-16 w-48 rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

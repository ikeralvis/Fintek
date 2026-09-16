import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="px-5 pt-8 pb-6 md:max-w-6xl md:mx-auto">
        <Skeleton className="h-4 w-16 mb-2" />
        <Skeleton className="h-7 w-32" />
      </div>

      <div className="px-5 md:max-w-6xl md:mx-auto space-y-5">
        <Skeleton className="rounded-2xl h-44" />

        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="flex-1 h-16 rounded-xl" />
          ))}
        </div>

        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="px-4 py-3 flex items-center gap-3 border-b border-border last:border-0">
                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

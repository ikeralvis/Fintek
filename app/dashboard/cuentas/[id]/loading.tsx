export default function AccountDetailLoading() {
  return (
    <div className="min-h-screen bg-neutral-50 pb-32 md:pb-8 animate-pulse">
      {/* Header skeleton */}
      <div className="sticky top-0 z-20 bg-neutral-50/80 backdrop-blur-xl border-b border-neutral-100 px-5 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="w-9 h-9 bg-neutral-200 rounded-xl" />
          <div className="h-4 w-24 bg-neutral-200 rounded" />
          <div className="flex gap-1">
            <div className="w-9 h-9 bg-neutral-100 rounded-xl" />
            <div className="w-9 h-9 bg-neutral-100 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="px-5 space-y-5 max-w-4xl mx-auto pt-5">
        {/* Account card skeleton */}
        <div className="rounded-2xl bg-neutral-300 h-32" />

        {/* Date controls */}
        <div className="h-12 bg-white rounded-xl border border-neutral-100" />

        {/* Filters */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-9 w-20 bg-neutral-100 rounded-xl" />
          ))}
        </div>

        {/* Transaction list skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map(group => (
            <div key={group}>
              <div className="h-3 w-20 bg-neutral-200 rounded mb-2 ml-1" />
              <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
                {[1, 2, 3].map(i => (
                  <div key={i} className="px-4 py-3 flex items-center gap-3 border-b border-neutral-50 last:border-0">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-28 bg-neutral-100 rounded" />
                      <div className="h-3 w-20 bg-neutral-50 rounded" />
                    </div>
                    <div className="h-4 w-14 bg-neutral-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

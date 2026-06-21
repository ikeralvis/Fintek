export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-neutral-50 pb-20 md:pb-0 animate-pulse">
      {/* Skeleton Header area */}
      <div className="px-5 pt-8 pb-6 md:max-w-6xl md:mx-auto">
        <div className="h-4 w-16 bg-neutral-200 rounded mb-2" />
        <div className="h-7 w-32 bg-neutral-200 rounded" />
      </div>

      <div className="px-5 md:max-w-6xl md:mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left column */}
          <div className="md:col-span-8 space-y-5">
            {/* Balance card skeleton */}
            <div className="rounded-2xl bg-neutral-200 h-44" />

            {/* Quick actions skeleton */}
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex-1 h-16 bg-neutral-100 rounded-xl border border-neutral-200" />
              ))}
            </div>

            {/* Transactions skeleton */}
            <div className="space-y-3">
              <div className="h-4 w-24 bg-neutral-200 rounded" />
              <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="px-4 py-3 flex items-center gap-3 border-b border-neutral-50 last:border-0">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-24 bg-neutral-100 rounded" />
                      <div className="h-3 w-16 bg-neutral-50 rounded" />
                    </div>
                    <div className="h-4 w-14 bg-neutral-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="md:col-span-4 space-y-5">
            <div className="h-4 w-28 bg-neutral-200 rounded" />
            <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
              {[1, 2].map(i => (
                <div key={i} className="h-24 rounded-xl bg-neutral-200" />
              ))}
            </div>
            <div className="h-48 rounded-2xl bg-neutral-100 border border-neutral-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

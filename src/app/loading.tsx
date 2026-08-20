export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <header className="space-y-2">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-9 w-64 rounded bg-muted" />
      </header>

      {/* Tile grid skeleton */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i}>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-3 w-48 rounded bg-muted" />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <header className="space-y-1">
        <div className="h-7 w-40 rounded bg-muted" />
        <div className="h-4 w-56 rounded bg-muted" />
      </header>

      {/* Search input skeleton */}
      <div className="h-10 w-full rounded-lg bg-muted" />

      {/* Filter row skeleton */}
      <div className="flex gap-2">
        <div className="h-10 w-28 rounded-lg bg-muted" />
        <div className="h-10 w-28 rounded-lg bg-muted" />
        <div className="h-10 w-28 rounded-lg bg-muted" />
      </div>

      {/* Result cards skeleton */}
      <ul className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2 flex-1">
                <div className="h-4 w-44 rounded bg-muted" />
                <div className="h-3 w-32 rounded bg-muted" />
              </div>
              <div className="h-5 w-20 rounded bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

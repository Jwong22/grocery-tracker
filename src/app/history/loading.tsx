export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <header className="space-y-1">
        <div className="h-7 w-48 rounded bg-muted" />
        <div className="h-4 w-64 rounded bg-muted" />
      </header>

      {/* Purchase list skeleton */}
      <ul className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2 flex-1">
                <div className="h-4 w-40 rounded bg-muted" />
                <div className="h-3 w-28 rounded bg-muted" />
              </div>
              <div className="h-5 w-16 rounded-full bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

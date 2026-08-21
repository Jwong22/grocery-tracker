export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <header className="space-y-2">
        <div className="h-7 w-44 rounded bg-muted" />
        <div className="h-4 w-64 rounded bg-muted" />
      </header>
      <div className="space-y-2">
        <div className="h-3 w-40 rounded bg-muted" />
        <div className="h-10 w-full rounded-lg bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="h-12 rounded-lg bg-muted" />
        <div className="h-12 rounded-lg bg-muted" />
        <div className="h-12 rounded-lg bg-muted" />
      </div>
      <div className="rounded-xl border border-dashed border-border p-8">
        <div className="h-4 w-48 mx-auto rounded bg-muted" />
      </div>
    </div>
  );
}

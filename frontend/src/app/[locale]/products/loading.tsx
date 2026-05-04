export default function ProductsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="h-9 w-48 animate-pulse rounded bg-surface-dark" />
        <div className="mt-2 h-5 w-72 animate-pulse rounded bg-surface-dark" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-border">
            <div className="aspect-square bg-surface-dark" />
            <div className="space-y-2 p-4">
              <div className="h-4 w-3/4 rounded bg-surface-dark" />
              <div className="h-5 w-1/3 rounded bg-surface-dark" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

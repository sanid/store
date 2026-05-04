export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-xl bg-surface-dark" />
        <div className="space-y-6">
          <div className="h-9 w-2/3 animate-pulse rounded bg-surface-dark" />
          <div className="h-5 w-full animate-pulse rounded bg-surface-dark" />
          <div className="h-10 w-1/4 animate-pulse rounded bg-surface-dark" />
          <div className="h-12 w-full animate-pulse rounded-lg bg-surface-dark" />
        </div>
      </div>
    </div>
  );
}

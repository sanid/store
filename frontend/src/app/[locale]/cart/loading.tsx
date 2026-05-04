export default function CartLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-24 rounded bg-surface-dark" />
        <div className="h-24 rounded-xl border border-border bg-surface-dark" />
        <div className="h-24 rounded-xl border border-border bg-surface-dark" />
      </div>
    </div>
  );
}

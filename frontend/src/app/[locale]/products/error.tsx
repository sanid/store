"use client";

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <h2 className="mb-2 text-2xl font-bold text-primary">Failed to load products</h2>
      <p className="mb-6 text-sm text-muted">{error.message || "Please try again later"}</p>
      <button
        onClick={reset}
        className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        Try again
      </button>
    </div>
  );
}

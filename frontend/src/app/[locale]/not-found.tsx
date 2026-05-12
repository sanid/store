import { Link } from "@/i18n/routing";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      <div className="absolute inset-0 -z-10 opacity-[0.03]">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-amber-500 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-stone-400 blur-3xl" />
      </div>

      <div className="animate-fade-up relative mb-2 flex items-center gap-1 text-[10rem] font-extrabold leading-none tracking-tighter text-stone-200 select-none sm:text-[12rem]">
        <span className="inline-block animate-bounce" style={{ animationDuration: "2.5s" }}>4</span>
        <span className="relative inline-block text-amber-500" style={{ animationDuration: "3s" }}>
          0
          <span className="absolute inset-0 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-16 w-16 text-stone-400 sm:h-20 sm:w-20">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </span>
        </span>
        <span className="inline-block animate-bounce" style={{ animationDuration: "2.8s", animationDelay: "0.15s" }}>4</span>
      </div>

      <div className="animate-fade-up animation-delay-100">
        <h1 className="mb-2 text-2xl font-bold text-stone-900 sm:text-3xl">
          Oops — this page got lost in transit
        </h1>
        <p className="mx-auto mb-8 max-w-md text-stone-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
        </p>
      </div>

      <div className="animate-fade-up animation-delay-200 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-600/20 transition-all hover:bg-amber-700 hover:shadow-xl hover:shadow-amber-600/30 active:scale-[0.98]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          Back to Home
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-6 py-3 text-sm font-semibold text-stone-700 transition-all hover:border-stone-300 hover:bg-stone-50 active:scale-[0.98]"
        >
          Browse Products
        </Link>
      </div>
    </div>
  );
}

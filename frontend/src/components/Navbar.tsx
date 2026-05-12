"use client";

import { Link, usePathname } from "@/i18n/routing";
import { useCart } from "@/context/CartContext";
import { useState } from "react";

export default function Navbar() {
  const { totalItems, setCartOpen } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "de";

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-stone-950 text-white">
        <nav className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-6 py-5 lg:px-10">
          {/* Left: configurator link */}
          <div className="hidden md:flex">
            <Link
              href="/curtain-configurator"
              className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-300 transition hover:text-white"
            >
              Vorhang Konfigurator
            </Link>
          </div>

          {/* Center: brand */}
          <Link
            href="/"
            className="mx-auto flex flex-col items-center leading-none"
          >
            <span className="font-serif text-2xl font-light tracking-[0.32em] text-white sm:text-[26px]">
              UNIQUE FACTORY
            </span>
            <span className="mt-1.5 text-[10px] font-medium tracking-[0.35em] text-stone-400">
              BERLIN
            </span>
          </Link>

          {/* Right: kontakt + locale + cart */}
          <div className="flex items-center justify-end gap-5">
            <a
              href="#kontakt"
              className="hidden text-[11px] font-medium uppercase tracking-[0.2em] text-stone-300 transition hover:text-white md:inline"
            >
              Kontakt
            </a>
            <Link
              href={pathname || "/"}
              locale={locale === "de" ? "en" : "de"}
              className="text-[10px] font-semibold tracking-[0.2em] text-stone-500 transition hover:text-white"
            >
              {locale === "de" ? "EN" : "DE"}
            </Link>
            <button
              onClick={() => setCartOpen(true)}
              className="relative cursor-pointer text-stone-300 transition hover:text-white"
              aria-label="Warenkorb"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.4} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
              </svg>
              {totalItems > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-semibold text-stone-950">
                  {totalItems}
                </span>
              )}
            </button>
            <button
              className="cursor-pointer text-stone-300 md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menü"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.4} stroke="currentColor" className="h-5 w-5">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                )}
              </svg>
            </button>
          </div>
        </nav>

        {mobileOpen && (
          <div className="border-t border-white/10 px-6 py-4 md:hidden">
            <Link
              href="/curtain-configurator"
              className="block py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-stone-300"
              onClick={() => setMobileOpen(false)}
            >
              Vorhang Konfigurator
            </Link>
            <a
              href="#kontakt"
              className="block py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-stone-300"
              onClick={() => setMobileOpen(false)}
            >
              Kontakt
            </a>
          </div>
        )}
      </header>

      {/* Floating side rail (like unique-factory.com) */}
      <div className="pointer-events-none fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-2 lg:flex">
        <SideButton href="/" label="Home" icon={
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        } />
        <SideButton href="/curtain-configurator" label="Konfigurator" icon={
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z" />
        } />
        <SideButton href="tel:+493023590385" label="Anrufen" external icon={
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
        } />
        <SideButton href="#kontakt" label="Termin" icon={
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        } />
      </div>
    </>
  );
}

function SideButton({
  href,
  label,
  icon,
  external,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  external?: boolean;
}) {
  const className =
    "pointer-events-auto group relative flex h-10 w-10 items-center justify-center bg-stone-900 text-white shadow-sm transition hover:bg-stone-700";
  const content = (
    <>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
        {icon}
      </svg>
      <span className="pointer-events-none absolute right-full mr-2 hidden whitespace-nowrap rounded bg-stone-900 px-2 py-1 text-[10px] uppercase tracking-wider text-white group-hover:block">
        {label}
      </span>
    </>
  );
  if (external) {
    return (
      <a href={href} className={className} aria-label={label}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={className} aria-label={label}>
      {content}
    </Link>
  );
}

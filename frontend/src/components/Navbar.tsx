"use client";

import { Link, usePathname } from "@/i18n/routing";
import { useCart } from "@/context/CartContext";
import { useState } from "react";
import Image from "next/image";

export default function Navbar() {
  const { totalItems, setCartOpen } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname() as string;
  const locale = pathname.split("/")[1] || "de";

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-stone-950 text-white">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5 lg:px-10">
          {/* Left: nav links (desktop) / hamburger (mobile) */}
          <div className="flex flex-1 items-center gap-6">
            <button
              className="-ml-1 cursor-pointer p-1 text-stone-300 md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menü"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.4} stroke="currentColor" className="h-6 w-6">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                )}
              </svg>
            </button>
            <Link
              href="/stoffe"
              className="hidden text-[11px] font-medium uppercase tracking-[0.2em] text-stone-300 transition hover:text-white md:inline"
            >
              Stoffe
            </Link>
            <Link
              href="/curtain-configurator"
              className="hidden text-[11px] font-medium uppercase tracking-[0.2em] text-stone-300 transition hover:text-white md:inline"
            >
              Konfigurator
            </Link>
            <Link
              href="/kalkulator"
              className="hidden text-[11px] font-medium uppercase tracking-[0.2em] text-stone-300 transition hover:text-white md:inline"
            >
              Kalkulator
            </Link>
          </div>

          {/* Center: brand */}
          <Link href="/" aria-label="Unique Factory Berlin" className="flex-shrink-0">
            <Image
              src="/logo.svg"
              alt="Unique Factory Berlin"
              width={292}
              height={38}
              priority
              className="h-6 w-auto sm:h-8"
            />
          </Link>

          {/* Right: kontakt + locale + cart */}
          <div className="flex flex-1 items-center justify-end gap-4 sm:gap-5">
            <a
              href="#kontakt"
              className="hidden text-[11px] font-medium uppercase tracking-[0.2em] text-stone-300 transition hover:text-white md:inline"
            >
              Kontakt
            </a>
            <Link
              href={pathname || "/" as typeof pathname | undefined as any}
              locale={locale === "de" ? "en" : "de"}
              className="hidden text-[10px] font-semibold tracking-[0.2em] text-stone-500 transition hover:text-white md:inline"
            >
              {locale === "de" ? "EN" : "DE"}
            </Link>
            <button
              onClick={() => setCartOpen(true)}
              className="relative cursor-pointer text-stone-300 transition hover:text-white"
              aria-label="Warenkorb"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.4} stroke="currentColor" className="h-6 w-6 sm:h-5 sm:w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
              </svg>
              {totalItems > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-semibold text-stone-950">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </nav>

        {mobileOpen && (
          <div className="border-t border-white/10 px-6 py-4 md:hidden">
            <Link
              href="/stoffe"
              className="block py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-stone-300"
              onClick={() => setMobileOpen(false)}
            >
              Stoffe
            </Link>
            <Link
              href="/curtain-configurator"
              className="block py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-stone-300"
              onClick={() => setMobileOpen(false)}
            >
              Konfigurator
            </Link>
            <Link
              href="/kalkulator"
              className="block py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-stone-300"
              onClick={() => setMobileOpen(false)}
            >
              Kalkulator
            </Link>
            <a
              href="#kontakt"
              className="block py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-stone-300"
              onClick={() => setMobileOpen(false)}
            >
              Kontakt
            </a>
            <Link
              href={pathname || "/" as typeof pathname | undefined as any}
              locale={locale === "de" ? "en" : "de"}
              className="block py-2 text-[10px] font-semibold tracking-[0.2em] text-stone-500"
              onClick={() => setMobileOpen(false)}
            >
              {locale === "de" ? "EN" : "DE"}
            </Link>
          </div>
        )}
      </header>

    </>
  );
}

"use client";

import { Link, usePathname } from "@/i18n/routing";
import { useCart } from "@/context/CartContext";
import { useTranslations } from "next-intl";
import { useState } from "react";

export default function Navbar() {
  const { totalItems, setCartOpen } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations("nav");
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "de";

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/90 backdrop-blur-lg">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-bold tracking-tight text-stone-900">
          <span className="text-amber-600">Custom</span>Store
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          <Link
            href="/products"
            className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
          >
            {t("products")}
          </Link>
          <Link
            href="/configurator"
            className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
          >
            Konfigurator
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={pathname || "/"}
            locale={locale === "de" ? "en" : "de"}
            className="text-xs font-semibold text-stone-400 transition-colors hover:text-stone-700"
          >
            {locale === "de" ? "EN" : "DE"}
          </Link>

          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-1.5 rounded-lg p-2 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
            aria-label={t("cart")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            {totalItems > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {totalItems}
              </span>
            )}
          </button>

          <button
            className="rounded-lg p-2 text-stone-600 transition-colors hover:bg-stone-100 md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
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
        <div className="border-t border-stone-200 bg-white px-4 py-4 md:hidden">
          <Link
            href="/products"
            className="block rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900"
            onClick={() => setMobileOpen(false)}
          >
            {t("products")}
          </Link>
          <Link
            href="/configurator"
            className="mt-1 block rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900"
            onClick={() => setMobileOpen(false)}
          >
            Konfigurator
          </Link>
        </div>
      )}
    </header>
  );
}

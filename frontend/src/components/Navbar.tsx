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
    <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold tracking-tight text-primary">
          CustomStore
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="/products"
            className="text-sm font-medium text-muted transition-colors hover:text-primary"
          >
            {t("products")}
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href={pathname || "/"}
            locale={locale === "de" ? "en" : "de"}
            className="text-xs font-medium text-muted hover:text-primary"
          >
            {locale === "de" ? "EN" : "DE"}
          </Link>

          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-primary"
            aria-label={t("cart")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
              />
            </svg>
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                {totalItems}
              </span>
            )}
          </button>

          <button
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-6 w-6"
            >
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-border bg-white px-4 py-4 md:hidden">
          <Link
            href="/products"
            className="block text-sm font-medium text-muted hover:text-primary"
            onClick={() => setMobileOpen(false)}
          >
            {t("products")}
          </Link>
        </div>
      )}
    </header>
  );
}

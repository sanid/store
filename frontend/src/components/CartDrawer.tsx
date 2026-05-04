"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function CartDrawer() {
  const { items, updateQuantity, removeItem, subtotal, totalItems, cartOpen, setCartOpen } = useCart();
  const t = useTranslations("cart");
  const drawerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (cartOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [cartOpen]);

  useEffect(() => {
    if (!cartOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setCartOpen(false);
        return;
      }

      if (e.key !== "Tab" || !drawerRef.current) return;

      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [cartOpen, setCartOpen]);

  return (
    <>
      {cartOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 transition-opacity"
          onClick={() => setCartOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          cartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-primary">
            {t("title")}
            {totalItems > 0 && (
              <span className="ml-2 text-sm font-normal text-muted">({totalItems})</span>
            )}
          </h2>
          <button
            onClick={() => setCartOpen(false)}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-primary"
            aria-label="Close cart"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="mb-3 h-12 w-12 text-muted/30">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              </svg>
              <p className="text-sm text-muted">{t("empty")}</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.cartItemId} className="flex gap-3">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-surface-dark">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[9px] text-muted">No img</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="truncate text-sm font-medium text-primary">{item.name}</h4>
                    <p className="text-sm font-semibold text-primary">{formatPrice(item.totalPrice)}</p>

                    {item.customization && Object.keys(item.customization).length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-0.5">
                        {Object.entries(item.customization).map(([key, val]) => {
                          if (!val || val === "") return null;
                          const isColor = String(val).startsWith("#");
                          return (
                            <span key={key} className="inline-flex items-center gap-0.5 rounded bg-surface px-1 py-px text-[9px] text-muted">
                              {isColor && (
                                <span className="inline-block h-2 w-2 rounded-full border border-border" style={{ backgroundColor: String(val) }} />
                              )}
                              {isColor ? "" : String(val).slice(0, 12)}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center rounded-md border border-border">
                        <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="cursor-pointer px-1.5 py-0.5 text-xs text-muted transition-colors hover:bg-surface hover:text-primary" aria-label="Decrease quantity">&minus;</button>
                        <span className="min-w-[1.25rem] text-center text-xs font-medium">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="cursor-pointer px-1.5 py-0.5 text-xs text-muted transition-colors hover:bg-surface hover:text-primary" aria-label="Increase quantity">+</button>
                      </div>
                      <button onClick={() => removeItem(item.cartItemId)} className="cursor-pointer text-[10px] text-red-500 transition-colors hover:text-red-700">{t("remove")}</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border px-6 py-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-muted">{t("subtotal")}</span>
              <span className="text-base font-bold text-primary">{formatPrice(subtotal)}</span>
            </div>
            <p className="mb-3 text-[10px] text-muted">{t("shippingCalculated")}</p>
            <Link
              href="/checkout"
              onClick={() => setCartOpen(false)}
              className="block w-full rounded-lg bg-accent py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              {t("checkout", { amount: formatPrice(subtotal) })}
            </Link>
            <Link
              href="/cart"
              onClick={() => setCartOpen(false)}
              className="mt-2 block text-center text-xs text-muted hover:text-primary"
            >
              {t("viewCart")}
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}

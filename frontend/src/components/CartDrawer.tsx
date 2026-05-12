"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/context/CartContext";
import { formatPrice, formatCustomizationForDisplay } from "@/lib/utils";
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
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm transition-opacity"
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
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-stone-900">
            {t("title")}
            {totalItems > 0 && (
              <span className="ml-2 text-sm font-normal text-stone-400">({totalItems})</span>
            )}
          </h2>
          <button
            onClick={() => setCartOpen(false)}
            className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
            aria-label="Close cart"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="mb-4 h-12 w-12 text-stone-200">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              <p className="text-sm text-stone-400">{t("empty")}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.cartItemId} className="flex gap-3 rounded-xl border border-stone-100 bg-white p-2.5 transition hover:border-stone-200">
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-stone-100">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[9px] text-stone-300">No img</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="truncate text-sm font-medium text-stone-900">{item.name}</h4>
                    <p className="text-sm font-semibold text-stone-900">{formatPrice(item.totalPrice)}</p>

                    {item.customization && Object.keys(item.customization).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {formatCustomizationForDisplay(item.customization).slice(0, 5).map((it) => (
                          <span
                            key={it.key}
                            className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-600"
                          >
                            {it.swatch && (
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full border border-stone-300"
                                style={{ backgroundColor: it.swatch }}
                              />
                            )}
                            <span className="font-medium text-stone-500">{it.label}:</span>
                            {!it.swatch && <span>{it.value}</span>}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center rounded-md border border-stone-200">
                        <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="cursor-pointer px-1.5 py-0.5 text-xs text-stone-400 transition-colors hover:bg-stone-50 hover:text-stone-700" aria-label="Decrease quantity">&minus;</button>
                        <span className="min-w-[1.25rem] text-center text-xs font-medium text-stone-700">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="cursor-pointer px-1.5 py-0.5 text-xs text-stone-400 transition-colors hover:bg-stone-50 hover:text-stone-700" aria-label="Increase quantity">+</button>
                      </div>
                      <button onClick={() => removeItem(item.cartItemId)} className="cursor-pointer text-[10px] text-stone-400 transition-colors hover:text-red-600">{t("remove")}</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-stone-200 px-6 py-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-stone-500">{t("subtotal")}</span>
              <span className="text-base font-bold text-stone-900">{formatPrice(subtotal)}</span>
            </div>
            <p className="mb-3 text-[10px] text-stone-400">{t("shippingCalculated")}</p>
            <Link
              href="/checkout"
              onClick={() => setCartOpen(false)}
              className="block w-full rounded-lg bg-stone-900 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-stone-800"
            >
              {t("checkout", { amount: formatPrice(subtotal) })}
            </Link>
            <Link
              href="/cart"
              onClick={() => setCartOpen(false)}
              className="mt-2 block text-center text-xs text-stone-400 hover:text-stone-700"
            >
              {t("viewCart")}
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}

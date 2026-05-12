"use client";

import { useCart } from "@/context/CartContext";
import { formatPrice, formatCustomizationForDisplay } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function CartContent() {
  const { items, updateQuantity, removeItem, clearCart, subtotal } = useCart();
  const t = useTranslations("cart");

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <svg
          className="mb-4 h-16 w-16 text-muted/30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
          />
        </svg>
        <p className="mb-4 text-lg text-muted">{t("empty")}</p>
        <Link
          href="/products"
          className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          {t("browseProducts")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 text-2xl font-semibold text-primary">{t("title")}</h1>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.cartItemId}
              className="flex gap-4 rounded-xl border border-border bg-white p-4"
            >
              <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-surface-dark">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                    No img
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h3 className="text-sm font-semibold text-primary">{item.name}</h3>
                <p className="text-sm font-medium text-primary">
                  {formatPrice(item.totalPrice)}
                </p>

                {item.customization &&
                  Object.keys(item.customization).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {formatCustomizationForDisplay(item.customization).map((it) => (
                        <span
                          key={it.key}
                          className="inline-flex items-center gap-1 rounded bg-surface px-1.5 py-0.5 text-[10px] text-muted"
                        >
                          {it.swatch && (
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full border border-border"
                              style={{ backgroundColor: it.swatch }}
                            />
                          )}
                          <span className="font-medium">{it.label}:</span>
                          <span>{it.value}</span>
                        </span>
                      ))}
                    </div>
                  )}

                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center rounded-md border border-border">
                    <button
                      onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                      className="cursor-pointer px-2 py-1 text-xs text-muted transition-colors hover:bg-surface hover:text-primary"
                      aria-label="Decrease quantity"
                    >
                      &minus;
                    </button>
                    <span className="min-w-[1.5rem] text-center text-xs font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                      className="cursor-pointer px-2 py-1 text-xs text-muted transition-colors hover:bg-surface hover:text-primary"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.cartItemId)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    {t("remove")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="rounded-xl border border-border bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-primary">{t("orderSummary")}</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">{t("subtotal")}</span>
              <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">{t("shipping")}</span>
              <span className="text-sm text-muted">{t("calculatedAtCheckout")}</span>
            </div>
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex justify-between">
              <span className="text-base font-semibold text-primary">{t("total")}</span>
              <span className="text-base font-bold text-primary">
                {formatPrice(subtotal)}
              </span>
            </div>
          </div>
          <Link
            href="/checkout"
            className="mt-6 block rounded-lg bg-accent px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            {t("proceedToCheckout")}
          </Link>
          <button
            onClick={clearCart}
            className="mt-3 w-full text-center text-xs text-muted hover:text-red-500"
          >
            {t("clearCart")}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}

"use client";

import { useCart } from "@/context/CartContext";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { use, useEffect, useRef } from "react";

export default function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string; payment_intent?: string }>;
}) {
  const { clearCart, items } = useCart();
  const t = useTranslations("success");
  const { order_id, payment_intent } = use(searchParams);
  const cleared = useRef(false);

  useEffect(() => {
    if (!cleared.current && items.length > 0) {
      clearCart();
      cleared.current = true;
    }
  }, [clearCart, items.length]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <svg
          className="h-8 w-8 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="mb-3 text-3xl font-bold text-primary">{t("title")}</h1>
      <p className="mb-2 text-muted">{t("message")}</p>
      {(order_id || payment_intent) && (
        <p className="mb-6 text-xs text-muted">
          {t("reference", { id: (order_id || payment_intent || "").slice(-12).toUpperCase() })}
        </p>
      )}
      <div className="flex gap-4">
        <Link
          href="/products"
          className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          {t("continueShopping")}
        </Link>
      </div>
    </div>
  );
}

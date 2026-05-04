"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function CancelPage() {
  const t = useTranslations("cancel");

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
        <svg
          className="h-8 w-8 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
          />
        </svg>
      </div>
      <h1 className="mb-3 text-3xl font-bold text-primary">{t("title")}</h1>
      <p className="mb-6 text-muted">{t("message")}</p>
      <div className="flex gap-4">
        <Link
          href="/checkout"
          className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          {t("tryAgain")}
        </Link>
        <Link
          href="/products"
          className="rounded-lg border border-border px-6 py-2.5 text-sm font-semibold text-primary hover:bg-surface"
        >
          {t("browse")}
        </Link>
      </div>
    </div>
  );
}

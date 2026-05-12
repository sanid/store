"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="mt-auto border-t border-stone-200 bg-stone-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-lg font-bold text-stone-900">
              <span className="text-amber-600">Custom</span>Store
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">{t("tagline")}</p>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-400">
              {t("shop")}
            </h4>
            <ul className="mt-3 space-y-2.5">
              <li>
                <Link href="/products" className="text-sm text-stone-600 transition-colors hover:text-stone-900">
                  {t("products")}
                </Link>
              </li>
              <li>
                <Link href="/configurator" className="text-sm text-stone-600 transition-colors hover:text-stone-900">
                  Konfigurator
                </Link>
              </li>
              <li>
                <Link href="/versand" className="text-sm text-stone-600 transition-colors hover:text-stone-900">
                  {t("shippingPayment")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-400">
              {t("legal")}
            </h4>
            <ul className="mt-3 space-y-2.5">
              <li>
                <Link href="/impressum" className="text-sm text-stone-600 transition-colors hover:text-stone-900">
                  {t("imprint")}
                </Link>
              </li>
              <li>
                <Link href="/datenschutz" className="text-sm text-stone-600 transition-colors hover:text-stone-900">
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link href="/agb" className="text-sm text-stone-600 transition-colors hover:text-stone-900">
                  {t("terms")}
                </Link>
              </li>
              <li>
                <Link href="/widerrufsbelehrung" className="text-sm text-stone-600 transition-colors hover:text-stone-900">
                  {t("withdrawal")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-400">
              {t("contact")}
            </h4>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">
              {t("contactText")}
              <br />
              <a href="mailto:info@customstore.com" className="font-medium text-amber-600 transition-colors hover:text-amber-700">
                info@customstore.com
              </a>
            </p>
          </div>
        </div>
        <div className="mt-10 border-t border-stone-200 pt-6 text-center text-xs text-stone-400">
          <p>&copy; {new Date().getFullYear()} CustomStore. {t("rights")}</p>
          <p className="mt-1">Alle Preise Endpreise gemäß § 19 UStG (Kleinunternehmerregelung)</p>
        </div>
      </div>
    </footer>
  );
}

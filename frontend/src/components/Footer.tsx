"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-lg font-bold text-primary">CustomStore</h3>
            <p className="mt-2 text-sm text-muted">{t("tagline")}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-primary">
              {t("shop")}
            </h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="/products"
                  className="text-sm text-muted transition-colors hover:text-primary"
                >
                  {t("products")}
                </Link>
              </li>
              <li>
                <Link
                  href="/versand"
                  className="text-sm text-muted transition-colors hover:text-primary"
                >
                  {t("shippingPayment")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-primary">
              {t("legal")}
            </h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/impressum" className="text-sm text-muted transition-colors hover:text-primary">
                  {t("imprint")}
                </Link>
              </li>
              <li>
                <Link href="/datenschutz" className="text-sm text-muted transition-colors hover:text-primary">
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link href="/agb" className="text-sm text-muted transition-colors hover:text-primary">
                  {t("terms")}
                </Link>
              </li>
              <li>
                <Link href="/widerrufsbelehrung" className="text-sm text-muted transition-colors hover:text-primary">
                  {t("withdrawal")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-primary">
              {t("contact")}
            </h4>
            <p className="mt-3 text-sm text-muted">
              {t("contactText")}
              <br />
              <a href="mailto:info@customstore.com" className="text-accent hover:text-accent-hover">
                info@customstore.com
              </a>
            </p>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted">
          <p className="mb-1">&copy; {new Date().getFullYear()} CustomStore. {t("rights")}</p>
          <p>Alle Preise Endpreise gemäß § 19 UStG (Kleinunternehmerregelung)</p>
        </div>
      </div>
    </footer>
  );
}

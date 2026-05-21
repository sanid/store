import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import { CartProvider } from "@/context/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import CookieConsent from "@/components/CookieConsent";

export const metadata: Metadata = {
  title: {
    default: "Unique Factory — Maßgefertigte Vorhänge & Gardinen",
    template: "%s | Unique Factory",
  },
  description:
    "Unique Factory — Ihr Fachgeschäft für maßgefertigte Vorhänge, Gardinen und Dekoschals. Konfigurieren Sie Ihre Traumvorhänge individuell nach Wunsch.",
  openGraph: {
    type: "website",
    siteName: "Unique Factory",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Unique Factory — Maßgefertigte Vorhänge & Gardinen",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: process.env.NODE_ENV === "production",
    follow: process.env.NODE_ENV === "production",
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:text-white focus:outline-none">
        Skip to content
      </a>
      <NextIntlClientProvider>
        <CartProvider>
          <Navbar />
          <CartDrawer />
          <main id="main-content" className="flex-1">{children}</main>
          <Footer />
          <CookieConsent />
        </CartProvider>
      </NextIntlClientProvider>
    </>
  );
}

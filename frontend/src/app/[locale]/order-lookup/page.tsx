import type { Metadata } from "next";
import { Suspense } from "react";
import OrderLookupClient from "./OrderLookupClient";

export const metadata: Metadata = {
  title: "Bestellung verfolgen",
  description: "Status Ihrer Bestellung mit Bestellnummer und E-Mail einsehen.",
};

export default function OrderLookupPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-2 text-3xl font-bold text-primary">Bestellung verfolgen</h1>
      <p className="mb-8 text-sm text-muted">
        Geben Sie Ihre Bestellnummer und die bei der Bestellung verwendete E-Mail-Adresse ein.
      </p>
      <Suspense fallback={null}>
        <OrderLookupClient />
      </Suspense>
    </div>
  );
}

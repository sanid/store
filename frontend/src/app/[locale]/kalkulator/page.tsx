import { setRequestLocale } from "next-intl/server";
import QuoteCalculator from "@/components/quote/QuoteCalculator";
import { OBJECT_TYPES, SERVICES } from "@/lib/quote/catalog";
import type { ObjectTypeId, ServiceId } from "@/lib/quote/catalog";

export const metadata = {
  title: "KI-Schnellkalkulator – Unique Factory",
  description:
    "Fotos hochladen und in zwei Minuten einen Richtpreis für Neubezug, Reparatur oder Sonderanfertigung erhalten — inklusive Materialvorschau am eigenen Stück.",
};

export default async function KalkulatorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  /** Set by the teaser on the home page, so the form opens on the right step. */
  searchParams: Promise<{ service?: string; objekt?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { service, objekt } = await searchParams;

  return (
    <QuoteCalculator
      initialService={SERVICES.some((s) => s.id === service) ? (service as ServiceId) : undefined}
      initialObjectType={
        OBJECT_TYPES.some((t) => t.id === objekt) ? (objekt as ObjectTypeId) : undefined
      }
    />
  );
}

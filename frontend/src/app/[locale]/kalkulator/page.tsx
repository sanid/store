import { setRequestLocale } from "next-intl/server";
import QuoteCalculator from "@/components/quote/QuoteCalculator";

export const metadata = {
  title: "KI-Schnellkalkulator – Unique Factory",
  description:
    "Fotos hochladen und in zwei Minuten einen Richtpreis für Neubezug, Reparatur oder Sonderanfertigung erhalten — inklusive Material- und Aufwandsschätzung.",
};

export default async function KalkulatorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <QuoteCalculator />;
}

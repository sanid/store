import { setRequestLocale } from "next-intl/server";
import CurtainConfigurator from "@/components/customizer/CurtainConfigurator";

export const metadata = {
  title: "Vorhang Konfigurator – Unique Factory",
  description:
    "Konfiguriere deinen Vorhang nach Maß: Stoff, Faltenband, Futter und mehr — interaktive 3D-Vorschau.",
};

export default async function CurtainConfiguratorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ fabric?: string }>;
}) {
  const { locale } = await params;
  const { fabric } = await searchParams;
  setRequestLocale(locale);

  return <CurtainConfigurator initialFabricId={fabric} />;
}

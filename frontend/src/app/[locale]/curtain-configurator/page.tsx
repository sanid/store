import { setRequestLocale } from "next-intl/server";
import CurtainConfigurator from "@/components/customizer/CurtainConfigurator";

export const metadata = {
  title: "Vorhang Konfigurator – Unique Factory",
  description:
    "Konfiguriere deinen Vorhang nach Maß: Stoff, Faltenband, Futter und mehr — interaktive 3D-Vorschau.",
};

export default async function CurtainConfiguratorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CurtainConfigurator />;
}

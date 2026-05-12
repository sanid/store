import { setRequestLocale } from "next-intl/server";
import FurnitureConfigurator from "@/components/customizer/FurnitureConfigurator";
import { getProductBySlug } from "@/lib/strapi";

const CONFIGURATOR_SLUG = "custom-furniture-piece";

export const metadata = {
  title: "Sideboard Konfigurator",
  description: "Konfiguriere dein Sideboard nach Maß in 3D – Größe, Farbe, Türen und mehr.",
};

export default async function ConfiguratorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const product = await getProductBySlug(CONFIGURATOR_SLUG);

  return (
    <FurnitureConfigurator
      product={product ?? undefined}
      initialName="Sideboard mit Türen und Schubladen"
    />
  );
}

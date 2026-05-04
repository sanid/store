import type { Metadata } from "next";
import { getProducts, getCategories } from "@/lib/strapi";
import ProductGrid from "./ProductGrid";
import { setRequestLocale, getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "All Products",
  description: "Browse our collection of customizable products.",
};

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("products");

  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary">{t("title")}</h1>
        <p className="mt-2 text-muted">{t("subtitle")}</p>
      </div>
      <ProductGrid products={products} categories={categories} />
    </div>
  );
}

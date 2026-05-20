import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/strapi";
import { routing } from "@/i18n/routing";

function localizePath(internalPath: string, locale: string): string {
  const entry = routing.pathnames[internalPath as keyof typeof routing.pathnames];
  if (!entry) return internalPath;
  if (typeof entry === "string") return entry;
  return (entry as Record<string, string>)[locale] || internalPath;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://customstore.com";
  const products = await getProducts();
  const locale = routing.defaultLocale;

  const productUrls = products.map((product) => ({
    url: `${baseUrl}/${locale}${localizePath("/products", locale)}/${product.slug}`,
    lastModified: new Date(product.updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const staticPages = [
    "/products",
    "/curtain-configurator",
    "/stoffe",
    "/versand",
    "/how-to-shop",
    "/order-lookup",
    "/impressum",
    "/datenschutz",
    "/agb",
    "/widerrufsbelehrung",
  ].map((internalPath) => ({
    url: `${baseUrl}/${locale}${localizePath(internalPath, locale)}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: internalPath === "/products" ? 0.9 : 0.3,
  }));

  return [
    {
      url: `${baseUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...staticPages,
    ...productUrls,
  ];
}

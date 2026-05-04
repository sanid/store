import type { Product } from "@/lib/types";
import { getStrapiImageUrl } from "@/lib/strapi";

interface ProductSchemaProps {
  product: Product;
}

export default function ProductSchema({ product }: ProductSchemaProps) {
  const imageUrl = getStrapiImageUrl(product.image, "large");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const currency = process.env.NEXT_PUBLIC_CURRENCY || "EUR";

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription || product.description,
    image: imageUrl ? [imageUrl] : undefined,
    sku: product.sku || undefined,
    mpn: product.sku || undefined,
    brand: {
      "@type": "Brand",
      name: "CustomStore",
    },
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/products/${product.slug}`,
      priceCurrency: currency,
      price: (product.price / 100).toFixed(2),
      priceValidUntil: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      availability:
        product.inventory > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "CustomStore",
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c').replace(/>/g, '\\u003e') }}
    />
  );
}

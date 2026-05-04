import type { Metadata } from "next";
import { getProductBySlug, getProducts, getStrapiImageUrl } from "@/lib/strapi";
import ProductCustomizer from "@/components/ProductCustomizer";
import ProductSchema from "@/components/ProductSchema";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

interface ProductPageProps {
  params: Promise<{ slug: string; locale: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "Product Not Found" };
  }

  const imageUrl = getStrapiImageUrl(product.image, "large");

  return {
    title: product.name,
    description: product.shortDescription || product.name,
    openGraph: {
      title: product.name,
      description: product.shortDescription || undefined,
      type: "website",
      images: imageUrl ? [{ url: imageUrl, width: 638, height: 722, alt: product.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: product.shortDescription || undefined,
      images: imageUrl ? [imageUrl] : undefined,
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/products/${product.slug}`,
    },
  };
}

export const dynamicParams = true;

export async function generateStaticParams() {
  const products = await getProducts({
    "pagination[limit]": "100",
  });

  return products.map((product) => ({
    slug: product.slug,
  }));
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug, locale } = await params;
  setRequestLocale(locale);

  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <>
      <ProductSchema product={product} />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <ProductCustomizer product={product} />
      </div>
    </>
  );
}

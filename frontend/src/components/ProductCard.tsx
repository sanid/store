import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import type { Product } from "@/lib/types";
import { getStrapiImageUrl } from "@/lib/strapi";
import { formatPrice } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const imageUrl = getStrapiImageUrl(product.image, "medium");
  const hasCustomizer =
    product.customizationSchema &&
    product.customizationSchema.fields &&
    product.customizationSchema.fields.length > 0;
  const t = useTranslations("products");

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-white transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-surface-dark">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            No image
          </div>
        )}
        {hasCustomizer && (
          <span className="absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
            {t("customizable")}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-semibold text-primary group-hover:text-accent">
          {product.name}
        </h3>
        {product.shortDescription && (
          <p className="mt-1 text-xs text-muted line-clamp-2">
            {product.shortDescription}
          </p>
        )}
        <p className="mt-auto pt-3 text-base font-bold text-primary">
          {formatPrice(product.price)}
        </p>
      </div>
    </Link>
  );
}

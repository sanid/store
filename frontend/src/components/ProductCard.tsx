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
      className="group flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white transition-all duration-200 hover:border-stone-300 hover:shadow-lg hover:shadow-stone-200/50"
    >
      <div className="relative aspect-square overflow-hidden bg-stone-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg className="h-10 w-10 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
          </div>
        )}
        {hasCustomizer && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-stone-900 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
            {t("customizable")}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-semibold text-stone-900 transition-colors group-hover:text-amber-700">
          {product.name}
        </h3>
        {product.shortDescription && (
          <p className="mt-1 text-xs text-stone-500 line-clamp-2">
            {product.shortDescription}
          </p>
        )}
        <div className="mt-auto pt-3 flex items-baseline justify-between">
          <p className="text-base font-bold text-stone-900">
            {product.price === 0 ? "ab" : ""} {product.price === 0 ? "" : formatPrice(product.price)}
          </p>
          <svg className="h-4 w-4 text-stone-300 transition-colors group-hover:text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
        </div>
      </div>
    </Link>
  );
}

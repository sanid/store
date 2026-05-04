"use client";

import { useState, useCallback, useMemo } from "react";
import type { Product, CustomizationSchema } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { getStrapiImageUrl } from "@/lib/strapi";
import { formatPrice } from "@/lib/utils";
import CustomizerForm from "@/components/customizer/CustomizerForm";
import dynamic from "next/dynamic";

const Preview3D = dynamic(() => import("@/components/customizer/Preview3D"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full animate-pulse rounded-xl border border-border bg-surface-dark lg:h-[400px]" />
  ),
});
import Image from "next/image";
import DOMPurify from "isomorphic-dompurify";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

interface ProductCustomizerProps {
  product: Product;
}

export default function ProductCustomizer({ product }: ProductCustomizerProps) {
  const { addItem } = useCart();
  const t = useTranslations("product");
  const [customization, setCustomization] = useState<Record<string, unknown>>({});
  const [priceAdjustment, setPriceAdjustment] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const mainImageIndex = useMemo(() => {
    if (!selectedImage || !product.images?.length) return -1;
    return product.images.findIndex((img) => getStrapiImageUrl(img, "large") === selectedImage);
  }, [selectedImage, product.images]);

  const goToPrev = () => {
    if (!product.images?.length) return;
    if (mainImageIndex <= 0) {
      setSelectedImage(null);
    } else {
      const prevUrl = getStrapiImageUrl(product.images[mainImageIndex - 1], "large");
      setSelectedImage(prevUrl!);
    }
  };

  const goToNext = () => {
    if (!product.images?.length) return;
    if (mainImageIndex < 0) {
      const firstUrl = getStrapiImageUrl(product.images[0], "large");
      setSelectedImage(firstUrl!);
    } else if (mainImageIndex < product.images.length - 1) {
      const nextUrl = getStrapiImageUrl(product.images[mainImageIndex + 1], "large");
      setSelectedImage(nextUrl!);
    }
  };

  const hasGallery = product.images && product.images.length > 0;

  const schema = product.customizationSchema as CustomizationSchema | null;
  const hasCustomizer = schema && schema.fields && schema.fields.length > 0;
  const totalPrice = product.price + priceAdjustment;
  const imageUrl = selectedImage || getStrapiImageUrl(product.image, "large");

  const handleCustomizationChange = useCallback(
    (values: Record<string, unknown>, adj: number) => {
      setCustomization(values);
      setPriceAdjustment(adj);
    },
    []
  );

  const handleAddToCart = () => {
    addItem({
      productId: String(product.id),
      documentId: product.documentId,
      name: product.name,
      basePrice: product.price,
      totalPrice,
      quantity,
      image: imageUrl || "",
      customization: hasCustomizer ? customization : {},
      customizationPriceAdjustment: priceAdjustment,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-muted">
        <Link href="/products" className="hover:text-primary">{t("allProducts")}</Link>
        <span>/</span>
        <span className="text-primary">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-4">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-surface-dark group">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              preload
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted">
              No image
            </div>
          )}
          {hasGallery && (
            <>
              <button
                type="button"
                onClick={goToPrev}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-primary shadow transition-opacity opacity-0 group-hover:opacity-100 hover:bg-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
              </button>
              <button
                type="button"
                onClick={goToNext}
                aria-label="Next image"
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-primary shadow transition-opacity opacity-0 group-hover:opacity-100 hover:bg-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
              </button>
            </>
          )}
        </div>
        {hasGallery && (
          <div className="flex gap-2 overflow-x-auto">
            {product.images!.map((img, i) => {
              const thumbUrl = getStrapiImageUrl(img, "thumbnail");
              const fullUrl = getStrapiImageUrl(img, "large");
              const isActive = selectedImage === fullUrl;
              return thumbUrl ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSelectedImage(isActive ? null : fullUrl!);
                  }}
                  className={`relative h-16 w-16 cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${
                    isActive ? "border-accent ring-2 ring-accent/30" : "border-border hover:border-muted hover:scale-105"
                  }`}
                >
                  <Image
                    src={thumbUrl}
                    alt={`${product.name} ${i + 1}`}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </button>
              ) : null;
            })}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div>
          {product.categories && product.categories.length > 0 && (
            <div className="mb-2 flex gap-2">
              {product.categories.map((cat) => (
                <span
                  key={cat.documentId}
                  className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-muted"
                >
                  {cat.name}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-3xl font-bold text-primary">{product.name}</h1>
          <p className="mt-2 text-muted">{product.shortDescription}</p>
        </div>

        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-primary">
            {formatPrice(totalPrice)}
          </span>
          {priceAdjustment > 0 && (
            <span className="text-sm text-muted line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted">Endpreis gemäß § 19 UStG (Kleinunternehmerregelung)</p>

        {hasCustomizer && (
          <Preview3D customization={customization} schema={schema} />
        )}

        {hasCustomizer && (
          <CustomizerForm
            schema={schema}
            basePrice={product.price}
            onCustomizationChange={handleCustomizationChange}
          />
        )}

        <div className="flex items-center gap-4 border-t border-border pt-6">
          <div className="flex items-center rounded-lg border border-border">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              aria-label="Decrease quantity"
              className="cursor-pointer px-3 py-2 text-sm text-muted transition-colors hover:bg-surface hover:text-primary"
            >
              &minus;
            </button>
            <span className="min-w-[2rem] text-center text-sm font-medium">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(Math.min(quantity + 1, product.inventory > 0 ? product.inventory : 99))}
              aria-label="Increase quantity"
              className="cursor-pointer px-3 py-2 text-sm text-muted transition-colors hover:bg-surface hover:text-primary"
            >
              +
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={product.inventory === 0}
            className="flex-1 cursor-pointer rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {added
              ? t("added")
              : product.inventory === 0
                ? t("outOfStock")
                : t("addToCart")}
          </button>
        </div>

        {product.inventory > 0 && product.inventory <= 10 && (
          <p className="text-xs text-amber-600">
            {t("onlyLeft", { count: product.inventory })}
          </p>
        )}

        {product.description && (
          <div className="border-t border-border pt-6">
            <h3 className="mb-3 text-sm font-semibold text-primary">{t("description")}</h3>
            <div
              className="prose prose-sm max-w-none text-muted"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description) }}
            />
          </div>
        )}
      </div>
      </div>
    </>
  );
}

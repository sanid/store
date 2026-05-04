import { getFeaturedProducts, getProducts } from "@/lib/strapi";
import ProductCard from "@/components/ProductCard";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [featured, allProducts] = await Promise.all([
    getFeaturedProducts(),
    getProducts({ "pagination[limit]": "6" }),
  ]);

  const products = featured.length > 0 ? featured : allProducts;

  return <HomeContent featured={featured} products={products} />;
}

function HomeContent({
  featured,
  products,
}: {
  featured: any[];
  products: any[];
}) {
  const t = useTranslations("home");

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-light to-primary">
        <div className="mx-auto flex max-w-7xl flex-col items-center px-4 py-24 text-center sm:py-32">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {t("title1")}
            <br />
            <span className="text-accent">{t("title2")}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-gray-300">
            {t("subtitle")}
          </p>
          <Link
            href="/products"
            className="mt-8 inline-flex items-center rounded-lg bg-accent px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            {t("browseProducts")}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-primary">
            {featured.length > 0 ? t("featuredProducts") : t("ourProducts")}
          </h2>
          <Link
            href="/products"
            className="text-sm font-medium text-accent hover:text-accent-hover"
          >
            {t("viewAll")}
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <p className="text-muted">{t("noProducts")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.documentId} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

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
      <section className="relative overflow-hidden bg-stone-900">
        <div className="absolute inset-0 opacity-[0.07]" aria-hidden>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-stone-900/80" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-32 lg:px-8 lg:gap-16">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Maßgefertigt in der EU
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[3.5rem]">
              {t("title1")}
              <br />
              <span className="text-amber-300">
                {t("title2")}
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-stone-400">{t("subtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/configurator"
                className="group inline-flex items-center gap-2 rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-stone-900 shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400 hover:shadow-amber-500/40"
              >
                Konfigurator starten
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
              >
                {t("browseProducts")}
              </Link>
            </div>
          </div>

          <div className="relative hidden lg:block animate-fade-up animation-delay-200">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-amber-500/10 to-orange-500/5 blur-2xl" aria-hidden />
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-stone-800 to-stone-900">
              <div className="absolute inset-0 bg-gradient-to-br from-stone-800/50 to-stone-900/50" />
              <div className="absolute inset-8">
                <div className="grid grid-cols-4 grid-rows-2 gap-2 h-full">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border transition-colors ${
                        [0, 3, 5].includes(i)
                          ? "border-amber-400/20 bg-stone-900/90"
                          : "border-white/5 bg-stone-700/30"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-stone-900/80 to-transparent p-6 pt-16">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    ))}
                  </div>
                  <span className="text-[11px] font-medium text-stone-300">Live in 3D anpassen</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 divide-x divide-stone-200 lg:grid-cols-4">
            {[
              { value: "10.000+", label: "Konfigurationen" },
              { value: "2–3", label: "Wochen Lieferzeit" },
              { value: "100%", label: "Maßanfertigung" },
              { value: "EU", label: "Handgefertigt" },
            ].map((stat) => (
              <div key={stat.label} className="px-6 py-6 text-center lg:py-8">
                <div className="text-xl font-bold text-stone-900 lg:text-2xl">{stat.value}</div>
                <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-stone-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 lg:grid lg:grid-cols-2 lg:gap-0">
          <div className="p-8 lg:p-12 lg:pr-8">
            <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
              Neu
            </span>
            <h2 className="mt-4 text-2xl font-bold text-stone-900 lg:text-3xl">Sideboard-Konfigurator</h2>
            <p className="mt-3 max-w-md text-stone-600 leading-relaxed">
              Größe, Farbe, Türen, Sockel — passe jedes Detail in Echtzeit an und sieh die Änderungen sofort im 3D-Modell.
            </p>
            <ul className="mt-5 space-y-2">
              {["8 Farben zur Auswahl", "Variable Maße (80–240 cm)", "Türen & Fächer frei kombinierbar"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-stone-700">
                  <svg className="h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/configurator"
              className="group mt-6 inline-flex items-center gap-2 rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              Jetzt konfigurieren
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
            </Link>
          </div>
          <div className="relative bg-stone-800 p-6 lg:p-8">
            <div className="grid grid-cols-3 grid-rows-2 gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`aspect-[4/3] rounded-lg ${
                    [1, 2, 4].includes(i) ? "bg-stone-900 ring-1 ring-amber-400/20" : "bg-amber-500/10 ring-1 ring-amber-400/10"
                  }`}
                />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-[11px] text-stone-400">
              <span>3D-Vorschau</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                Live
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-stone-900 lg:text-3xl">
              {featured.length > 0 ? t("featuredProducts") : t("ourProducts")}
            </h2>
            <p className="mt-1 text-sm text-stone-500">Handverlesen für dich</p>
          </div>
          <Link
            href="/products"
            className="group flex items-center gap-1 text-sm font-medium text-accent transition hover:text-accent-hover"
          >
            {t("viewAll")}
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 p-12 text-center">
            <p className="text-stone-500">{t("noProducts")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product: any) => (
              <ProductCard key={product.documentId} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-stone-900 lg:text-3xl">Fertig für dein Traumstück?</h2>
            <p className="mx-auto mt-3 max-w-md text-stone-500">
              Konfiguriere dein Möbelstück in Minuten. Größe, Farbe, Material — ganz nach deinen Wünschen.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/configurator"
                className="group inline-flex items-center gap-2 rounded-full bg-stone-900 px-7 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-stone-800"
              >
                Konfigurator starten
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center rounded-full border border-stone-300 bg-white px-7 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
              >
                Produkte ansehen
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

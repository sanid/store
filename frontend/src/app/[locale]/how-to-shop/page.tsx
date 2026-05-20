import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";

export const metadata: Metadata = {
  title: "So bestellen Sie",
  description:
    "In wenigen Schritten zu Ihren perfekten Vorhängen – einfach, individuell und transparent.",
};

export default async function HowToShopPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-2 text-xs text-stone-500">
          <Link href="/" className="transition hover:text-stone-900">
            Home
          </Link>
          <span>›</span>
          <span className="text-stone-900">So bestellen Sie</span>
        </div>

        <h1 className="font-serif text-4xl font-light tracking-tight text-stone-900">
          How to shop
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-stone-600">
          In wenigen Schritten zu Ihren perfekten Vorhängen – einfach,
          individuell und transparent. Von der Stoffauswahl bis zur Lieferung
          an Ihre Tür.
        </p>
      </div>

      <div className="border-t border-stone-200">
        <div className="mx-auto max-w-6xl divide-y divide-stone-200 px-4 sm:px-6 lg:px-8">
          <Step
            n={1}
            title="Stoff auswählen"
            text="Stöbern Sie durch unsere Kollektionen und finden Sie den passenden Stoff für Ihr Projekt. Nutzen Sie die Filter nach Material, Farbe, Transparenz oder Muster. Jeder Stoff ist mit detaillierten Informationen und einem echten Farbwert versehen."
            bullets={[
              "Stoffe von Romo, Zimmer Rohde, Kirkby Design, Villa Nova und mehr",
              "Filter nach Material, Farbe, Muster & Transparenz",
              "Farbenvorschau in Echtzeit im 3D-Konfigurator",
              "Detaillierte Produktinformationen & Preise",
            ]}
            cta={{ label: "Stoffe durchsuchen", href: "/stoffe" }}
          />

          <Step
            n={2}
            title="Maße angeben & konfigurieren"
            text="Geben Sie die fertigen Maße Ihres Vorhangs ein. Wählen Sie die Aufhängung, die Faltenzugabe und optional einen Futterstoff. Der 3D-Konfigurator zeigt Ihnen eine Echtzeit-Vorschau mit dem gewählten Stoff und Ihren Maßen."
            bullets={[
              "Intelligenter Maß-Konfigurator mit Live-Vorschau",
              "Verschiedene Faltenbänder zur Auswahl",
              "Optional: Futterstoff für Verdunklung oder Thermoisolierung",
              "Live-Preisberechnung während der Konfiguration",
            ]}
            tip={'Bestimmen Sie, wie groß die Faltenzugabe sein soll. Wir empfehlen \u201eViele Falten\u201c für einen eleganten Look.'}
            cta={{
              label: "Konfigurator öffnen",
              href: "/curtain-configurator",
            }}
          />

          <Step
            n={3}
            title="Bestellung aufgeben & Lieferung"
            text="Legen Sie Ihre konfigurierten Vorhänge in den Warenkorb und schließen Sie die Bestellung ab. Ihre Vorhänge werden individuell in unserer Berliner Manufaktur gefertigt."
            bullets={[
              "Sichere Bezahlung per Kreditkarte, PayPal oder SEPA",
              "Auftragsübersicht vor der Bestellung",
              "Sofortige Bestellbestätigung per E-Mail",
              "Handgefertigt in Berlin in 10–14 Werktagen",
            ]}
          />
        </div>
      </div>

      <Advantages />

      <section className="border-t border-stone-200 bg-stone-900 text-white">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h2 className="font-serif text-3xl font-light tracking-tight">
            Bereit für Ihre Traumvorhänge?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-stone-400">
            Starten Sie jetzt mit der Stoffauswahl und gestalten Sie Ihre
            individuellen Vorhänge.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/curtain-configurator"
              className="group inline-flex items-center gap-2 bg-white px-7 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-900 transition hover:bg-stone-100"
            >
              Konfigurator öffnen
              <svg
                className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
            <a
              href="#kontakt"
              className="inline-flex items-center border border-stone-600 px-7 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-300 transition hover:border-white hover:text-white"
            >
              Beratung anfragen
            </a>
          </div>
        </div>
      </section>

      <section id="kontakt" className="border-t border-stone-200">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="font-serif text-2xl font-light tracking-tight text-stone-900">
            Haben Sie Fragen?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-stone-600">
            Unser Expertenteam berät Sie gerne bei der Auswahl Ihrer perfekten
            Fensterdekoration.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm text-stone-700">
            <a
              href="tel:+493023590385"
              className="transition hover:text-black"
            >
              +49 30 235 903 858
            </a>
            <a
              href="mailto:atelier@unique-factory.com"
              className="transition hover:text-black"
            >
              atelier@unique-factory.com
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function Step({
  n,
  title,
  text,
  bullets,
  tip,
  cta,
}: {
  n: number;
  title: string;
  text: string;
  bullets: string[];
  tip?: string;
  cta?: { label: string; href: React.ComponentProps<typeof Link>["href"] };
}) {
  return (
    <div className="grid gap-8 py-12 lg:grid-cols-[auto_1fr] lg:gap-12">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-stone-900 text-lg font-light text-white lg:mt-1">
        {n}
      </div>
      <div>
        <h2 className="font-serif text-2xl font-light tracking-tight text-stone-900">
          {title}
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-stone-600">
          {text}
        </p>
        <ul className="mt-4 space-y-2">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-stone-700">
              <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400" />
              {b}
            </li>
          ))}
        </ul>
        {tip && (
          <p className="mt-4 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
            <span className="font-semibold text-stone-800">Tipp:</span> {tip}
          </p>
        )}
        {cta && (
          <Link
            href={cta.href}
            className="mt-6 inline-flex items-center gap-2 bg-stone-900 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-stone-700"
          >
            {cta.label}
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
}

function Advantages() {
  const items = [
    {
      title: "Premium Qualität",
      text: "Hochwertige Stoffe von führenden Herstellern wie Romo, Zimmer Rohde und Kirkby Design.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
        />
      ),
    },
    {
      title: "Maßanfertigung",
      text: "Jeder Vorhang wird individuell nach Ihren Maßen und Wünschen in Berlin gefertigt.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
        />
      ),
    },
    {
      title: "Persönliche Beratung",
      text: "Unser Expertenteam steht Ihnen bei Fragen jederzeit zur Verfügung – telefonisch oder per E-Mail.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
        />
      ),
    },
    {
      title: "Kostenloser Versand",
      text: "Innerhalb Deutschlands liefern wir ab 75 € Bestellwert versandkostenfrei zu Ihnen nach Hause.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
        />
      ),
    },
  ];

  return (
    <section className="border-t border-stone-200 bg-stone-50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.title} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-200 text-stone-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.4}
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  {item.icon}
                </svg>
              </div>
              <h3 className="mt-4 text-sm font-bold text-stone-900">
                {item.title}
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-stone-600">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { Link } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";
import BestsellersCarousel from "@/components/BestsellersCarousel";
import CalculatorTeaser from "@/components/quote/CalculatorTeaser";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomeContent />;
}

function HomeContent() {
  return (
    <div className="bg-white">
      {/* Hero — quiet, like the studio site */}
      <section className="border-b border-stone-200">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center lg:py-24">
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-stone-500">
            Manufaktur · Berlin · seit 2014
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl font-serif text-3xl font-light leading-[1.2] tracking-tight text-stone-900 sm:text-4xl lg:text-5xl">
            Maßgefertigte Vorhänge,<br />
            in unserer Berliner Manufaktur konfektioniert.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-stone-600">
            Wir entwerfen, beraten und produzieren in Berlin — von der Stoffauswahl
            bis zur Montage. Konfigurieren Sie Ihren Vorhang in 3D und sehen Sie
            Stoff, Faltenfall und Maße in Echtzeit.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/curtain-configurator"
              className="group inline-flex items-center gap-2 bg-stone-900 px-7 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-stone-700"
            >
              Konfigurator öffnen
              <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/kalkulator"
              className="inline-flex items-center gap-2 border border-stone-300 px-7 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" aria-hidden />
              Polster-Richtpreis berechnen
            </Link>
            <a
              href="#kontakt"
              className="inline-flex items-center border border-stone-300 px-7 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
            >
              Beratung anfragen
            </a>
          </div>
        </div>
      </section>

      {/* Bestseller fabrics */}
      <BestsellersCarousel />

      {/* Upholstery calculator — the fastest way into a conversation */}
      <CalculatorTeaser />

      {/* Three-column manufacturer story */}
      <section className="border-t border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-16">
            <Pillar
              title="Manufaktur"
              body="Jeder Vorhang wird in unserer Werkstatt in Berlin-Mitte von Hand konfektioniert. Saum, Faltenband, Futter — keine Zwischenhändler, keine Schnellfertigung."
            />
            <Pillar
              title="Stoffe"
              body="Wir arbeiten mit Romo, Kirkby Design, Zimmer Rohde, Villa Nova und führen eigene Hauskollektionen — Leinen, Samt, Baumwolle, Voile."
            />
            <Pillar
              title="Service"
              body="Beratung im Atelier oder bei Ihnen zuhause. Aufmaß, Montage und Garantie inklusive. Lieferzeit 10 bis 14 Werktage."
            />
          </div>
        </div>
      </section>

      {/* CTA — kontakt */}
      <section id="kontakt" className="border-t border-stone-200">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="font-serif text-3xl font-light tracking-tight text-stone-900">
            Sprechen wir.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-stone-600">
            Atelier Linienstraße · Mo–Fr 10–18 Uhr<br />
            Termin nach Vereinbarung.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm text-stone-700">
            <a href="tel:+493023590385" className="transition hover:text-black">
              +49 30 235 903 858
            </a>
            <a href="mailto:atelier@unique-factory.com" className="transition hover:text-black">
              atelier@unique-factory.com
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-serif text-xl font-light tracking-wide text-stone-900">{title}</h3>
      <div className="mt-4 h-px w-10 bg-stone-300" />
      <p className="mt-4 text-[15px] leading-relaxed text-stone-600">{body}</p>
    </div>
  );
}

"use client";

import { Link } from "@/i18n/routing";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-stone-950 text-stone-300">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="font-serif text-lg font-light tracking-[0.3em] text-white">
              UNIQUE FACTORY
            </div>
            <div className="mt-1 text-[10px] font-medium tracking-[0.35em] text-stone-500">
              BERLIN
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-stone-400">
              Manufaktur für maßgefertigte Vorhänge — entworfen, gefertigt und
              montiert in Berlin.
            </p>
          </div>

          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.25em] text-stone-500">
              Konfigurator
            </h4>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  href="/curtain-configurator"
                  className="text-sm text-stone-300 transition hover:text-white"
                >
                  Vorhang konfigurieren
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.25em] text-stone-500">
              Rechtliches
            </h4>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/impressum" className="text-sm text-stone-300 transition hover:text-white">
                  Impressum
                </Link>
              </li>
              <li>
                <Link href="/datenschutz" className="text-sm text-stone-300 transition hover:text-white">
                  Datenschutz
                </Link>
              </li>
              <li>
                <Link href="/agb" className="text-sm text-stone-300 transition hover:text-white">
                  AGB
                </Link>
              </li>
              <li>
                <Link href="/widerrufsbelehrung" className="text-sm text-stone-300 transition hover:text-white">
                  Widerrufsbelehrung
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.25em] text-stone-500">
              Atelier
            </h4>
            <p className="mt-4 text-sm leading-relaxed text-stone-400">
              Linienstraße<br />
              10115 Berlin<br />
              <span className="block mt-2">Mo–Fr 10–18 Uhr</span>
            </p>
            <a
              href="mailto:atelier@unique-factory.com"
              className="mt-3 inline-block text-sm font-medium text-white transition hover:text-stone-300"
            >
              atelier@unique-factory.com
            </a>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-[11px] text-stone-500 sm:flex-row sm:items-center">
          <p>&copy; {new Date().getFullYear()} Unique Factory Berlin.</p>
          <p>Alle Preise inkl. MwSt. · Versand 10–14 Werktage</p>
        </div>
      </div>
    </footer>
  );
}

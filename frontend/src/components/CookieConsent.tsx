"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "uf:cookie-consent:v1";

type Consent = {
  necessary: true;
  analytics: boolean;
  decidedAt: number;
};

export default function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setOpen(true);
      } else {
        const parsed = JSON.parse(raw) as Consent;
        setAnalytics(!!parsed.analytics);
      }
    } catch {
      setOpen(true);
    }
    const reopen = () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) setAnalytics(!!(JSON.parse(raw) as Consent).analytics);
      } catch {}
      setShowDetails(true);
      setOpen(true);
    };
    window.addEventListener("uf:open-consent", reopen);
    return () => window.removeEventListener("uf:open-consent", reopen);
  }, []);

  function save(consent: Consent) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    } catch {}
    setOpen(false);
    window.dispatchEvent(new CustomEvent("uf:consent-changed", { detail: consent }));
  }

  function acceptAll() {
    save({ necessary: true, analytics: true, decidedAt: Date.now() });
  }
  function rejectAll() {
    save({ necessary: true, analytics: false, decidedAt: Date.now() });
  }
  function saveSelection() {
    save({ necessary: true, analytics, decidedAt: Date.now() });
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie-Einstellungen"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-stone-200 bg-white shadow-2xl"
    >
      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-6">
        <h2 className="text-sm font-semibold text-stone-900">Cookies & Datenschutz</h2>
        <p className="mt-2 text-xs leading-relaxed text-stone-600">
          Wir verwenden technisch notwendige Cookies, damit die Seite funktioniert (Warenkorb,
          Spracheinstellung, Zahlung). Optionale Cookies für Statistik helfen uns, das Angebot zu
          verbessern.{" "}
          <Link href="/datenschutz" className="underline hover:text-stone-900">
            Datenschutzerklärung
          </Link>
          .
        </p>

        {showDetails && (
          <div className="mt-4 space-y-3 border-t border-stone-200 pt-4">
            <div className="flex items-start gap-3">
              <input type="checkbox" checked disabled className="mt-1" />
              <div className="flex-1">
                <div className="text-xs font-semibold text-stone-900">Notwendig</div>
                <div className="text-[11px] text-stone-500">
                  Erforderlich für Warenkorb, Checkout und Login. Immer aktiv.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <input
                id="consent-analytics"
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-1 cursor-pointer"
              />
              <label htmlFor="consent-analytics" className="flex-1 cursor-pointer">
                <div className="text-xs font-semibold text-stone-900">Statistik</div>
                <div className="text-[11px] text-stone-500">
                  Anonyme Reichweitenmessung zur Verbesserung der Seite.
                </div>
              </label>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="text-[11px] font-medium uppercase tracking-[0.15em] text-stone-500 hover:text-stone-900"
          >
            {showDetails ? "Weniger" : "Auswahl anpassen"}
          </button>
          <button
            onClick={rejectAll}
            className="border border-stone-300 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
          >
            Nur notwendige
          </button>
          {showDetails ? (
            <button
              onClick={saveSelection}
              className="bg-stone-900 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-stone-700"
            >
              Auswahl speichern
            </button>
          ) : (
            <button
              onClick={acceptAll}
              className="bg-stone-900 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-stone-700"
            >
              Alle akzeptieren
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

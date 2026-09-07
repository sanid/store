"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { OBJECT_TYPES, SERVICES } from "@/lib/quote/catalog";
import type { ObjectTypeId, ServiceId } from "@/lib/quote/catalog";
import ObjectSilhouette from "./ObjectSilhouette";

/** The pieces people actually arrive with — the long tail lives in the calculator. */
const FEATURED: ObjectTypeId[] = ["chair", "armchair", "sofa-2", "sofa-3", "bench", "headboard"];
const FEATURED_SERVICES: ServiceId[] = ["reupholster", "repair", "cushion", "curtain-special"];

/**
 * Front-page entry point to the calculator. The first two decisions are made
 * here, in one look, and travel with the customer into the form — so the page
 * that opens is already about their piece instead of an empty questionnaire.
 */
export default function CalculatorTeaser() {
  const [objectType, setObjectType] = useState<ObjectTypeId>("armchair");
  const [service, setService] = useState<ServiceId>("reupholster");

  const objects = OBJECT_TYPES.filter((t) => FEATURED.includes(t.id));
  const services = SERVICES.filter((s) => FEATURED_SERVICES.includes(s.id));

  return (
    <section className="border-t border-stone-200 bg-stone-900">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-orange-400">
              Neu · KI-Schnellkalkulator
            </span>
            <h2 className="mt-5 font-serif text-3xl font-light leading-[1.2] tracking-tight text-white sm:text-4xl">
              Was kostet es, Ihr Möbelstück
              <br />
              neu beziehen zu lassen?
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-stone-300">
              Zwei, drei Fotos genügen. Sie bekommen sofort einen Preisrahmen, sehen Ihr Stück in
              unseren Stoffen und Ledern — und fragen daraus ein verbindliches Angebot an.
            </p>
            <ul className="mt-6 space-y-2">
              {[
                "Ergebnis in unter zwei Minuten",
                "Stoffe und Leder direkt am eigenen Stück testen",
                "Unverbindlich, ohne Anmeldung",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13px] text-stone-400">
                  <svg
                    className="mt-[3px] h-3.5 w-3.5 flex-shrink-0 text-orange-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-white p-5 sm:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
              Worum geht es?
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {objects.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setObjectType(t.id)}
                  aria-pressed={objectType === t.id}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-1.5 py-2 transition ${
                    objectType === t.id
                      ? "border-orange-500 bg-orange-50"
                      : "border-stone-200 hover:border-stone-400"
                  }`}
                >
                  <ObjectSilhouette
                    objectType={t.id}
                    color={objectType === t.id ? "#f59e0b" : "#d6d3d1"}
                    frameColor={objectType === t.id ? "#b45309" : "#a8a29e"}
                    className="h-8 w-full"
                  />
                  <span
                    className={`text-center text-[10px] font-medium leading-tight ${
                      objectType === t.id ? "text-orange-800" : "text-stone-600"
                    }`}
                  >
                    {t.label}
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
              Was sollen wir machen?
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setService(s.id)}
                  aria-pressed={service === s.id}
                  className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                    service === s.id
                      ? "bg-orange-50 text-orange-700 ring-1 ring-orange-300"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <Link
              href={{ pathname: "/kalkulator", query: { service, objekt: objectType } }}
              className="group mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-4 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Richtpreis berechnen
              <svg
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <p className="mt-2.5 text-center text-[11px] text-stone-400">
              Unverbindlicher Richtwert — kein Angebot, keine Anmeldung.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

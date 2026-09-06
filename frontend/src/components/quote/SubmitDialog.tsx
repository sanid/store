"use client";

import { useState } from "react";
import { getFabric } from "@/lib/curtains";
import { LEATHER_GRADES } from "@/lib/quote/catalog";
import type { QuoteEstimate, QuoteSelection } from "@/lib/quote/types";
import type { UploadedPhoto } from "./PhotoUpload";

interface Props {
  quoteCode: string;
  estimate: QuoteEstimate;
  selection: QuoteSelection;
  meta: { source: string; provider: string | null; model: string | null };
  previewGross: number;
  photos: UploadedPhoto[];
  dimensions?: { width?: number; depth?: number; height?: number };
  onClose: () => void;
}

/**
 * Sammelt die Kontaktdaten und schickt die vollständige Kalkulation als Anfrage
 * an die Werkstatt. Der Preis wird serverseitig neu berechnet — was hier
 * mitgeschickt wird, ist nur die Vorschau zum Vergleich.
 */
export default function SubmitDialog({
  quoteCode,
  estimate,
  selection,
  meta,
  previewGross,
  photos,
  dimensions,
  onClose,
}: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const fabric = getFabric(selection.fabricId);
  const leather = LEATHER_GRADES.find((g) => g.id === selection.leatherGradeId);
  const fabricLabel =
    selection.materialKind === "leather"
      ? (leather?.label ?? "Leder")
      : fabric
        ? `${fabric.brand} ${fabric.collection} — ${fabric.colorName}`
        : selection.fabricId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!consent) {
      setError("Bitte stimmen Sie der Verarbeitung Ihrer Daten zu.");
      return;
    }
    setBusy(true);

    // Basiswerte ohne Zuschläge — der Server wendet Extras, Schwierigkeit und
    // Zustand mit derselben Formel selbst an.
    const scale = selection.quantity / Math.max(1, estimate.quantity);

    try {
      const res = await fetch("/api/quote/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteCode,
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          customerMessage: message,
          dimensions,
          photos: photos.map((p) => p.dataUrl),
          aiSource: meta.source,
          aiProvider: meta.provider,
          aiModel: meta.model,
          aiAssessment: estimate,
          customerPreviewGross: previewGross,
          workingValues: {
            objectType: estimate.objectType,
            service: estimate.service,
            quantity: selection.quantity,
            materialKind: selection.materialKind,
            fabricId: selection.fabricId,
            fabricLabel,
            leatherGradeId: selection.leatherGradeId,
            fabricMeters: Math.round(estimate.fabricMeters * scale * 100) / 100,
            laborHours: Math.round(estimate.laborHours * scale * 100) / 100,
            difficulty: estimate.difficulty,
            condition: selection.condition,
            extras: selection.extras,
          },
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { error?: string } | null)?.error ?? "Übermittlung fehlgeschlagen.");
        return;
      }
      setDone(true);
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte versuchen Sie es erneut.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        {done ? (
          <div className="py-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-2xl">
              ✓
            </div>
            <h2 className="mt-4 text-lg font-semibold text-stone-900">Anfrage ist eingegangen</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Wir prüfen Ihre Fotos in der Werkstatt und melden uns mit einem verbindlichen Angebot
              — in der Regel innerhalb von zwei Werktagen.
            </p>
            <p className="mt-4 rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-700">
              Ihr Anfrage-Code
              <span className="mt-1 block font-mono text-base font-semibold text-stone-900">
                {quoteCode}
              </span>
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full cursor-pointer rounded-xl bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              Schließen
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">Angebot anfragen</h2>
                <p className="mt-1 text-[12px] leading-relaxed text-stone-500">
                  Ihre Kalkulation, Fotos und die Einschätzung gehen mit an unsere Werkstatt.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Schließen"
                className="-mr-1 -mt-1 cursor-pointer p-1 text-stone-400 transition hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <Field label="Name" required>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className={inputClass}
                />
              </Field>
              <Field label="E-Mail" required>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className={inputClass}
                />
              </Field>
              <Field label="Telefon" hint="optional">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  className={inputClass}
                />
              </Field>
              <Field label="Nachricht" hint="optional">
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
                  placeholder="Wunschtermin, Besonderheiten, Rückfragen…"
                  className={`${inputClass} resize-y`}
                />
              </Field>
            </div>

            <label className="mt-4 flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-shrink-0 cursor-pointer accent-orange-500"
              />
              <span className="text-[11px] leading-relaxed text-stone-500">
                Ich bin damit einverstanden, dass meine Angaben und Fotos zur Bearbeitung dieser
                Anfrage gespeichert und verarbeitet werden.
              </span>
            </label>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-4 w-full cursor-pointer rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {busy ? "Wird übermittelt…" : "Anfrage absenden"}
            </button>

            <p className="mt-2 text-center text-[11px] text-stone-400">
              {photos.length > 0
                ? `${photos.length} Foto${photos.length === 1 ? "" : "s"} werden mitgesendet`
                : "Keine Fotos angehängt"}{" "}
              · Code {quoteCode}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-orange-400";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
          {label}
        </span>
        {required && <span className="text-[11px] text-orange-500">*</span>}
        {hint && <span className="text-[11px] text-stone-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

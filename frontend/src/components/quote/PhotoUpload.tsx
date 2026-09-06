"use client";

import { useCallback, useRef, useState } from "react";

export interface UploadedPhoto {
  id: string;
  /** Downscaled JPEG data URL, ready to send to the API. */
  dataUrl: string;
  name: string;
}

interface Props {
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
  max: number;
  label: string;
  hint: string;
}

const MAX_EDGE = 1400;
const JPEG_QUALITY = 0.82;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

/**
 * Downscale in the browser before upload: an 8 MP phone photo carries no more
 * usable detail for this analysis than a 1400 px one, and shrinking it here
 * keeps the request small and the vision call cheap.
 */
async function downscale(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas nicht verfügbar");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export default function PhotoUpload({ photos, onChange, max, label, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const room = max - photos.length;
      if (room <= 0) {
        setError(`Maximal ${max} Bilder.`);
        return;
      }

      const list = Array.from(files).slice(0, room);
      const rejected = list.filter((f) => !ACCEPTED.includes(f.type));
      const accepted = list.filter((f) => ACCEPTED.includes(f.type));
      if (rejected.length) setError("Nur JPEG, PNG oder WebP werden unterstützt.");
      if (!accepted.length) return;

      setBusy(true);
      try {
        const next: UploadedPhoto[] = [];
        for (const file of accepted) {
          try {
            next.push({
              id: `${file.name}-${file.size}-${Date.now()}-${next.length}`,
              dataUrl: await downscale(file),
              name: file.name,
            });
          } catch {
            setError(`"${file.name}" konnte nicht gelesen werden.`);
          }
        }
        if (next.length) onChange([...photos, ...next]);
      } finally {
        setBusy(false);
      }
    },
    [max, onChange, photos],
  );

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
          {label}
        </span>
        <span className="text-[11px] text-stone-400">
          {photos.length}/{max}
        </span>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void addFiles(e.dataTransfer.files);
        }}
        className={`rounded-2xl border-2 border-dashed p-4 transition ${
          dragging ? "border-orange-400 bg-orange-50" : "border-stone-200 bg-stone-50"
        }`}
      >
        {photos.length > 0 && (
          <div className="mb-3 grid grid-cols-4 gap-2">
            {photos.map((photo) => (
              <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.dataUrl}
                  alt={photo.name}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onChange(photos.filter((p) => p.id !== photo.id))}
                  aria-label={`${photo.name} entfernen`}
                  className="absolute right-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white/90 text-xs text-stone-600 shadow-sm transition hover:bg-white hover:text-stone-900"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || photos.length >= max}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-stone-700 ring-1 ring-stone-200 transition hover:ring-stone-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
          </svg>
          {busy ? "Wird verarbeitet…" : photos.length ? "Weitere Bilder" : "Bilder auswählen"}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <p className="mt-2 text-[11px] leading-snug text-stone-400">{hint}</p>
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

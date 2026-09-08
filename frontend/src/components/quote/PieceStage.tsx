"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import type { ObjectTypeId } from "@/lib/quote/catalog";
import type { SegmentKind } from "@/lib/quote/model-segmentation";
import type { QuoteOutline } from "@/lib/quote/types";
import OutlineFigure from "./OutlineFigure";
import { LIGHTING } from "./ModelViewer";
import type { LightingId, ModelMaterial, SegmentSummary } from "./ModelViewer";
import type { ReconstructionState } from "./useReconstruction";

// three.js has no business in the server bundle, and the viewer is only ever
// needed once a mesh actually arrived.
const ModelViewer = dynamic(() => import("./ModelViewer"), { ssr: false });

interface Props {
  reconstruction: ReconstructionState;
  outline?: QuoteOutline;
  objectType: ObjectTypeId;
  objectLabel: string;
  material: ModelMaterial;
  materialName: string;
}

/**
 * The customer's piece, as good as we can show it: the reconstructed 3D model
 * when SAM managed one, the built-in schematic otherwise. Either way the
 * selected fabric or leather is on it.
 */
export default function PieceStage({
  reconstruction,
  outline,
  objectType,
  objectLabel,
  material,
  materialName,
}: Props) {
  const [lighting, setLighting] = useState<LightingId>("daylight");
  const [segments, setSegments] = useState<SegmentSummary[]>([]);
  const [kindOverrides, setKindOverrides] = useState<Record<string, SegmentKind>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  const handleSegments = useCallback((next: SegmentSummary[]) => {
    setSegments(next);
    setKindOverrides({});
    setSelectedId(null);
  }, []);

  const modelUrl = reconstruction.phase === "done" ? reconstruction.modelUrl : undefined;

  const kindOf = useCallback(
    (segment: SegmentSummary): SegmentKind => kindOverrides[segment.id] ?? segment.kind,
    [kindOverrides],
  );

  const covered = useMemo(
    () => segments.filter((s) => kindOf(s) === "upholstery").length,
    [segments, kindOf],
  );

  if (!modelUrl) {
    return (
      <div className="mx-auto max-w-md">
        <OutlineFigure
          outline={outline}
          objectType={objectType}
          color={material.color}
          textureUrl={material.textureUrl}
          label={objectLabel}
          className="w-full"
        />
        <p className="mt-3 text-center text-[12px] text-stone-500">
          {objectLabel} in <span className="font-medium text-stone-700">{materialName}</span>
        </p>
        <p className="mt-0.5 text-center text-[11px] text-stone-400">
          {reconstruction.phase === "failed"
            ? "Für dieses Foto war kein 3D-Modell möglich — Skizze nach Ihren Angaben."
            : reconstruction.phase === "off"
              ? "Skizze des Stücks — Material wechseln Sie rechts."
              : "3D-Modell wird noch gebaut …"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl ring-1 ring-stone-200">
        <ModelViewer
          modelUrl={modelUrl}
          material={material}
          lighting={lighting}
          onSegments={handleSegments}
          kindOverrides={kindOverrides}
          selectedSegmentId={selectedId}
          showOriginal={showOriginal}
          className="h-[48vh] min-h-[300px] w-full lg:h-[56vh]"
        />
        {/* Honesty up front: the mesh is an approximation, not a replica. */}
        <span className="pointer-events-none absolute right-3 top-3 max-w-[85%] rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-medium leading-snug text-stone-600 ring-1 ring-stone-200 backdrop-blur">
          3D-Modell ist eine schnelle Approximation — natürlich keine 1:1-Darstellung des Objekts
        </span>
      </div>

      <p className="mt-2.5 text-[12px] text-stone-500">
        Ihr {objectLabel} in{" "}
        <span className="font-medium text-stone-700">
          {showOriginal ? "Originalzustand" : materialName}
        </span>{" "}
        · zum Drehen ziehen
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-white/70 px-4 py-3 ring-1 ring-stone-200">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
            Licht
          </p>
          <div className="flex flex-wrap gap-1.5">
            {LIGHTING.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLighting(l.id)}
                title={l.hint}
                aria-pressed={lighting === l.id}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
                  lighting === l.id
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto">
          <button
              type="button"
              onClick={() => setShowOriginal((v) => !v)}
            aria-pressed={showOriginal}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
              showOriginal
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {showOriginal ? "Neues Material" : "Original zeigen"}
          </button>
        </div>

        {segments.length > 1 && (
          <div className="w-full border-t border-stone-200 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                Teile · {covered} bezogen
              </p>
              {segments.map((segment, i) => {
                const kind = kindOf(segment);
                const selected = selectedId === segment.id;
                return (
                  <button
                    key={segment.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(selected ? null : segment.id);
                      setKindOverrides((prev) => ({
                        ...prev,
                        [segment.id]: kind === "upholstery" ? "frame" : "upholstery",
                      }));
                    }}
                    title={
                      kind === "upholstery"
                        ? "Wird neu bezogen — klicken, um es beim Original zu lassen"
                        : "Bleibt wie fotografiert — klicken, um es zu beziehen"
                    }
                    className={`flex cursor-pointer items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-[11px] font-medium transition ${
                      kind === "upholstery"
                        ? "border-orange-300 bg-orange-50 text-orange-800"
                        : "border-stone-200 bg-white text-stone-500"
                    }`}
                  >
                    <span
                      className="h-4 w-4 flex-shrink-0 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: segment.hex }}
                      aria-hidden
                    />
                    Teil {i + 1}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-stone-400">
              Orange markierte Flächen bekommen das gewählte Material. Klicken Sie ein Teil an, um
              es ein- oder auszunehmen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

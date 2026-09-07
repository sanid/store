"use client";

import { useEffect, useState } from "react";

export type ModelPhase = "off" | "starting" | "queued" | "running" | "done" | "failed";

interface Props {
  photoCount: number;
  /** True once the price assessment has come back. */
  assessmentDone: boolean;
  modelPhase: ModelPhase;
  queuePosition?: number;
  /** Lets the customer jump to the price while the 3D model finishes. */
  onSkip?: () => void;
}

/**
 * The wait is 30–60 seconds, which is long enough that a spinner reads as
 * "broken". So this shows the two things actually happening — the assessment
 * and the 3D reconstruction — with their real states, and assembles a chair
 * while it waits so there is something to watch.
 */
export default function BuildProgress({
  photoCount,
  assessmentDone,
  modelPhase,
  queuePosition,
  onSkip,
}: Props) {
  const elapsed = useElapsedSeconds();

  const assessmentProgress = assessmentDone ? 1 : ramp(elapsed, 22, 0.94);
  const modelProgress =
    modelPhase === "done" || modelPhase === "failed" || modelPhase === "off"
      ? 1
      : modelPhase === "starting"
        ? 0.06
        : modelPhase === "queued"
          ? 0.14
          : 0.2 + ramp(elapsed, 55, 0.75);

  const withModel = modelPhase !== "off" && modelPhase !== "failed";
  const progress = withModel
    ? assessmentProgress * 0.4 + modelProgress * 0.6
    : assessmentProgress;
  const pct = Math.min(99, Math.round(progress * 100));

  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-5 py-8 sm:px-8 sm:py-10">
      <AssemblyAnimation progress={progress} />

      <div className="mx-auto mt-8 max-w-md">
        <div className="flex items-end justify-between">
          <p className="text-sm font-semibold text-stone-900">
            {assessmentDone && withModel
              ? "Preis steht — das 3D-Modell wird noch gebaut"
              : "Ihr Stück wird ausgewertet"}
          </p>
          <span className="text-sm font-semibold tabular-nums text-orange-600">{pct} %</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-orange-500 transition-[width] duration-700 ease-out"
            style={{ width: `${Math.max(4, pct)}%` }}
          />
        </div>

        <ul className="mt-6 space-y-3">
          <Track
            title={`${photoCount} Foto${photoCount === 1 ? "" : "s"} vorbereitet`}
            detail="Zugeschnitten und für die Analyse aufbereitet"
            state="done"
          />
          <Track
            title="Bauform, Zustand und Aufwand"
            detail={
              assessmentDone
                ? "Einschätzung liegt vor"
                : assessmentStage(elapsed, photoCount > 0)
            }
            state={assessmentDone ? "done" : "active"}
          />
          {modelPhase !== "off" && (
            <Track
              title="3D-Modell Ihres Stücks"
              detail={modelDetail(modelPhase, queuePosition, elapsed)}
              state={
                modelPhase === "done"
                  ? "done"
                  : modelPhase === "failed"
                    ? "skipped"
                    : "active"
              }
            />
          )}
          <Track
            title="Material- und Preisrahmen"
            detail="Stoffe, Leder und Zusatzarbeiten werden durchgerechnet"
            state={assessmentDone ? "done" : "pending"}
          />
        </ul>

        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="mt-6 w-full cursor-pointer rounded-xl border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-400"
          >
            Preis jetzt ansehen — 3D-Modell lädt im Hintergrund
          </button>
        )}
      </div>
    </div>
  );
}

function Track({
  title,
  detail,
  state,
}: {
  title: string;
  detail: string;
  state: "done" | "active" | "pending" | "skipped";
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          state === "done"
            ? "bg-emerald-500 text-white"
            : state === "active"
              ? "bg-orange-100 text-orange-600"
              : state === "skipped"
                ? "bg-stone-200 text-stone-500"
                : "bg-stone-100 text-stone-400"
        }`}
        aria-hidden
      >
        {state === "done" ? "✓" : state === "active" ? <Pulse /> : state === "skipped" ? "–" : "•"}
      </span>
      <span className="min-w-0">
        <span
          className={`block text-[13px] font-medium ${
            state === "pending" ? "text-stone-400" : "text-stone-800"
          }`}
        >
          {title}
        </span>
        <span className="block text-[12px] leading-snug text-stone-500">{detail}</span>
      </span>
    </li>
  );
}

function Pulse() {
  return <span className="h-1.5 w-1.5 animate-ping rounded-full bg-orange-500" />;
}

function assessmentStage(elapsed: number, hasPhotos: boolean): string {
  if (!hasPhotos) return "Erfahrungswerte der Werkstatt werden herangezogen";
  if (elapsed < 6) return "Die Bilder werden gelesen";
  if (elapsed < 12) return "Bauform, Nähte und Polsteraufbau werden bestimmt";
  if (elapsed < 20) return "Zustand und Schadstellen werden bewertet";
  return "Materialbedarf und Arbeitszeit werden geschätzt";
}

function modelDetail(phase: ModelPhase, queuePosition: number | undefined, elapsed: number): string {
  switch (phase) {
    case "starting":
      return "Bild wird übertragen";
    case "queued":
      return queuePosition && queuePosition > 0
        ? `In der Warteschlange — Position ${queuePosition}`
        : "Wartet auf einen freien Rechner";
    case "running":
      return elapsed < 25
        ? "Objekt wird freigestellt und vermessen"
        : "Oberfläche und Textur werden rekonstruiert";
    case "done":
      return "Fertig — Sie können es gleich drehen";
    case "failed":
      return "Nicht möglich für dieses Foto — es bleibt bei der Zeichnung";
    default:
      return "";
  }
}

/**
 * A chair assembling itself, in the order a workshop actually does it: frame,
 * webbing, padding, cover, piping, buttons.
 */
function AssemblyAnimation({ progress }: { progress: number }) {
  const parts: { at: number; from: [number, number]; node: React.ReactNode }[] = [
    {
      at: 0.02,
      from: [0, 26],
      node: (
        <g key="legs">
          <rect x="46" y="106" width="7" height="30" rx="3" fill="#8a6a4a" />
          <rect x="147" y="106" width="7" height="30" rx="3" fill="#8a6a4a" />
          <rect x="58" y="112" width="84" height="5" rx="2.5" fill="#8a6a4a" />
        </g>
      ),
    },
    {
      at: 0.14,
      from: [0, 18],
      node: (
        <g key="frame">
          <rect x="42" y="86" width="116" height="22" rx="6" fill="#a98863" />
          <rect x="42" y="86" width="116" height="22" rx="6" fill="#000" opacity="0.08" />
        </g>
      ),
    },
    {
      at: 0.28,
      from: [0, -14],
      node: (
        <g key="webbing">
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={50 + i * 27} y="88" width="8" height="18" rx="2" fill="#e0d3bd" />
          ))}
          <rect x="44" y="92" width="112" height="7" rx="3" fill="#e0d3bd" />
        </g>
      ),
    },
    {
      at: 0.42,
      from: [-26, 0],
      node: (
        <g key="back">
          <rect x="52" y="26" width="96" height="62" rx="10" fill="#c9c2b6" />
          <rect x="52" y="26" width="96" height="62" rx="10" fill="url(#uf-assembly-shade)" />
        </g>
      ),
    },
    {
      at: 0.56,
      from: [30, 0],
      node: (
        <g key="arms">
          <rect x="32" y="54" width="20" height="42" rx="9" fill="#c9c2b6" />
          <rect x="148" y="54" width="20" height="42" rx="9" fill="#c9c2b6" />
        </g>
      ),
    },
    {
      at: 0.7,
      from: [0, -22],
      node: (
        <g key="seat">
          <rect x="46" y="78" width="108" height="24" rx="8" fill="#d8d2c7" />
          <rect x="46" y="78" width="108" height="24" rx="8" fill="url(#uf-assembly-shade)" />
        </g>
      ),
    },
    {
      at: 0.82,
      from: [0, 10],
      node: (
        <g key="piping">
          <path
            d="M46 90 h108"
            stroke="#8a6a4a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="5 4"
            fill="none"
          />
        </g>
      ),
    },
    {
      at: 0.92,
      from: [0, -8],
      node: (
        <g key="buttons">
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={76 + i * 24} cy="52" r="2.6" fill="#8a6a4a" opacity="0.65" />
          ))}
        </g>
      ),
    },
  ];

  return (
    <svg viewBox="0 0 200 150" className="mx-auto h-40 w-full max-w-xs" role="img" aria-label="Ein Sessel wird zusammengebaut">
      <defs>
        <linearGradient id="uf-assembly-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.14" />
        </linearGradient>
      </defs>

      <ellipse cx="100" cy="139" rx="62" ry="4.5" fill="#000" opacity="0.06" />

      {parts.map((part, i) => {
        const shown = progress >= part.at;
        return (
          <g
            key={i}
            style={{
              opacity: shown ? 1 : 0,
              transform: shown
                ? "translate(0px, 0px)"
                : `translate(${part.from[0]}px, ${part.from[1]}px)`,
              transition: "opacity 500ms ease-out, transform 700ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {part.node}
          </g>
        );
      })}

      {/* The needle keeps working until everything is in place. */}
      {progress < 0.98 && (
        <g>
          <path
            d="M46 90 h108"
            stroke="#f97316"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="6 106"
            fill="none"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="112"
              to="0"
              dur="2.4s"
              repeatCount="indefinite"
            />
          </path>
        </g>
      )}
    </svg>
  );
}

function ramp(elapsed: number, seconds: number, ceiling: number): number {
  return Math.min(ceiling, (elapsed / seconds) * ceiling);
}

function useElapsedSeconds(): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setElapsed((Date.now() - start) / 1000), 250);
    return () => clearInterval(timer);
  }, []);

  return elapsed;
}

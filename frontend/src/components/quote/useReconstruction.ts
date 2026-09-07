"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ModelPhase } from "./BuildProgress";

const POLL_INTERVAL_MS = 2500;
/** SAM 3D takes 30–60 s; past this something is wrong and the drawing wins. */
const MAX_WAIT_MS = 180_000;

export interface ReconstructionState {
  phase: ModelPhase;
  queuePosition?: number;
  /** Served from our own origin once the mesh is ready. */
  modelUrl?: string;
}

/**
 * Drives the 3D reconstruction alongside the price analysis.
 *
 * Deliberately failure-tolerant: no fal key, a refused photo or a model that
 * cannot find the object all end in `failed`, and the calculator carries on
 * with the outline drawing instead.
 */
export function useReconstruction() {
  const [state, setState] = useState<ReconstructionState>({ phase: "off" });
  const abortRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  useEffect(
    () => () => {
      abortRef.current.cancelled = true;
    },
    [],
  );

  const reset = useCallback(() => {
    abortRef.current.cancelled = true;
    abortRef.current = { cancelled: false };
    setState({ phase: "off" });
  }, []);

  const start = useCallback(async (photoDataUrl: string, objectType: string) => {
    abortRef.current.cancelled = true;
    const token = { cancelled: false };
    abortRef.current = token;

    setState({ phase: "starting" });

    let requestId: string;
    try {
      const res = await fetch("/api/quote/model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: photoDataUrl, objectType }),
      });
      const data = (await res.json().catch(() => null)) as {
        available?: boolean;
        requestId?: string;
      } | null;

      if (!res.ok || !data?.available || !data.requestId) {
        if (!token.cancelled) setState({ phase: data?.available === false ? "off" : "failed" });
        return;
      }
      requestId = data.requestId;
    } catch {
      if (!token.cancelled) setState({ phase: "failed" });
      return;
    }

    const deadline = Date.now() + MAX_WAIT_MS;
    while (!token.cancelled && Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      if (token.cancelled) return;

      try {
        const res = await fetch(`/api/quote/model?id=${encodeURIComponent(requestId)}`);
        const data = (await res.json().catch(() => null)) as {
          status?: string;
          queuePosition?: number;
          modelUrl?: string;
        } | null;

        if (!res.ok || !data) continue;

        if (data.status === "COMPLETED" && data.modelUrl) {
          if (!token.cancelled) setState({ phase: "done", modelUrl: data.modelUrl });
          return;
        }
        if (data.status === "FAILED") {
          if (!token.cancelled) setState({ phase: "failed" });
          return;
        }
        if (!token.cancelled) {
          setState({
            phase: data.status === "IN_PROGRESS" ? "running" : "queued",
            queuePosition: data.queuePosition,
          });
        }
      } catch {
        // A dropped poll is not a failure — keep trying until the deadline.
      }
    }

    if (!token.cancelled) setState({ phase: "failed" });
  }, []);

  return { state, start, reset };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

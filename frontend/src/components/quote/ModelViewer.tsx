"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { segmentModel } from "@/lib/quote/model-segmentation";
import type { ModelSegment, SegmentKind } from "@/lib/quote/model-segmentation";

export type LightingId = "daylight" | "warm" | "studio";

interface Lighting {
  id: LightingId;
  label: string;
  hint: string;
  background: string;
  ambient: { color: string; intensity: number };
  key: { color: string; intensity: number; position: [number, number, number] };
  fill: { color: string; intensity: number; position: [number, number, number] };
  rim: { color: string; intensity: number; position: [number, number, number] };
  shadowOpacity: number;
}

/**
 * Three rooms, roughly. A fabric that looks warm under an evening lamp reads
 * grey at a north-facing window, and that is exactly the thing customers get
 * wrong when they choose from a screen.
 */
export const LIGHTING: Lighting[] = [
  {
    id: "daylight",
    label: "Tageslicht",
    hint: "Neutrales Fensterlicht, mittags",
    background: "#eceae7",
    ambient: { color: "#dce6f2", intensity: 1.1 },
    key: { color: "#ffffff", intensity: 2.4, position: [2.6, 3.4, 2.2] },
    fill: { color: "#cfe0f5", intensity: 0.9, position: [-3, 1.6, 1.4] },
    rim: { color: "#ffffff", intensity: 1.1, position: [-1.4, 2.2, -3] },
    shadowOpacity: 0.42,
  },
  {
    id: "warm",
    label: "Abendlicht",
    hint: "Warme Wohnraumbeleuchtung",
    background: "#efe6da",
    ambient: { color: "#f3d9b5", intensity: 0.95 },
    key: { color: "#ffd9a0", intensity: 2.5, position: [2.2, 2.8, 2.4] },
    fill: { color: "#f0b978", intensity: 0.7, position: [-2.6, 1.2, 1.8] },
    rim: { color: "#ffe9c9", intensity: 0.9, position: [-1, 2, -2.8] },
    shadowOpacity: 0.34,
  },
  {
    id: "studio",
    label: "Studio",
    hint: "Gleichmäßig, wie im Fotostudio",
    background: "#f5f4f2",
    ambient: { color: "#ffffff", intensity: 1.5 },
    key: { color: "#ffffff", intensity: 2.1, position: [2, 3.2, 2.6] },
    fill: { color: "#ffffff", intensity: 1.4, position: [-2.8, 2, 2] },
    rim: { color: "#ffffff", intensity: 1.2, position: [0, 2.4, -3.2] },
    shadowOpacity: 0.28,
  },
];

export interface ModelMaterial {
  /** Base colour of the selected fabric or leather. */
  color: string;
  /** Tileable texture of the selected fabric, when it has one. */
  textureUrl?: string;
  kind: "fabric" | "leather";
}

interface Props {
  modelUrl: string;
  material: ModelMaterial;
  lighting: LightingId;
  /** Reports the recovered parts so the panel can list them. */
  onSegments?: (segments: SegmentSummary[]) => void;
  /** Which parts the customer decided are upholstered. */
  kindOverrides: Record<string, SegmentKind>;
  selectedSegmentId: string | null;
  /** Show the piece exactly as photographed. */
  showOriginal: boolean;
  className?: string;
}

export interface SegmentSummary {
  id: string;
  hex: string;
  kind: SegmentKind;
  share: number;
}

export default function ModelViewer({
  modelUrl,
  material,
  lighting,
  onSegments,
  kindOverrides,
  selectedSegmentId,
  showOriginal,
  className,
}: Props) {
  const light = LIGHTING.find((l) => l.id === lighting) ?? LIGHTING[0];

  return (
    <div className={className} style={{ backgroundColor: light.background }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [2.1, 1.5, 2.5], fov: 38 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={[light.background]} />
        <ambientLight color={light.ambient.color} intensity={light.ambient.intensity} />
        <directionalLight
          color={light.key.color}
          intensity={light.key.intensity}
          position={light.key.position}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight
          color={light.fill.color}
          intensity={light.fill.intensity}
          position={light.fill.position}
        />
        <directionalLight
          color={light.rim.color}
          intensity={light.rim.intensity}
          position={light.rim.position}
        />

        <Suspense fallback={null}>
          <SegmentedPiece
            url={modelUrl}
            material={material}
            onSegments={onSegments}
            kindOverrides={kindOverrides}
            selectedSegmentId={selectedSegmentId}
            showOriginal={showOriginal}
          />
        </Suspense>

        <ContactShadows
          position={[0, 0, 0]}
          opacity={light.shadowOpacity}
          scale={6}
          blur={2.4}
          far={3}
        />
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={1.4}
          maxDistance={5}
          minPolarAngle={0.25}
          maxPolarAngle={Math.PI / 2.05}
          target={[0, 0.75, 0]}
          autoRotate
          autoRotateSpeed={0.6}
        />
      </Canvas>
    </div>
  );
}

function SegmentedPiece({
  url,
  material,
  onSegments,
  kindOverrides,
  selectedSegmentId,
  showOriginal,
}: {
  url: string;
  material: ModelMaterial;
  onSegments?: (segments: SegmentSummary[]) => void;
  kindOverrides: Record<string, SegmentKind>;
  selectedSegmentId: string | null;
  showOriginal: boolean;
}) {
  const { scene } = useGLTF(url);
  const segmented = useMemo(() => segmentModel(scene), [scene]);

  useEffect(() => () => segmented.dispose(), [segmented]);

  useEffect(() => {
    onSegments?.(
      segmented.segments.map((s) => ({
        id: s.id,
        hex: `#${s.baseColor.getHexString()}`,
        kind: s.kind,
        share: s.share,
      })),
    );
  }, [segmented, onSegments]);

  const texture = useFabricTexture(material.textureUrl);

  useEffect(() => {
    for (const segment of segmented.segments) {
      applyMaterial(segment, {
        kind: kindOverrides[segment.id] ?? segment.kind,
        material,
        texture,
        showOriginal,
        selected: selectedSegmentId === segment.id,
      });
    }
  }, [segmented, kindOverrides, material, texture, showOriginal, selectedSegmentId]);

  return <primitive object={segmented.root} />;
}

function applyMaterial(
  segment: ModelSegment,
  opts: {
    kind: SegmentKind;
    material: ModelMaterial;
    texture: THREE.Texture | null;
    showOriginal: boolean;
    selected: boolean;
  },
): void {
  const m = segment.material;

  if (opts.showOriginal || opts.kind === "frame") {
    // Frames, legs and metal stay as photographed — nobody re-covers those.
    m.map = segment.sourceMap;
    m.vertexColors = segment.usesVertexColors;
    m.color.set(segment.sourceMap || segment.usesVertexColors ? 0xffffff : segment.baseColor);
    m.roughness = 0.7;
    m.metalness = 0.05;
  } else {
    m.map = opts.texture;
    // The photographed colours would tint the new fabric brown.
    m.vertexColors = false;
    m.color.set(opts.material.color);
    m.roughness = opts.material.kind === "leather" ? 0.55 : 0.92;
    m.metalness = 0;
  }

  m.emissive.set(opts.selected ? 0xf97316 : 0x000000);
  m.emissiveIntensity = opts.selected ? 0.18 : 0;
  m.needsUpdate = true;
}

/**
 * Loads a fabric swatch and tiles it at upholstery scale. The loaded texture is
 * stored together with the url it belongs to, so a swatch that is still loading
 * never paints itself onto the fabric the customer has meanwhile moved on to.
 */
function useFabricTexture(url?: string): THREE.Texture | null {
  const [loaded, setLoaded] = useState<{ url: string; texture: THREE.Texture } | null>(null);

  useEffect(() => {
    if (!url) return;
    let disposed = false;
    let created: THREE.Texture | null = null;

    new THREE.TextureLoader().load(url, (tex) => {
      if (disposed) {
        tex.dispose();
        return;
      }
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(5, 5);
      tex.colorSpace = THREE.SRGBColorSpace;
      created = tex;
      setLoaded({ url, texture: tex });
    });

    return () => {
      disposed = true;
      created?.dispose();
    };
  }, [url]);

  return url && loaded?.url === url ? loaded.texture : null;
}

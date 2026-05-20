"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, useTexture, Environment } from "@react-three/drei";
import { useMemo, useEffect, memo, useRef, useState, Suspense } from "react";
import * as THREE from "three";
import type { CurtainConfig, CurtainHeader, FabricReserve, FabricSwatch } from "@/lib/curtains";
import { RESERVE_FACTOR } from "@/lib/curtains";

interface Props {
  config: CurtainConfig;
  fabric: FabricSwatch | undefined;
  onReady?: (gl: THREE.WebGLRenderer) => void;
  compact?: boolean;
}

const WIN_BOTTOM_Y = 0.75;
const WIN_H = 1.95;
const WIN_W = 1.55;
const RAIL_Y = WIN_BOTTOM_Y + WIN_H + 0.18;

function curtainGeometry(
  widthM: number,
  heightM: number,
  reserve: FabricReserve,
  header: CurtainHeader,
  material?: FabricSwatch["material"]
): THREE.BufferGeometry {
  const fullness = RESERVE_FACTOR[reserve];
  const segments = Math.max(80, Math.min(160, Math.round(widthM * 70 * fullness)));
  const heightSegs = 14;
  const geo = new THREE.PlaneGeometry(widthM, heightM, segments, heightSegs);
  const pos = geo.attributes.position;

  const headerDensity =
    header === "pencil" ? 1.6 :
    header === "single-pinch" ? 1.15 :
    header === "eyelet" ? 0.85 :
    1.0;
  const foldsPerMeter = 2.6 * fullness * headerDensity;
  const totalFolds = Math.max(2, Math.round(foldsPerMeter * widthM));

  // Material weight affects drape: heavy fabrics (velvet, wool) hang straighter
  // with deeper, fewer folds; light fabrics (sheer, silk) flutter more
  const weightFactor =
    material === "velvet" ? 1.3 :
    material === "wool" ? 1.2 :
    material === "silk-blend" ? 0.85 :
    material === "synthetic" ? 0.9 :
    material === "linen" ? 1.1 :
    1.0;

  const baseAmp = (0.035 + 0.025 * (fullness - 1)) * weightFactor;

  const seed = (widthM * 1000 + heightM * 100) | 0;
  let rngState = seed;
  function rng() {
    rngState = (rngState * 16807 + 0) % 2147483647;
    return (rngState & 0xffff) / 0xffff;
  }
  const foldOffsets: number[] = [];
  const foldAmps: number[] = [];
  for (let f = 0; f <= totalFolds * 2 + 2; f++) {
    foldOffsets.push((rng() - 0.5) * 0.4);
    foldAmps.push(0.65 + rng() * 0.7);
  }

  const ringCount = Math.max(4, Math.round((widthM + 0.4) * 5));
  const ringSpacing = (widthM + 0.4) / (ringCount - 1);
  const railLeft = -widthM / 2 - 0.2;

  function foldDisplacement(x: number, yNorm: number): number {
    const foldIdx = (x / widthM) * totalFolds;
    const foldPhase = foldIdx * Math.PI * 2;
    const foldI = Math.floor(Math.abs(foldIdx)) % foldOffsets.length;
    const phaseOffset = foldOffsets[foldI];
    const ampVar = foldAmps[foldI];

    let topTaper = 1;
    if (header === "triple-pinch") {
      topTaper = yNorm > 0.93 ? Math.max(0, (1 - yNorm) / 0.07) : 1;
    } else if (header === "flemish") {
      topTaper = yNorm > 0.90 ? Math.max(0.25, (1 - yNorm) / 0.1 + 0.25) : 1;
    } else if (header === "single-pinch") {
      // small evenly-spaced pinches — short taper, less aggressive than triple
      topTaper = yNorm > 0.95 ? Math.max(0.15, (1 - yNorm) / 0.05 * 0.85) : 1;
    } else if (header === "eyelet") {
      // grommet top: flat between rings, vertical drape begins below
      topTaper = yNorm > 0.97 ? 0.05 : yNorm > 0.92 ? 0.6 : 1;
    } else if (header === "pencil") {
      // tightly gathered top — fold amplitude actually amplified near top
      topTaper = yNorm > 0.92 ? 1.25 : 1;
    }

    const gravityCurve = Math.pow(Math.max(yNorm, 0.15), -0.18 * weightFactor);
    const gravityFactor = Math.min(1.25, 0.6 + 0.55 * (1 - yNorm) * gravityCurve);

    const amp = baseAmp * topTaper * gravityFactor * ampVar;

    let z = Math.sin(foldPhase + phaseOffset) * amp;

    z += Math.sin(foldPhase * 2 + phaseOffset * 1.7) * amp * 0.22;

    // Pencil pleats: extra high-frequency vertical ridges in the top band
    if (header === "pencil" && yNorm > 0.88) {
      const ridge = Math.sin(foldPhase * 3.5 + phaseOffset * 0.8) * amp * 0.45;
      z += ridge * Math.min(1, (yNorm - 0.88) / 0.06);
    }

    // Eyelet: sinusoidal scallop at the very top mimicking fabric draped between grommets
    if (header === "eyelet" && yNorm > 0.94) {
      const scallop = Math.sin(foldPhase * 0.5) * baseAmp * 0.9;
      z += scallop * ((yNorm - 0.94) / 0.06);
    }

    const relX = x - railLeft;
    const ringProgress = (relX % ringSpacing) / ringSpacing;
    const catenarySag = -4 * ringSpacing * ringSpacing * 0.0012 * ringProgress * (1 - ringProgress);
    const catenaryDepth = (1 - yNorm) * 0.8 + 0.2;
    z += catenarySag * catenaryDepth;

    return z;
  }

  // Edge behavior: leading edge (center side) curves forward slightly
  // outer edge (wall side) is flatter against the wall
  function edgeBias(x: number, halfW: number): number {
    const distFromEdge = Math.min(Math.abs(x + halfW), Math.abs(x - halfW));
    const normalized = distFromEdge / halfW;
    // Center edge pushes forward, wall edge stays back
    return normalized * normalized * 0.025;
  }

  const halfW = widthM / 2;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const yNorm = (y + heightM / 2) / heightM;

    let z = foldDisplacement(x, yNorm);

    // Natural wobble per height
    if (header === "flemish") {
      z += Math.sin(x * totalFolds * Math.PI * 2 / widthM * 2.1 + y * 6) * baseAmp * 0.22;
    } else {
      z += Math.sin(y * 1.7 + x * totalFolds * Math.PI / widthM * 0.5) * baseAmp * 0.1;
    }

    // Edge bias
    z += edgeBias(x, halfW) * (1 - yNorm * 0.3);

    pos.setZ(i, z);
  }

  geo.computeVertexNormals();
  return geo;
}

function fabricTexture(hex: string, pattern: FabricSwatch["pattern"]): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, size, size);

  // base weave noise
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);

  ctx.globalAlpha = 0.18;
  if (pattern === "stripe") {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    for (let x = 0; x < size; x += 24) ctx.fillRect(x, 0, 8, size);
  } else if (pattern === "geometric") {
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    for (let y = 0; y < size; y += 32) {
      for (let x = (y / 32) % 2 ? 0 : 16; x < size; x += 32) {
        ctx.fillRect(x, y, 16, 16);
      }
    }
  } else if (pattern === "floral") {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 14; i++) {
      const cx = Math.random() * size;
      const cy = Math.random() * size;
      ctx.beginPath();
      ctx.arc(cx, cy, 4 + Math.random() * 6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pattern === "textured") {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    for (let i = 0; i < 800; i++) {
      ctx.fillRect(Math.random() * size, Math.random() * size, 1, 2);
    }
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function fabricNormalMap(pattern: FabricSwatch["pattern"]): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#8080ff";
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const threadW = pattern === "stripe" ? 12 : 6;
  const threadH = 6;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const idx = (py * size + px) * 4;
      const warpBump = ((px % threadW < threadW * 0.35) ? 0.15 : 0) * (Math.random() * 0.4 + 0.8);
      const weftBump = ((py % threadH < threadH * 0.35) ? 0.12 : 0) * (Math.random() * 0.4 + 0.8);
      const nx = 0.5 + warpBump - weftBump * 0.3;
      const ny = 0.5 + weftBump - warpBump * 0.3;
      img.data[idx] = Math.max(0, Math.min(255, nx * 255));
      img.data[idx + 1] = Math.max(0, Math.min(255, ny * 255));
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

const CurtainPanel = memo(function CurtainPanel({
  side,
  widthM,
  heightM,
  config,
  fabric,
  railWidthM,
  xOffset,
}: {
  side: "left" | "right";
  widthM: number;
  heightM: number;
  config: CurtainConfig;
  fabric: FabricSwatch;
  railWidthM: number;
  xOffset: number;
}) {
  const isPhoto = fabric.pattern === "photo";
  const geo = useMemo(
    () => curtainGeometry(widthM, heightM, config.reserve, config.header, fabric.material),
    [widthM, heightM, config.reserve, config.header, fabric.material]
  );
  const basePositions = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo]);
  const meshRef = useRef<THREE.Mesh>(null);

  // Verlet sway: per-vertex Z/X offset from rest, integrated each frame.
  // Top row pinned (yNorm=1). Horizontal coupling makes the cloth resist local
  // creases. Wind force is a low-frequency noise field. Damping bleeds energy.
  const segCountW = useMemo(() => {
    return Math.max(80, Math.min(160, Math.round(widthM * 70 * RESERVE_FACTOR[config.reserve]))) + 1;
  }, [widthM, config.reserve]);
  const segCountH = 15; // matches heightSegs+1 in curtainGeometry

  const physics = useMemo(() => {
    const n = segCountW * segCountH;
    return {
      offZ: new Float32Array(n),
      prevZ: new Float32Array(n),
      offX: new Float32Array(n),
      prevX: new Float32Array(n),
      scratchZ: new Float32Array(n),
      scratchX: new Float32Array(n),
    };
  }, [segCountW]);

  // Material weight: heavy fabric damps more, sways less
  const weight =
    fabric.material === "velvet" ? 1.35 :
    fabric.material === "wool" ? 1.25 :
    fabric.material === "silk-blend" ? 0.7 :
    fabric.material === "synthetic" ? 0.85 :
    fabric.material === "linen" ? 1.0 :
    1.0;
  const damping = 0.93 - 0.03 * (weight - 1);
  const windStrength = 0.0015 / weight;
  const stiffness = 0.01 * weight;

  // computeVertexNormals walks every triangle and is the hottest call in this loop.
  // Cloth moves smoothly between frames so lighting tolerates a 1-frame lag well.
  // Coarse-pointer (touch) devices get a deeper skip to claw back budget on mobile GPUs.
  const normalsSkip = useMemo(() => {
    if (typeof window === "undefined") return 2;
    return window.matchMedia?.("(pointer: coarse)").matches ? 3 : 2;
  }, []);
  const frameRef = useRef(0);

  useFrame((_, deltaRaw) => {
    if (!meshRef.current) return;
    const dt = Math.min(deltaRaw, 1 / 30); // clamp dt to avoid blowup on tab switch
    const t = performance.now() * 0.001;
    const W = segCountW;
    const H = segCountH;
    const { offZ, prevZ, offX, prevX, scratchZ, scratchX } = physics;

    // 1. Verlet integration with wind + restoring force.
    // PlaneGeometry orders vertices row-by-row from TOP (yi=0) to BOTTOM (yi=H-1),
    // so yi=0 is the pinned rail row.
    for (let yi = 0; yi < H; yi++) {
      const yNorm = 1 - yi / (H - 1); // 1 at top, 0 at bottom
      if (yi === 0) {
        // pin top row
        for (let xi = 0; xi < W; xi++) {
          const i = yi * W + xi;
          offZ[i] = 0; prevZ[i] = 0;
          offX[i] = 0; prevX[i] = 0;
        }
        continue;
      }
      const hangFactor = (1 - yNorm) * (1 - yNorm * 0.3);
      for (let xi = 0; xi < W; xi++) {
        const i = yi * W + xi;
        const xFrac = xi / (W - 1);

        // wind: drifting low-freq noise
        const windZ = (
          Math.sin(t * 0.6 + xFrac * 3.2 + yNorm * 1.1) * 0.6 +
          Math.sin(t * 0.23 + xFrac * 1.4) * 0.4 +
          Math.sin(t * 1.1 + xFrac * 5.0 + yNorm * 2.3) * 0.2
        );
        const windX = Math.sin(t * 0.41 + xFrac * 2.1 + yNorm * 1.6) * 0.3;

        const fz = windZ * windStrength * hangFactor - offZ[i] * stiffness;
        const fx = windX * windStrength * hangFactor - offX[i] * stiffness * 1.4;

        const vz = (offZ[i] - prevZ[i]) * damping;
        const vx = (offX[i] - prevX[i]) * damping;
        const newZ = offZ[i] + vz + fz * dt * 60;
        const newX = offX[i] + vx + fx * dt * 60;
        prevZ[i] = offZ[i];
        prevX[i] = offX[i];
        offZ[i] = newZ;
        offX[i] = newX;
      }
    }

    // 2. Horizontal coupling — smooth offsets along rows (cloth coherence)
    const coupling = 0.35;
    for (let yi = 1; yi < H; yi++) {
      const row = yi * W;
      for (let xi = 0; xi < W; xi++) {
        const i = row + xi;
        const l = xi > 0 ? offZ[i - 1] : offZ[i];
        const r = xi < W - 1 ? offZ[i + 1] : offZ[i];
        const lx = xi > 0 ? offX[i - 1] : offX[i];
        const rx = xi < W - 1 ? offX[i + 1] : offX[i];
        scratchZ[i] = offZ[i] + ((l + r) * 0.5 - offZ[i]) * coupling;
        scratchX[i] = offX[i] + ((lx + rx) * 0.5 - offX[i]) * coupling;
      }
    }
    for (let yi = 1; yi < H; yi++) {
      const row = yi * W;
      for (let xi = 0; xi < W; xi++) {
        const i = row + xi;
        offZ[i] = scratchZ[i];
        offX[i] = scratchX[i];
      }
    }

    // 3. Apply offsets to geometry, clamped so the curtain cannot pass through
    // the back wall (z=-0.22) or window frame (z≈-0.17). Curtain hangs at z=0.
    // Min allowed world-Z for a vertex: -0.04 (stays clear of window surface).
    const Z_MIN = -0.04;
    const pos = meshRef.current.geometry.attributes.position;
    for (let yi = 0; yi < H; yi++) {
      for (let xi = 0; xi < W; xi++) {
        const vi = yi * W + xi; // vertex index in mesh
        const pi = vi * 3;
        const bx = basePositions[pi];
        const bz = basePositions[pi + 2];
        let z = bz + offZ[vi];
        if (z < Z_MIN) {
          // soft clamp: bleed the over-penetration back into the offset so
          // the verlet state doesn't keep pushing through the wall.
          const excess = Z_MIN - z;
          offZ[vi] += excess;
          prevZ[vi] += excess * 0.5; // kill inward velocity
          z = Z_MIN;
        }
        pos.array[pi] = bx + offX[vi];
        pos.array[pi + 2] = z;
      }
    }
    pos.needsUpdate = true;
    if (++frameRef.current % normalsSkip === 0) {
      meshRef.current.geometry.computeVertexNormals();
    }
  });

  const photoTexRaw = useTexture(fabric.textureUrl ?? "/pattern.jpg");
  const photoTex = useMemo(() => {
    const t = photoTexRaw.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.needsUpdate = true;
    return t;
  }, [photoTexRaw]);
  const canvasTex = useMemo(
    () => (isPhoto ? null : fabricTexture(fabric.hex, fabric.pattern)),
    [fabric.hex, fabric.pattern, isPhoto]
  );
  const normalMap = useMemo(
    () => fabricNormalMap(fabric.pattern),
    [fabric.pattern]
  );
  const tex = isPhoto ? photoTex : canvasTex!;

  useEffect(() => {
    const repeats = Math.max(2, Math.round(widthM * 2));
    tex.repeat.set(repeats, Math.max(2, Math.round(heightM * 1.5)));
    normalMap.repeat.set(repeats, Math.max(2, Math.round(heightM * 1.5)));
  }, [tex, normalMap, widthM, heightM]);
  const roughness = fabric.material === "velvet" ? 0.55 : fabric.material === "silk-blend" ? 0.45 : 0.85;
  const transparent = fabric.transparency === "sheer" || fabric.transparency === "translucent";
  const opacity =
    fabric.transparency === "sheer" ? 0.55 : fabric.transparency === "translucent" ? 0.78 : 1;

  return (
    <mesh ref={meshRef} position={[xOffset, RAIL_Y - heightM / 2, 0]} geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial
        map={tex}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(0.6, 0.6)}
        color={isPhoto && !fabric.textureUrl ? fabric.hex : "#ffffff"}
        roughness={roughness}
        side={THREE.DoubleSide}
        transparent={transparent}
        opacity={opacity}
      />
    </mesh>
  );
});

const Rail = memo(function Rail({ widthM, header }: { widthM: number; header: CurtainHeader }) {
  const totalW = widthM + 0.4;
  const isEyelet = header === "eyelet";
  const isPencil = header === "pencil";
  const isSinglePinch = header === "single-pinch";
  const attachCount = isEyelet
    ? Math.max(6, Math.round(totalW * 4))
    : isPencil
    ? Math.max(8, Math.round(totalW * 8))
    : isSinglePinch
    ? Math.max(5, Math.round(totalW * 4))
    : Math.max(4, Math.round(totalW * 5));
  const attachSpacing = totalW / (attachCount - 1);

  return (
    <group position={[0, RAIL_Y, 0]}>
      {isPencil || isSinglePinch ? (
        <>
          {/* Flat ceiling-mounted track */}
          <mesh castShadow>
            <boxGeometry args={[totalW, 0.05, 0.07]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.45} />
          </mesh>
          {/* Track ceiling-side notch for depth */}
          <mesh position={[0, 0.026, 0]}>
            <boxGeometry args={[totalW, 0.002, 0.05]} />
            <meshStandardMaterial color="#0a0a0a" metalness={0.4} roughness={0.6} />
          </mesh>
          {/* Flat rectangular end-caps */}
          <mesh position={[-totalW / 2 - 0.005, 0, 0]}>
            <boxGeometry args={[0.01, 0.05, 0.07]} />
            <meshStandardMaterial color="#0d0d0d" metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh position={[totalW / 2 + 0.005, 0, 0]}>
            <boxGeometry args={[0.01, 0.05, 0.07]} />
            <meshStandardMaterial color="#0d0d0d" metalness={0.5} roughness={0.5} />
          </mesh>
        </>
      ) : (
        <>
          <mesh castShadow>
            <boxGeometry args={[totalW, 0.04, 0.04]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[-widthM / 2 - 0.2, 0, 0]}>
            <sphereGeometry args={[0.035, 16, 12]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[widthM / 2 + 0.2, 0, 0]}>
            <sphereGeometry args={[0.035, 16, 12]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.4} />
          </mesh>
        </>
      )}
      {Array.from({ length: attachCount }).map((_, i) => {
        const rx = -totalW / 2 + i * attachSpacing;
        if (isEyelet) {
          // brushed-steel grommet wrapping the rail — ring encircles the bar
          return (
            <group key={i} position={[rx, 0, 0]}>
              <mesh rotation={[0, Math.PI / 2, 0]} castShadow>
                <torusGeometry args={[0.045, 0.008, 16, 28]} />
                <meshStandardMaterial color="#c8c8cc" metalness={0.95} roughness={0.2} />
              </mesh>
              {/* inner darker ring for grommet depth */}
              <mesh rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.038, 0.003, 8, 24]} />
                <meshStandardMaterial color="#5a5a5e" metalness={0.6} roughness={0.5} />
              </mesh>
            </group>
          );
        }
        if (isPencil) {
          // small square glider block hanging from the track
          return (
            <group key={i} position={[rx, -0.05, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.022, 0.045, 0.05]} />
                <meshStandardMaterial color="#141414" metalness={0.5} roughness={0.45} />
              </mesh>
              {/* tiny hook loop under the glider */}
              <mesh position={[0, -0.028, 0]}>
                <torusGeometry args={[0.006, 0.0015, 6, 12]} />
                <meshStandardMaterial color="#3a3a3a" metalness={0.7} roughness={0.4} />
              </mesh>
            </group>
          );
        }
        if (isSinglePinch) {
          // square glider block hanging from the track (like pencil)
          return (
            <group key={i} position={[rx, -0.05, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.024, 0.045, 0.05]} />
                <meshStandardMaterial color="#141414" metalness={0.5} roughness={0.45} />
              </mesh>
              <mesh position={[0, -0.028, 0]}>
                <torusGeometry args={[0.007, 0.0015, 6, 12]} />
                <meshStandardMaterial color="#3a3a3a" metalness={0.7} roughness={0.4} />
              </mesh>
            </group>
          );
        }
        return (
          <mesh key={i} position={[rx, -0.04, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.018, 0.005, 8, 16]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.35} />
          </mesh>
        );
      })}
    </group>
  );
});

const Room = memo(function Room({ widthM }: { widthM: number }) {
  const wallW = Math.max(widthM + 6, 8);
  const wallH = Math.max(RAIL_Y + 2.4, 4.2);
  const floorDepth = 6;
  const sideWallZEnd = floorDepth - 0.2;

  // Wall is built as 4 strips framing a rectangular hole around the window
  const winLeft = -WIN_W / 2;
  const winRight = WIN_W / 2;
  const winBottom = WIN_BOTTOM_Y;
  const winTop = WIN_BOTTOM_Y + WIN_H;
  const wallZ = -0.22;
  const wallMat = { color: "#ebe5d8", roughness: 0.95 } as const;

  return (
    <group>
      {/* Wall above the window */}
      <mesh position={[0, (winTop + wallH) / 2, wallZ]} receiveShadow>
        <planeGeometry args={[wallW, wallH - winTop]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      {/* Wall below the window */}
      <mesh position={[0, winBottom / 2, wallZ]} receiveShadow>
        <planeGeometry args={[wallW, winBottom]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      {/* Wall left of the window */}
      <mesh position={[(-wallW / 2 + winLeft) / 2, (winBottom + winTop) / 2, wallZ]} receiveShadow>
        <planeGeometry args={[wallW / 2 + winLeft, WIN_H]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      {/* Wall right of the window */}
      <mesh position={[(wallW / 2 + winRight) / 2, (winBottom + winTop) / 2, wallZ]} receiveShadow>
        <planeGeometry args={[wallW / 2 - winRight, WIN_H]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>

      {/* Side walls — perpendicular to back wall, extending forward */}
      <mesh
        position={[wallW / 2, wallH / 2, (sideWallZEnd - 0.22) / 2]}
        rotation={[0, -Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[sideWallZEnd + 0.22, wallH]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      <mesh
        position={[-wallW / 2, wallH / 2, (sideWallZEnd - 0.22) / 2]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[sideWallZEnd + 0.22, wallH]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>

      {/* Baseboard along back wall */}
      <mesh position={[0, 0.06, -0.213]}>
        <boxGeometry args={[wallW, 0.12, 0.012]} />
        <meshStandardMaterial color="#f6f2ea" roughness={0.7} />
      </mesh>
      {/* Baseboard along side walls */}
      <mesh position={[wallW / 2 - 0.006, 0.06, (sideWallZEnd - 0.22) / 2]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[sideWallZEnd + 0.22, 0.12, 0.012]} />
        <meshStandardMaterial color="#f6f2ea" roughness={0.7} />
      </mesh>
      <mesh position={[-wallW / 2 + 0.006, 0.06, (sideWallZEnd - 0.22) / 2]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[sideWallZEnd + 0.22, 0.12, 0.012]} />
        <meshStandardMaterial color="#f6f2ea" roughness={0.7} />
      </mesh>

      <EuropeanWindow widthM={WIN_W} heightM={WIN_H} y={WIN_BOTTOM_Y + WIN_H / 2} />

      {/* Framed artwork — portrait left, landscape right */}
      <Suspense fallback={null}>
        <FramedArt
          x={-(WIN_W / 2 + 1.0)}
          y={WIN_BOTTOM_Y + WIN_H / 2}
          w={0.55}
          h={0.78}
          src="/artwork_portrait.png"
        />
        <FramedArt
          x={WIN_W / 2 + 1.1}
          y={WIN_BOTTOM_Y + WIN_H / 2 + 0.05}
          w={0.95}
          h={0.62}
          src="/artwork_landscape.png"
        />
      </Suspense>

      {/* Floor — large warm oak plane */}
      <mesh position={[0, 0, floorDepth / 2 - 0.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[wallW + 2, floorDepth]} />
        <meshStandardMaterial color="#b89b78" roughness={0.85} />
      </mesh>
      {/* Plank seams running away from the wall */}
      {Array.from({ length: 30 }).map((_, i) => (
        <mesh
          key={i}
          position={[-wallW / 2 + (i + 1) * (wallW / 31), 0.001, floorDepth / 2 - 0.2]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.004, floorDepth]} />
          <meshBasicMaterial color="#8b6f4f" transparent opacity={0.4} />
        </mesh>
      ))}

      {/* Decor — always render */}
      <ConsoleTable x={-(widthM / 2 + 0.8)} />
      <FloorLamp x={widthM / 2 + 0.9} />
    </group>
  );
});

const FramedArt = memo(function FramedArt({
  x,
  y,
  w,
  h,
  src,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  src: string;
}) {
  const tex = useTexture(src);
  const frameT = 0.035;
  const z = -0.213;
  return (
    <group position={[x, y, z]}>
      {/* Outer frame */}
      <mesh position={[0, h / 2 - frameT / 2, 0.012]} castShadow>
        <boxGeometry args={[w, frameT, 0.022]} />
        <meshStandardMaterial color="#f4ede0" roughness={0.55} />
      </mesh>
      <mesh position={[0, -h / 2 + frameT / 2, 0.012]} castShadow>
        <boxGeometry args={[w, frameT, 0.022]} />
        <meshStandardMaterial color="#f4ede0" roughness={0.55} />
      </mesh>
      <mesh position={[-w / 2 + frameT / 2, 0, 0.012]} castShadow>
        <boxGeometry args={[frameT, h, 0.022]} />
        <meshStandardMaterial color="#f4ede0" roughness={0.55} />
      </mesh>
      <mesh position={[w / 2 - frameT / 2, 0, 0.012]} castShadow>
        <boxGeometry args={[frameT, h, 0.022]} />
        <meshStandardMaterial color="#f4ede0" roughness={0.55} />
      </mesh>
      {/* Image */}
      <mesh position={[0, 0, 0.009]}>
        <planeGeometry args={[w - frameT * 2, h - frameT * 2]} />
        <meshStandardMaterial map={tex} roughness={0.8} />
      </mesh>
    </group>
  );
});

const EuropeanWindow = memo(function EuropeanWindow({
  widthM,
  heightM,
  y,
}: {
  widthM: number;
  heightM: number;
  y: number;
}) {
  const frame = "#f4ede0";
  const frameWarm = "#e8dec8";
  const z = -0.2;
  const depth = 0.06;
  const frameT = 0.05; // outer frame thickness
  const muntinT = 0.022;
  const revealDepth = 0.14; // inset into wall

  // Two casement sashes — typical EU Stulpfenster.
  const sashGap = 0.012;
  const sashW = (widthM - frameT * 2 - sashGap) / 2;
  const sashH = heightM - frameT * 2;

  // Outdoor view sits behind the glass, deep enough to feel like a real view.
  const viewZ = -revealDepth + 0.005;
  return (
    <group position={[0, y, z]}>
      {/* Wall reveal — the painted return between front wall and window */}
      {/* top reveal */}
      <mesh position={[0, heightM / 2 + 0.001, -revealDepth / 2]}>
        <boxGeometry args={[widthM, 0.005, revealDepth]} />
        <meshStandardMaterial color="#e8e1d1" roughness={0.95} />
      </mesh>
      {/* bottom reveal */}
      <mesh position={[0, -heightM / 2 - 0.001, -revealDepth / 2]}>
        <boxGeometry args={[widthM, 0.005, revealDepth]} />
        <meshStandardMaterial color="#e8e1d1" roughness={0.95} />
      </mesh>
      {/* side reveals */}
      <mesh position={[-widthM / 2 - 0.001, 0, -revealDepth / 2]}>
        <boxGeometry args={[0.005, heightM, revealDepth]} />
        <meshStandardMaterial color="#e6dfcf" roughness={0.95} />
      </mesh>
      <mesh position={[widthM / 2 + 0.001, 0, -revealDepth / 2]}>
        <boxGeometry args={[0.005, heightM, revealDepth]} />
        <meshStandardMaterial color="#e6dfcf" roughness={0.95} />
      </mesh>

      {/* === Outside view, layered for depth === */}
      {/* Sky gradient — three vertically stacked bands */}
      <mesh position={[0, heightM * 0.32, viewZ]}>
        <planeGeometry args={[widthM - 0.02, heightM * 0.38]} />
        <meshBasicMaterial color="#dfe9ef" />
      </mesh>
      <mesh position={[0, heightM * 0.05, viewZ + 0.001]}>
        <planeGeometry args={[widthM - 0.02, heightM * 0.36]} />
        <meshBasicMaterial color="#c9d8e0" />
      </mesh>
      <mesh position={[0, -heightM * 0.20, viewZ + 0.002]}>
        <planeGeometry args={[widthM - 0.02, heightM * 0.16]} />
        <meshBasicMaterial color="#d3dcd2" />
      </mesh>

      {/* Distant hill silhouette — far layer */}
      <mesh position={[-widthM * 0.18, -heightM * 0.20, viewZ + 0.003]}>
        <circleGeometry args={[heightM * 0.28, 32]} />
        <meshBasicMaterial color="#a8b5a5" transparent opacity={0.85} />
      </mesh>
      <mesh position={[widthM * 0.25, -heightM * 0.22, viewZ + 0.0031]}>
        <circleGeometry args={[heightM * 0.22, 32]} />
        <meshBasicMaterial color="#9eac9b" transparent opacity={0.85} />
      </mesh>

      {/* Closer treeline — mid layer */}
      <mesh position={[-widthM * 0.05, -heightM * 0.31, viewZ + 0.005]}>
        <circleGeometry args={[heightM * 0.18, 32]} />
        <meshBasicMaterial color="#6f8268" />
      </mesh>
      <mesh position={[widthM * 0.22, -heightM * 0.30, viewZ + 0.0051]}>
        <circleGeometry args={[heightM * 0.16, 32]} />
        <meshBasicMaterial color="#647a5e" />
      </mesh>
      <mesh position={[-widthM * 0.32, -heightM * 0.32, viewZ + 0.0052]}>
        <circleGeometry args={[heightM * 0.14, 32]} />
        <meshBasicMaterial color="#5f7559" />
      </mesh>

      {/* Foreground grass strip */}
      <mesh position={[0, -heightM * 0.43, viewZ + 0.006]}>
        <planeGeometry args={[widthM - 0.02, heightM * 0.12]} />
        <meshBasicMaterial color="#7a8a64" />
      </mesh>

      {/* === Sashes & glass === */}
      {/* Glass — subtle tint, mobile-safe (no transmission shader) */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[widthM - frameT * 2 - 0.01, heightM - frameT * 2 - 0.01]} />
        <meshStandardMaterial
          transparent
          opacity={0.18}
          color="#e8eef2"
          roughness={0.1}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Outer frame — 4 strips with subtle bevel via slightly different inner color */}
      <mesh position={[0, heightM / 2 - frameT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, frameT, depth]} />
        <meshStandardMaterial color={frame} roughness={0.55} />
      </mesh>
      <mesh position={[0, -heightM / 2 + frameT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, frameT, depth]} />
        <meshStandardMaterial color={frame} roughness={0.55} />
      </mesh>
      <mesh position={[-widthM / 2 + frameT / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[frameT, heightM, depth]} />
        <meshStandardMaterial color={frame} roughness={0.55} />
      </mesh>
      <mesh position={[widthM / 2 - frameT / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[frameT, heightM, depth]} />
        <meshStandardMaterial color={frame} roughness={0.55} />
      </mesh>
      {/* Inner bevel — slightly darker strip just inside the frame edge */}
      <mesh position={[0, heightM / 2 - frameT - 0.005, depth / 2 - 0.002]}>
        <boxGeometry args={[widthM - frameT * 2, 0.008, 0.002]} />
        <meshStandardMaterial color={frameWarm} roughness={0.7} />
      </mesh>
      <mesh position={[0, -heightM / 2 + frameT + 0.005, depth / 2 - 0.002]}>
        <boxGeometry args={[widthM - frameT * 2, 0.008, 0.002]} />
        <meshStandardMaterial color={frameWarm} roughness={0.7} />
      </mesh>

      {/* Center mullion */}
      <mesh position={[0, 0, 0.002]} castShadow>
        <boxGeometry args={[muntinT * 1.3, sashH, depth - 0.008]} />
        <meshStandardMaterial color={frame} roughness={0.55} />
      </mesh>

      {/* Horizontal transoms */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (widthM / 4 + (side > 0 ? sashGap / 2 : -sashGap / 2)), sashH * 0.18, 0.002]}
        >
          <boxGeometry args={[sashW, muntinT, depth - 0.008]} />
          <meshStandardMaterial color={frame} roughness={0.55} />
        </mesh>
      ))}

      {/* Handles */}
      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[side * (muntinT * 1.6), 0, depth / 2 + 0.005]}
          rotation={[0, 0, side > 0 ? -Math.PI / 7 : Math.PI / 7]}
        >
          {/* base plate */}
          <mesh>
            <boxGeometry args={[0.022, 0.045, 0.006]} />
            <meshStandardMaterial color="#bda06a" metalness={0.75} roughness={0.3} />
          </mesh>
          {/* lever */}
          <mesh position={[0, -0.035, 0.008]}>
            <boxGeometry args={[0.018, 0.07, 0.012]} />
            <meshStandardMaterial color="#cdb277" metalness={0.8} roughness={0.28} />
          </mesh>
        </group>
      ))}

      {/* Sill — deeper, with slight overhang */}
      <mesh
        position={[0, -heightM / 2 - 0.025, 0.06]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[widthM + 0.2, 0.05, 0.18]} />
        <meshStandardMaterial color="#f1ead9" roughness={0.6} />
      </mesh>
      {/* Sill apron underneath */}
      <mesh position={[0, -heightM / 2 - 0.07, 0.02]}>
        <boxGeometry args={[widthM + 0.12, 0.04, 0.04]} />
        <meshStandardMaterial color="#ece4cf" roughness={0.7} />
      </mesh>
    </group>
  );
});

const vaseProfile = (() => {
  // Lathed vase profile: (radius, y) points from base to neck
  const pts: THREE.Vector2[] = [];
  const samples = [
    [0.0, 0.0],
    [0.045, 0.0],
    [0.052, 0.012],
    [0.058, 0.04],
    [0.062, 0.075],
    [0.06, 0.11],
    [0.052, 0.135],
    [0.044, 0.155],
    [0.04, 0.17],
    [0.043, 0.185],
    [0.047, 0.2],
    [0.046, 0.205],
    [0.043, 0.207],
  ];
  for (const [r, y] of samples) pts.push(new THREE.Vector2(r, y));
  return pts;
})();

const ConsoleTable = memo(function ConsoleTable({ x }: { x: number }) {
  const topY = 0.78;
  return (
    <group position={[x, 0, 0.18]}>
      {/* Top — chamfered look via two stacked boxes */}
      <mesh position={[0, topY, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.56, 0.022, 0.33]} />
        <meshStandardMaterial color="#3a312a" roughness={0.35} metalness={0.05} />
      </mesh>
      <mesh position={[0, topY - 0.014, 0]} castShadow>
        <boxGeometry args={[0.55, 0.008, 0.32]} />
        <meshStandardMaterial color="#2e2620" roughness={0.5} />
      </mesh>
      {/* Legs — slim brass with tiny foot */}
      {[
        [-0.245, 0.135],
        [0.245, 0.135],
        [-0.245, -0.135],
        [0.245, -0.135],
      ].map(([lx, lz], i) => (
        <group key={i} position={[lx, 0, lz]}>
          <mesh position={[0, topY / 2, 0]} castShadow>
            <cylinderGeometry args={[0.011, 0.011, topY - 0.015, 16]} />
            <meshStandardMaterial color="#b08a4a" metalness={0.85} roughness={0.22} />
          </mesh>
          <mesh position={[0, 0.005, 0]} castShadow>
            <cylinderGeometry args={[0.016, 0.018, 0.01, 16]} />
            <meshStandardMaterial color="#8a6a36" metalness={0.7} roughness={0.4} />
          </mesh>
        </group>
      ))}
      {/* Stretcher rail between back legs for stability */}
      <mesh position={[0, 0.12, -0.135]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.006, 0.006, 0.49, 12]} />
        <meshStandardMaterial color="#b08a4a" metalness={0.85} roughness={0.22} />
      </mesh>

      {/* Ceramic vase — lathed */}
      <mesh position={[-0.13, topY + 0.011, -0.02]} castShadow receiveShadow>
        <latheGeometry args={[vaseProfile, 48]} />
        <meshStandardMaterial color="#ece3d2" roughness={0.55} metalness={0.02} />
      </mesh>
      {/* Stem */}
      <mesh position={[-0.13, topY + 0.32, -0.02]} castShadow>
        <cylinderGeometry args={[0.0035, 0.0035, 0.24, 8]} />
        <meshStandardMaterial color="#566a3b" roughness={0.8} />
      </mesh>
      {/* Leaves — couple of flattened spheres at different angles */}
      <mesh position={[-0.115, topY + 0.4, 0]} rotation={[0.2, 0, 0.7]} castShadow>
        <sphereGeometry args={[0.05, 16, 12]} />
        <meshStandardMaterial color="#6f8a4a" roughness={0.75} />
      </mesh>
      <mesh position={[-0.145, topY + 0.37, -0.03]} rotation={[-0.15, 0.4, -0.5]} castShadow scale={[1, 0.45, 1]}>
        <sphereGeometry args={[0.04, 14, 10]} />
        <meshStandardMaterial color="#5e7a3d" roughness={0.8} />
      </mesh>

      {/* Stack of two books — slightly offset, with spine detail */}
      <group position={[0.13, topY + 0.014, 0.02]}>
        <mesh castShadow rotation={[0, 0.05, 0]}>
          <boxGeometry args={[0.17, 0.022, 0.115]} />
          <meshStandardMaterial color="#7a3c2a" roughness={0.55} />
        </mesh>
        {/* spine darker edge */}
        <mesh position={[-0.084, 0, 0]} rotation={[0, 0.05, 0]}>
          <boxGeometry args={[0.003, 0.022, 0.115]} />
          <meshStandardMaterial color="#5a2818" roughness={0.6} />
        </mesh>
        <mesh position={[0.005, 0.024, 0.006]} castShadow rotation={[0, -0.08, 0]}>
          <boxGeometry args={[0.155, 0.02, 0.108]} />
          <meshStandardMaterial color="#28384a" roughness={0.55} />
        </mesh>
        <mesh position={[-0.072, 0.024, 0.006]} rotation={[0, -0.08, 0]}>
          <boxGeometry args={[0.003, 0.02, 0.108]} />
          <meshStandardMaterial color="#1a2638" roughness={0.6} />
        </mesh>
      </group>

      {/* Small brass tray with a tiny candle */}
      <mesh position={[0.18, topY + 0.005, -0.08]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.006, 24]} />
        <meshStandardMaterial color="#9a7a40" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0.18, topY + 0.028, -0.08]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 0.04, 16]} />
        <meshStandardMaterial color="#f4ece0" roughness={0.6} />
      </mesh>
      <mesh position={[0.18, topY + 0.052, -0.08]}>
        <cylinderGeometry args={[0.0008, 0.0008, 0.006, 6]} />
        <meshStandardMaterial color="#222" roughness={0.8} />
      </mesh>
    </group>
  );
});

const FloorLamp = memo(function FloorLamp({ x }: { x: number }) {
  return (
    <group position={[x, 0, 0.15]}>
      {/* Marble base — two-tier */}
      <mesh position={[0, 0.012, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.14, 0.15, 0.025, 32]} />
        <meshStandardMaterial color="#cfc6b3" roughness={0.45} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.035, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.13, 0.025, 32]} />
        <meshStandardMaterial color="#dcd4c3" roughness={0.5} />
      </mesh>
      {/* Stem joint to base */}
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.03, 0.025, 16]} />
        <meshStandardMaterial color="#b08a4a" metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Slim brass stem */}
      <mesh position={[0, 0.87, 0]} castShadow>
        <cylinderGeometry args={[0.0075, 0.0075, 1.58, 16]} />
        <meshStandardMaterial color="#b08a4a" metalness={0.88} roughness={0.22} />
      </mesh>
      {/* Stem cap below shade */}
      <mesh position={[0, 1.66, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.022, 0.04, 16]} />
        <meshStandardMaterial color="#a07d40" metalness={0.85} roughness={0.3} />
      </mesh>
      {/* Lampshade — tapered drum (truncated cone) */}
      <mesh position={[0, 1.78, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.19, 0.22, 32, 1, true]} />
        <meshStandardMaterial color="#efe5cf" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* Shade inner — warmer color seen through the open bottom */}
      <mesh position={[0, 1.78, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.18, 0.0001, 32, 1, true]} />
        <meshBasicMaterial color="#fff0d0" side={THREE.DoubleSide} />
      </mesh>
      {/* Visible bulb interior */}
      <mesh position={[0, 1.78, 0]}>
        <sphereGeometry args={[0.035, 16, 12]} />
        <meshBasicMaterial color="#fff2c8" />
      </mesh>
      {/* Warm glow under shade */}
      <pointLight position={[0, 1.78, 0]} intensity={0.45} distance={1.6} color="#ffd9a8" />
    </group>
  );
});

function Capture({ onReady }: { onReady?: (gl: THREE.WebGLRenderer) => void }) {
  const { gl } = useThree();
  useEffect(() => {
    if (onReady) onReady(gl);
  }, [gl, onReady]);
  return null;
}

function CameraRig({ position, target }: { position: [number, number, number]; target: [number, number, number] }) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(...position));
  const targetLook = useRef(new THREE.Vector3(...target));
  const lookProxy = useRef(new THREE.Vector3(...target));
  const initRef = useRef(false);

  useEffect(() => {
    targetPos.current.set(position[0], position[1], position[2]);
    targetLook.current.set(target[0], target[1], target[2]);
    if (!initRef.current) {
      camera.position.copy(targetPos.current);
      lookProxy.current.copy(targetLook.current);
      camera.lookAt(lookProxy.current);
      camera.updateProjectionMatrix();
      initRef.current = true;
    }
  }, [camera, position, target]);

  useFrame((_, dt) => {
    const k = 1 - Math.pow(0.001, dt); // frame-rate independent ease
    camera.position.lerp(targetPos.current, k);
    lookProxy.current.lerp(targetLook.current, k);
    camera.lookAt(lookProxy.current);
  });

  return null;
}

export default function CurtainScene({ config, fabric, onReady, compact = false }: Props) {
  const [controlsLocked, setControlsLocked] = useState(true);
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
  useEffect(() => {
    let buffer = "";
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.length !== 1) return;
      buffer += e.key.toLowerCase();
      if (buffer.endsWith("ff")) {
        setControlsLocked((v) => !v);
        buffer = "";
      }
      if (buffer.length > 4) buffer = buffer.slice(-2);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { buffer = ""; }, 800);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!fabric) {
    return <div className="h-full w-full bg-stone-100" />;
  }
  const railWidthM = Math.max(0.6, config.width / 100);
  const heightM = Math.max(0.6, config.height / 100);
  const isBoth = config.side === "both";
  const gap = 0.15;
  const panelWidthM = isBoth ? (railWidthM - gap) / 2 : railWidthM * 0.75;
  const leftXOffset = -railWidthM / 2 + panelWidthM / 2;
  const rightXOffset = railWidthM / 2 - panelWidthM / 2;

  return (
    <Canvas
      camera={{ position: [-1.921, 1.877, 3.481], fov: 45 }}
      shadows={!isMobile}
      frameloop="always"
      dpr={isMobile ? [1, 2] : [1, 1.5]}
      gl={{ preserveDrawingBuffer: true, antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      <Capture onReady={onReady} />
      {compact ? (
        <CameraRig
          position={[0, RAIL_Y - 0.05, 0.55]}
          target={[0, RAIL_Y - 0.12, 0]}
        />
      ) : (
        <CameraRig position={[-1.921, 1.877, 3.481]} target={[0, WIN_BOTTOM_Y + WIN_H / 2, 0]} />
      )}
      <color attach="background" args={["#f3efe7"]} />
      {!isMobile && (
        <Suspense fallback={null}>
          <Environment files="/room.hdr" background={false} environmentIntensity={0.55} />
        </Suspense>
      )}
      <ambientLight intensity={0.08} />
      <directionalLight
        position={[2, 4, 3]}
        intensity={1.15}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[-3, 2, -2]} intensity={0.45} color="#fff4e2" />
      <directionalLight position={[4, 2.5, 1]} intensity={0.4} color="#fff4e2" />
      <hemisphereLight args={["#fff5e6", "#bfb39a", 0.55]} />
      <pointLight position={[0, RAIL_Y * 0.6, 1.5]} intensity={0.4} color="#fff2dc" />
      <spotLight
        position={[0, WIN_BOTTOM_Y + WIN_H + 0.3, -0.05]}
        intensity={0.7}
        angle={0.7}
        penumbra={0.8}
        color="#fff8e8"
        distance={5}
        target-position={[0, WIN_BOTTOM_Y + WIN_H * 0.3, 1.2]}
      />

      <Room widthM={railWidthM} />
      <Rail widthM={railWidthM} header={config.header} />

      <Suspense fallback={null}>
        {(config.side === "left" || config.side === "both") && (
          <CurtainPanel side="left" widthM={panelWidthM} heightM={heightM} config={config} fabric={fabric} railWidthM={railWidthM} xOffset={leftXOffset} />
        )}
        {(config.side === "right" || config.side === "both") && (
          <CurtainPanel side="right" widthM={panelWidthM} heightM={heightM} config={config} fabric={fabric} railWidthM={railWidthM} xOffset={rightXOffset} />
        )}
      </Suspense>

      <ContactShadows
        position={[0, 0.001, 0.2]}
        opacity={0.4}
        scale={5}
        blur={1.5}
        far={1.5}
        resolution={256}
      />

      <OrbitControls
        enabled={!controlsLocked}
        enablePan={false}
        enableZoom={!controlsLocked}
        enableRotate={!controlsLocked}
        minDistance={1.5}
        maxDistance={6}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, WIN_BOTTOM_Y + WIN_H / 2, 0]}
        onChange={(e) => {
          const cam = e?.target.object;
          if (!cam) return;
        }}
      />
    </Canvas>
  );
}

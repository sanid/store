"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { useMemo, useEffect } from "react";
import * as THREE from "three";
import type { CurtainConfig, CurtainHeader, FabricReserve, FabricSwatch } from "@/lib/curtains";
import { RESERVE_FACTOR } from "@/lib/curtains";

interface Props {
  config: CurtainConfig;
  fabric: FabricSwatch | undefined;
  onReady?: (gl: THREE.WebGLRenderer) => void;
}

// Folds: PlaneGeometry with many width segments displaced in Z by sin(x)
function curtainGeometry(
  widthM: number,
  heightM: number,
  reserve: FabricReserve,
  header: CurtainHeader
): THREE.BufferGeometry {
  const fullness = RESERVE_FACTOR[reserve];
  // Dense mesh so folds read as soft fabric rather than ribbed strips.
  const segments = Math.max(80, Math.min(240, Math.round(widthM * 110 * fullness)));
  const geo = new THREE.PlaneGeometry(widthM, heightM, segments, 24);
  const pos = geo.attributes.position;
  // Fewer, wider folds — looks more like real pleated curtain.
  const foldsPerMeter = 2.6 * fullness;
  const totalFolds = Math.max(2, Math.round(foldsPerMeter * widthM));
  const k = (totalFolds * Math.PI * 2) / widthM;
  // Lower amplitude so folds look like soft waves rather than sharp ribbons.
  const baseAmp = 0.022 + 0.018 * (fullness - 1);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // Header type tapers the top differently.
    const yNorm = (y + heightM / 2) / heightM; // 0 bottom .. 1 top
    let topTaper = 1;
    if (header === "wave") {
      // wave header keeps folds full to top
      topTaper = 1;
    } else if (header === "triple-pinch") {
      // pinched at top: amplitude near 0 in top 4 cm
      topTaper = yNorm > 0.95 ? Math.max(0, (1 - yNorm) / 0.05) : 1;
    } else if (header === "flemish") {
      // soft flemish: top 8% slightly tapered, more chaotic folds
      topTaper = yNorm > 0.92 ? Math.max(0.25, (1 - yNorm) / 0.08 + 0.25) : 1;
    }
    // Slight bottom flare so curtain pools at the floor
    const bottomBoost = yNorm < 0.05 ? 1 + (0.05 - yNorm) * 4 : 1;
    const amp = baseAmp * topTaper * bottomBoost;
    const z = Math.sin(x * k) * amp;
    // Add tiny secondary wobble per height for natural fabric look
    const wobble =
      header === "flemish"
        ? Math.sin(x * k * 2.1 + y * 6) * amp * 0.15
        : Math.sin(y * 1.7 + x * k * 0.5) * amp * 0.08;
    pos.setZ(i, z + wobble);
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

function CurtainPanel({
  side,
  widthM,
  heightM,
  config,
  fabric,
  railWidthM,
}: {
  side: "left" | "right";
  widthM: number;
  heightM: number;
  config: CurtainConfig;
  fabric: FabricSwatch;
  railWidthM: number;
}) {
  const geo = useMemo(
    () => curtainGeometry(widthM, heightM, config.reserve, config.header),
    [widthM, heightM, config.reserve, config.header]
  );
  const tex = useMemo(() => fabricTexture(fabric.hex, fabric.pattern), [fabric.hex, fabric.pattern]);

  useEffect(() => {
    const repeats = Math.max(2, Math.round(widthM * 2));
    tex.repeat.set(repeats, Math.max(2, Math.round(heightM * 1.5)));
  }, [tex, widthM, heightM]);

  // Position each panel near its rail edge
  const xOffset = side === "left" ? -railWidthM / 2 + widthM / 2 : railWidthM / 2 - widthM / 2;
  const roughness = fabric.material === "velvet" ? 0.55 : fabric.material === "silk-blend" ? 0.45 : 0.85;
  const sheen = fabric.material === "velvet" ? 0.4 : fabric.material === "silk-blend" ? 0.3 : 0.1;
  const transparent = fabric.transparency === "sheer" || fabric.transparency === "translucent";
  const opacity =
    fabric.transparency === "sheer" ? 0.55 : fabric.transparency === "translucent" ? 0.78 : 1;

  return (
    <mesh position={[xOffset, heightM / 2, 0]} geometry={geo} castShadow receiveShadow>
      <meshPhysicalMaterial
        map={tex}
        color="#ffffff"
        roughness={roughness}
        sheen={sheen}
        sheenColor={fabric.hex}
        side={THREE.DoubleSide}
        transparent={transparent}
        opacity={opacity}
      />
    </mesh>
  );
}

function Rail({ widthM, heightM }: { widthM: number; heightM: number }) {
  return (
    <group position={[0, heightM + 0.02, 0]}>
      <mesh castShadow>
        <boxGeometry args={[widthM + 0.4, 0.04, 0.04]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* End caps */}
      <mesh position={[-widthM / 2 - 0.2, 0, 0]}>
        <sphereGeometry args={[0.035, 16, 12]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[widthM / 2 + 0.2, 0, 0]}>
        <sphereGeometry args={[0.035, 16, 12]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

function Room({ widthM, heightM }: { widthM: number; heightM: number }) {
  // Always render a sizeable room regardless of curtain width.
  const wallW = Math.max(widthM + 4.5, 6);
  const wallH = Math.max(heightM + 1.4, 3.2);
  // Window roughly matches the rail, with a small inset so the rail extends beyond it.
  const winW = Math.max(0.9, Math.min(widthM - 0.1, 2.4));
  const winH = Math.min(heightM * 0.82, heightM - 0.3);
  const winYCenter = heightM * 0.5 + 0.08;

  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, wallH / 2, -0.22]} receiveShadow>
        <planeGeometry args={[wallW, wallH]} />
        <meshStandardMaterial color="#ebe5d8" roughness={0.95} />
      </mesh>

      {/* Baseboard */}
      <mesh position={[0, 0.06, -0.213]}>
        <boxGeometry args={[wallW, 0.12, 0.012]} />
        <meshStandardMaterial color="#f6f2ea" roughness={0.7} />
      </mesh>

      <EuropeanWindow widthM={winW} heightM={winH} y={winYCenter} />

      {/* Floor — large warm oak plane */}
      <mesh position={[0, 0, 1.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[wallW + 2, 4]} />
        <meshStandardMaterial color="#b89b78" roughness={0.85} />
      </mesh>
      {/* Plank seams running away from the wall */}
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh
          key={i}
          position={[-wallW / 2 + (i + 1) * (wallW / 15), 0.001, 1.4]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.004, 4]} />
          <meshBasicMaterial color="#8b6f4f" transparent opacity={0.4} />
        </mesh>
      ))}

      {/* Decor — always render */}
      <ConsoleTable x={-(widthM / 2 + 0.8)} />
      <FloorLamp x={widthM / 2 + 0.9} />
    </group>
  );
}

function EuropeanWindow({
  widthM,
  heightM,
  y,
}: {
  widthM: number;
  heightM: number;
  y: number;
}) {
  const frame = "#f4ede0";
  const frameDeep = "#d8cdb8";
  const z = -0.2;
  const depth = 0.06;
  const frameT = 0.05; // outer frame thickness
  const muntinT = 0.025;

  // Two casement sashes, each split into 3 panes vertically (typical EU window).
  const sashGap = 0.015;
  const sashW = (widthM - frameT * 2 - sashGap) / 2;
  const sashH = heightM - frameT * 2;

  return (
    <group position={[0, y, z]}>
      {/* Reveal — recessed sky panel */}
      <mesh position={[0, 0, -depth - 0.005]}>
        <planeGeometry args={[widthM, heightM]} />
        <meshBasicMaterial color="#c8d8df" />
      </mesh>
      {/* Soft outdoor gradient via two stacked planes */}
      <mesh position={[0, heightM * 0.25, -depth - 0.004]}>
        <planeGeometry args={[widthM, heightM * 0.5]} />
        <meshBasicMaterial color="#e6eef2" transparent opacity={0.65} />
      </mesh>
      <mesh position={[0, -heightM * 0.18, -depth - 0.004]}>
        <planeGeometry args={[widthM, heightM * 0.55]} />
        <meshBasicMaterial color="#a4c0aa" transparent opacity={0.55} />
      </mesh>
      {/* Distant trees silhouette */}
      <mesh position={[0, -heightM * 0.05, -depth - 0.003]}>
        <planeGeometry args={[widthM, heightM * 0.3]} />
        <meshBasicMaterial color="#7a9a82" transparent opacity={0.5} />
      </mesh>

      {/* Outer frame — 4 strips */}
      <mesh position={[0, heightM / 2 - frameT / 2, 0]}>
        <boxGeometry args={[widthM, frameT, depth]} />
        <meshStandardMaterial color={frame} roughness={0.6} />
      </mesh>
      <mesh position={[0, -heightM / 2 + frameT / 2, 0]}>
        <boxGeometry args={[widthM, frameT, depth]} />
        <meshStandardMaterial color={frame} roughness={0.6} />
      </mesh>
      <mesh position={[-widthM / 2 + frameT / 2, 0, 0]}>
        <boxGeometry args={[frameT, heightM, depth]} />
        <meshStandardMaterial color={frame} roughness={0.6} />
      </mesh>
      <mesh position={[widthM / 2 - frameT / 2, 0, 0]}>
        <boxGeometry args={[frameT, heightM, depth]} />
        <meshStandardMaterial color={frame} roughness={0.6} />
      </mesh>

      {/* Center mullion (Stulp) — splits the two sashes */}
      <mesh position={[0, 0, 0.005]}>
        <boxGeometry args={[muntinT * 1.2, sashH, depth - 0.01]} />
        <meshStandardMaterial color={frame} roughness={0.6} />
      </mesh>

      {/* Two horizontal transoms — one per sash, ~upper third */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (widthM / 4 + (side > 0 ? sashGap / 2 : -sashGap / 2)), 0, 0]}>
          <mesh position={[0, sashH * 0.18, 0.005]}>
            <boxGeometry args={[sashW, muntinT, depth - 0.01]} />
            <meshStandardMaterial color={frame} roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Handles (Olive) */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (muntinT * 1.4), 0, depth / 2 + 0.005]}
          rotation={[0, 0, side > 0 ? -Math.PI / 8 : Math.PI / 8]}
        >
          <boxGeometry args={[0.025, 0.08, 0.012]} />
          <meshStandardMaterial color="#cfb277" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}

      {/* Subtle frame shadow inside */}
      <mesh position={[0, 0, -depth + 0.001]}>
        <planeGeometry args={[widthM - frameT * 2, heightM - frameT * 2]} />
        <meshBasicMaterial color={frameDeep} transparent opacity={0.18} />
      </mesh>

      {/* Window sill (Fensterbank) — protrudes inward */}
      <mesh
        position={[0, -heightM / 2 - 0.02, 0.08]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[widthM + 0.16, 0.04, 0.22]} />
        <meshStandardMaterial color="#f1ead9" roughness={0.7} />
      </mesh>
      {/* Sill front edge highlight */}
      <mesh position={[0, -heightM / 2 - 0.041, 0.19]}>
        <boxGeometry args={[widthM + 0.16, 0.005, 0.005]} />
        <meshStandardMaterial color="#d8cdb8" />
      </mesh>
    </group>
  );
}

function ConsoleTable({ x }: { x: number }) {
  const topY = 0.78;
  return (
    <group position={[x, 0, 0.18]}>
      {/* Top */}
      <mesh position={[0, topY, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.55, 0.025, 0.32]} />
        <meshStandardMaterial color="#3a312a" roughness={0.4} metalness={0.05} />
      </mesh>
      {/* Legs — slim brass */}
      {[
        [-0.24, 0.13],
        [0.24, 0.13],
        [-0.24, -0.13],
        [0.24, -0.13],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, topY / 2, lz]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, topY, 12]} />
          <meshStandardMaterial color="#b08a4a" metalness={0.85} roughness={0.25} />
        </mesh>
      ))}
      {/* Decor: ceramic vase */}
      <mesh position={[-0.12, topY + 0.11, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.04, 0.18, 24]} />
        <meshStandardMaterial color="#e9e0cf" roughness={0.7} />
      </mesh>
      {/* Stem */}
      <mesh position={[-0.12, topY + 0.28, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.22, 6]} />
        <meshStandardMaterial color="#5a6b3e" roughness={0.8} />
      </mesh>
      {/* Leaf */}
      <mesh position={[-0.105, topY + 0.36, 0.02]} rotation={[0, 0, 0.6]}>
        <sphereGeometry args={[0.045, 12, 10]} />
        <meshStandardMaterial color="#6e8a4a" roughness={0.8} />
      </mesh>
      {/* Stack of two books */}
      <mesh position={[0.13, topY + 0.022, 0]} castShadow>
        <boxGeometry args={[0.16, 0.025, 0.11]} />
        <meshStandardMaterial color="#7a3c2a" roughness={0.6} />
      </mesh>
      <mesh position={[0.135, topY + 0.05, 0.005]} castShadow rotation={[0, 0.08, 0]}>
        <boxGeometry args={[0.15, 0.022, 0.105]} />
        <meshStandardMaterial color="#2c3a4a" roughness={0.6} />
      </mesh>
    </group>
  );
}

function FloorLamp({ x }: { x: number }) {
  return (
    <group position={[x, 0, 0.15]}>
      {/* Marble base */}
      <mesh position={[0, 0.025, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.14, 0.05, 24]} />
        <meshStandardMaterial color="#dcd4c3" roughness={0.5} />
      </mesh>
      {/* Slim brass stem */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.008, 0.008, 1.6, 12]} />
        <meshStandardMaterial color="#b08a4a" metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Lampshade — linen drum */}
      <mesh position={[0, 1.62, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.24, 24, 1, true]} />
        <meshStandardMaterial color="#efe5cf" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      {/* Warm glow under shade */}
      <pointLight position={[0, 1.6, 0]} intensity={0.35} distance={1.4} color="#ffd9a8" />
    </group>
  );
}

function Capture({ onReady }: { onReady?: (gl: THREE.WebGLRenderer) => void }) {
  const { gl } = useThree();
  useEffect(() => {
    if (onReady) onReady(gl);
  }, [gl, onReady]);
  return null;
}

export default function CurtainScene({ config, fabric, onReady }: Props) {
  if (!fabric) {
    return <div className="h-full w-full bg-stone-100" />;
  }
  const railWidthM = Math.max(0.6, config.width / 100);
  const heightM = Math.max(0.6, config.height / 100);
  const panelWidthM =
    config.side === "both" ? railWidthM / 2 + 0.04 : railWidthM * 0.6;

  return (
    <Canvas
      camera={{ position: [0, heightM * 0.5, Math.max(3.4, railWidthM * 1.9)], fov: 48 }}
      shadows
      gl={{ preserveDrawingBuffer: true, antialias: true }}
    >
      <Capture onReady={onReady} />
      <color attach="background" args={["#f3efe7"]} />
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[2, 4, 3]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-3, 2, -2]} intensity={0.35} color="#e9d8b8" />
      <hemisphereLight args={["#fff5e6", "#9a8870", 0.45]} />
      <pointLight position={[0, heightM * 0.6, 1.5]} intensity={0.4} color="#fff2dc" />

      <Room widthM={railWidthM} heightM={heightM} />
      <Rail widthM={railWidthM} heightM={heightM} />

      {(config.side === "left" || config.side === "both") && (
        <CurtainPanel side="left" widthM={panelWidthM} heightM={heightM} config={config} fabric={fabric} railWidthM={railWidthM} />
      )}
      {(config.side === "right" || config.side === "both") && (
        <CurtainPanel side="right" widthM={panelWidthM} heightM={heightM} config={config} fabric={fabric} railWidthM={railWidthM} />
      )}

      <ContactShadows
        position={[0, 0.001, 0.2]}
        opacity={0.45}
        scale={6}
        blur={2.2}
        far={2}
      />

      <OrbitControls
        enablePan={false}
        minDistance={1.5}
        maxDistance={6}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, heightM / 2, 0]}
      />
    </Canvas>
  );
}

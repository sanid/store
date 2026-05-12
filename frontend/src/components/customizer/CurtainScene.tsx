"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei";
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
  // The actual fabric is wider than the displayed panel — pleating compresses it.
  // Visually we keep the panel width as 'widthM' and use the fullness to determine fold count + amplitude.
  const segments = Math.max(40, Math.min(160, Math.round(widthM * 60 * fullness)));
  const geo = new THREE.PlaneGeometry(widthM, heightM, segments, 12);
  const pos = geo.attributes.position;
  // Frequency: more fullness => more folds.
  const foldsPerMeter = 4 * fullness;
  const totalFolds = foldsPerMeter * widthM;
  const k = (totalFolds * Math.PI * 2) / widthM;
  // Amplitude grows slightly with fullness.
  const baseAmp = 0.035 + 0.025 * (fullness - 1);
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
  const wallW = Math.max(widthM + 2, 4);
  const wallH = Math.max(heightM + 1, 3);
  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, wallH / 2, -0.2]} receiveShadow>
        <planeGeometry args={[wallW, wallH]} />
        <meshStandardMaterial color="#ede7dc" roughness={0.95} />
      </mesh>
      {/* Window frame */}
      <group position={[0, heightM / 2 + 0.05, -0.18]}>
        <mesh>
          <planeGeometry args={[Math.min(widthM * 0.55, 1.6), Math.min(heightM * 0.7, 1.6)]} />
          <meshStandardMaterial color="#b9d6e5" />
        </mesh>
        <mesh position={[0, 0, 0.005]}>
          <boxGeometry args={[Math.min(widthM * 0.55, 1.6) + 0.06, 0.04, 0.02]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, -Math.min(heightM * 0.7, 1.6) / 2 - 0.02, 0.005]}>
          <boxGeometry args={[Math.min(widthM * 0.55, 1.6) + 0.06, 0.04, 0.02]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </group>
      {/* Floor */}
      <mesh position={[0, 0, 0.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[wallW, 2]} />
        <meshStandardMaterial color="#dcd2c2" roughness={0.9} />
      </mesh>
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
      camera={{ position: [0, heightM * 0.55, Math.max(2.8, railWidthM * 1.6) ], fov: 38 }}
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
      <directionalLight position={[-3, 2, -2]} intensity={0.3} />
      <Environment preset="apartment" />

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

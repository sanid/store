"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { useMemo } from "react";
import type * as THREE from "three";
import type { FurnitureConfig, CellInsert } from "@/lib/types";

const PLYWOOD_EDGE = "#d9b483";
const SHELF_THICKNESS = 0.015;
const WALL_THICKNESS = 0.018;

function hashIdx(seed: number): number {
  const x = Math.sin(seed * 9.7841) * 43758.5453;
  return x - Math.floor(x);
}

function FurnitureModel({ config }: { config: FurnitureConfig }) {
  const W = config.width / 100;
  const H = config.height / 100;
  const D = config.depth / 100;
  const t = WALL_THICKNESS;

  const baseHeight = config.base === "legs" ? 0.12 : 0.06;
  const cellW = W / config.columns;
  const cellH = H / config.rows;

  const edgeColor = config.finish === "plywood" ? PLYWOOD_EDGE : config.color;
  const innerColor = config.finish === "veneer" ? "#e8ddd0" : "#f0ebe4";

  const cells = useMemo(() => {
    const out: { key: string; x: number; y: number; idx: number; insert: CellInsert; pixelFilled: boolean }[] = [];
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.columns; c++) {
        const idx = r * config.columns + c;
        const x = -W / 2 + cellW / 2 + c * cellW;
        const y = -H / 2 + cellH / 2 + r * cellH;
        const insert = config.cells[idx] ?? "open";
        const pixelFilled = config.style === "pixel" && hashIdx(idx + config.columns * 7 + config.rows * 13) * 100 < config.density;
        out.push({ key: `${r}-${c}`, x, y, idx, insert, pixelFilled });
      }
    }
    return out;
  }, [config.rows, config.columns, config.cells, config.style, config.density, W, H, cellW, cellH]);

  return (
    <group position={[0, baseHeight + H / 2, 0]}>
      {/* Outer frames */}
      <mesh position={[0, H / 2 - t / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, t, D]} />
        <meshStandardMaterial color={edgeColor} roughness={0.8} />
      </mesh>
      <mesh position={[0, -H / 2 + t / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, t, D]} />
        <meshStandardMaterial color={edgeColor} roughness={0.8} />
      </mesh>
      <mesh position={[-W / 2 + t / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[t, H, D]} />
        <meshStandardMaterial color={edgeColor} roughness={0.8} />
      </mesh>
      <mesh position={[W / 2 - t / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[t, H, D]} />
        <meshStandardMaterial color={edgeColor} roughness={0.8} />
      </mesh>

      {/* Internal vertical dividers */}
      {Array.from({ length: config.columns - 1 }).map((_, i) => {
        const x = -W / 2 + cellW * (i + 1);
        return (
          <mesh key={`v-${i}`} position={[x, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[t, H, D]} />
            <meshStandardMaterial color={edgeColor} roughness={0.8} />
          </mesh>
        );
      })}

      {/* Internal horizontal shelves */}
      {Array.from({ length: config.rows - 1 }).map((_, i) => {
        const y = -H / 2 + cellH * (i + 1);
        return (
          <mesh key={`h-${i}`} position={[0, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[W, t, D]} />
            <meshStandardMaterial color={edgeColor} roughness={0.8} />
          </mesh>
        );
      })}

      {/* Per-cell content */}
      {cells.map(({ key, x, y, idx, insert, pixelFilled }) => {
        const hasBack = config.backs;
        const innerW = cellW - t * 2;
        const innerH = cellH - t * 2;
        const innerD = D - t * 2;
        const cellColor = pixelFilled ? config.color : innerColor;

        return (
          <group key={key} position={[x, y, 0]}>
            {hasBack && (
              <mesh position={[0, 0, -D / 2 + t / 2]} receiveShadow>
                <boxGeometry args={[innerW, innerH, t]} />
                <meshStandardMaterial color={config.color} roughness={0.7} />
              </mesh>
            )}
            <mesh position={[0, 0, hasBack ? -D / 2 + t + 0.001 : -D / 2 + 0.001]}>
              <planeGeometry args={[innerW, innerH]} />
              <meshStandardMaterial color={cellColor} roughness={0.9} />
            </mesh>

            {insert === "open" && idx % 5 === 0 && (
              <mesh position={[0, -innerH * 0.12, -t / 2]} receiveShadow>
                <boxGeometry args={[innerW, SHELF_THICKNESS, innerD * 0.85]} />
                <meshStandardMaterial color={edgeColor} roughness={0.8} />
              </mesh>
            )}

            {insert === "door" && (
              <group>
                <mesh position={[0, 0, D / 2 - t / 2]} castShadow receiveShadow>
                  <boxGeometry args={[innerW - 0.004, innerH - 0.004, t]} />
                  <meshStandardMaterial
                    color={config.color}
                    roughness={config.finish === "veneer" ? 0.5 : 0.7}
                    metalness={config.finish === "veneer" ? 0.05 : 0}
                  />
                </mesh>
                <mesh position={[innerW * 0.3, 0, D / 2 + t / 2 + 0.006]} castShadow>
                  <cylinderGeometry args={[0.004, 0.004, innerH * 0.15, 8]} />
                  <meshStandardMaterial color="#555" roughness={0.3} metalness={0.7} />
                </mesh>
              </group>
            )}

            {insert === "drawer" && (
              <group>
                {[0.25, -0.25].map((yo, di) => (
                  <group key={di} position={[0, innerH * yo, D / 2 - t / 2]}>
                    <mesh castShadow receiveShadow>
                      <boxGeometry args={[innerW - 0.004, innerH * 0.45, t]} />
                      <meshStandardMaterial
                        color={config.color}
                        roughness={config.finish === "veneer" ? 0.5 : 0.7}
                        metalness={config.finish === "veneer" ? 0.05 : 0}
                      />
                    </mesh>
                    <mesh position={[0, 0, t / 2 + 0.005]} castShadow>
                      <boxGeometry args={[innerW * 0.3, 0.012, 0.012]} />
                      <meshStandardMaterial color="#555" roughness={0.3} metalness={0.7} />
                    </mesh>
                  </group>
                ))}
              </group>
            )}
          </group>
        );
      })}

      {/* Base */}
      {config.base === "legs" ? (
        <>
          {[
            [-W / 2 + 0.05, -H / 2 - baseHeight / 2, -D / 2 + 0.05],
            [W / 2 - 0.05, -H / 2 - baseHeight / 2, -D / 2 + 0.05],
            [-W / 2 + 0.05, -H / 2 - baseHeight / 2, D / 2 - 0.05],
            [W / 2 - 0.05, -H / 2 - baseHeight / 2, D / 2 - 0.05],
          ].map((p, i) => (
            <mesh key={i} position={p as [number, number, number]} castShadow>
              <cylinderGeometry args={[0.015, 0.012, baseHeight, 12]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.3} metalness={0.6} />
            </mesh>
          ))}
        </>
      ) : (
        <mesh position={[0, -H / 2 - baseHeight / 2, 0]} castShadow>
          <boxGeometry args={[W - 0.02, baseHeight, D - 0.02]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
        </mesh>
      )}
    </group>
  );
}

function HumanSilhouette({ offsetX }: { offsetX: number }) {
  return (
    <group position={[offsetX, 0, -0.4]}>
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.18, 0.16, 0.7, 16]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.13, 0.1, 0.85, 16]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

interface FurnitureSceneProps {
  config: FurnitureConfig;
  onReady?: (gl: THREE.WebGLRenderer) => void;
}

export default function FurnitureScene({ config, onReady }: FurnitureSceneProps) {
  const cameraDist = Math.max(2.6, (config.width / 100) * 1.5);
  const silhouetteX = -(config.width / 200) - 0.6;

  return (
    <Canvas
      shadows
      camera={{ position: [cameraDist * 0.7, 1.3, cameraDist], fov: 38 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      dpr={[1, 2]}
      onCreated={({ gl }) => onReady?.(gl)}
    >
      <color attach="background" args={["#f5f4f2"]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[4, 6, 3]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-3, 2, -2]} intensity={0.3} />
      <hemisphereLight args={["#ffffff", "#c4beb6", 0.45]} />
      <FurnitureModel config={config} />
      <HumanSilhouette offsetX={silhouetteX} />
      <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={8} blur={2.5} far={2} />
      <OrbitControls
        enablePan={false}
        minDistance={1.6}
        maxDistance={6}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, config.height / 200 + 0.08, 0]}
      />
    </Canvas>
  );
}

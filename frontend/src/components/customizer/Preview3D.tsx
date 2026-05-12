"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox, Text } from "@react-three/drei";
import type * as THREE from "three";

import type { CustomizationSchema } from "@/lib/types";

interface Preview3DProps {
  customization: Record<string, unknown>;
  schema: CustomizationSchema | null;
}

function findFieldValue(
  customization: Record<string, unknown>,
  schema: Preview3DProps["schema"],
  type: string
): unknown {
  if (!schema) return undefined;
  const field = schema.fields.find((f) => f.type === type);
  return field ? customization[field.id] : undefined;
}

function findFieldValueByIds(
  customization: Record<string, unknown>,
  ids: string[]
): unknown {
  for (const id of ids) {
    if (customization[id] !== undefined) return customization[id];
  }
  return undefined;
}

function ProductModel({ customization, schema }: Preview3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  const widthVal = findFieldValue(customization, schema, "number")
    ?? findFieldValueByIds(customization, ["width", "breite", "laenge"]);
  const heightVal = findFieldValueByIds(customization, ["height", "hoehe"]);
  const depthVal = findFieldValueByIds(customization, ["depth", "tiefe"]);

  const width = Math.max(0.5, ((Number(widthVal) || 100) / 100) * 2);
  const height = Math.max(0.5, ((Number(heightVal) || 100) / 100) * 2);
  const depth = Math.max(0.5, ((Number(depthVal) || 100) / 100) * 2);

  const color = String(
    findFieldValue(customization, schema, "color")
    ?? customization.color
    ?? "#6366f1"
  );
  const engravingText = String(
    findFieldValue(customization, schema, "text")
    ?? findFieldValueByIds(customization, ["engraving", "text", "gravur"])
    ?? ""
  );

  return (
    <group>
      <RoundedBox
        ref={meshRef}
        args={[width, height, depth]}
        radius={0.05}
        smoothness={4}
      >
        <meshStandardMaterial color={color} metalness={0.1} roughness={0.6} />
      </RoundedBox>
      {engravingText && (
        <Text
          position={[0, 0, depth / 2 + 0.01]}
          fontSize={Math.min(0.15, 0.8 / Math.max(1, engravingText.length))}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          maxWidth={width * 0.8}
        >
          {engravingText.slice(0, 30)}
        </Text>
      )}
      <pointLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-5, -5, -5]} intensity={0.3} />
    </group>
  );
}

export default function Preview3D({ customization, schema }: Preview3DProps) {
  return (
    <div className="h-[300px] w-full overflow-hidden rounded-xl border border-border bg-gradient-to-b from-gray-50 to-gray-100 lg:h-[400px]">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <ProductModel customization={customization} schema={schema} />
        <OrbitControls
          enablePan={false}
          minDistance={3}
          maxDistance={8}
          autoRotate
          autoRotateSpeed={1}
        />
      </Canvas>
    </div>
  );
}

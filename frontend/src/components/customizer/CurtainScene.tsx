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

// --- Scene proportions -------------------------------------------------
// The room is derived from the only two numbers the customer actually enters
// (rail width + curtain drop), so window, wall and camera always stand in a
// believable relation to the curtain instead of a fixed stage set.
const RAIL_OVERHANG = 0.18; // rail runs this far past the window on each side
const HEADER_ABOVE = 0.16; // rail is mounted this far above the window head
const HEM_CLEARANCE = 0.02; // a floor-length hem stops just short of the floor
const MIN_WIN_H = 0.6;
const WALL_Z = -0.22;

interface SceneMetrics {
  railWidthM: number;
  curtainH: number;
  winW: number;
  winH: number;
  sillY: number;
  winTopY: number;
  winCenterY: number;
  railY: number;
  ceilingY: number;
  wallW: number;
  roomDepth: number;
}

/**
 * Where the fabric's top edge sits relative to the rod/track centre — positive
 * is below it. An eyelet header is the odd one out: the rod passes *through*
 * the cloth, so the top edge stands above the rod by the distance from the
 * eyelet centre to the hem.
 */
const EYELET_RISE = 0.038;
function headerDrop(header: CurtainHeader): number {
  if (header === "eyelet") return -EYELET_RISE;
  if (header === "pencil" || header === "single-pinch") return 0.075; // track glider + hook
  return 0.055; // ring + hook
}

function sceneMetrics(railWidthM: number, curtainH: number, drop: number): SceneMetrics {
  // A rod is ordered wider than the opening; the window is what's left.
  const winW = Math.max(0.5, railWidthM - RAIL_OVERHANG * 2);
  // Taller drops belong to taller windows, which sit on a higher sill —
  // clamped to the range real sills live in (45–95 cm above the floor).
  const sillY = Math.min(0.95, Math.max(0.45, curtainH * 0.28));
  // Curtains are ordered rail-to-floor, so the rail height follows the drop —
  // plus whatever the hooks hang below the rod, which is why an installer
  // mounts the rod that bit higher. Very short drops get lifted so the window
  // underneath stays plausible.
  const railY = Math.max(curtainH + HEM_CLEARANCE + drop, sillY + MIN_WIN_H + HEADER_ABOVE);
  const winTopY = railY - HEADER_ABOVE;
  const winH = winTopY - sillY;
  const ceilingY = Math.max(railY + 0.26, 2.5);
  const wallW = Math.max(railWidthM + 3.4, 5.4);
  const roomDepth = Math.max(5.5, ceilingY * 1.7);
  return {
    railWidthM,
    curtainH,
    winW,
    winH,
    sillY,
    winTopY,
    winCenterY: sillY + winH / 2,
    railY,
    ceilingY,
    wallW,
    roomDepth,
  };
}

// Depth budget in front of the wall (wall face is at WALL_Z = -0.22):
//   window frame front  -0.17
//   sill front edge     -0.115  (SILL_FRONT_Z)
//   curtain travel limit -0.09  (CURTAIN_Z_MIN — 2.5 cm clear of the sill)
//   rod / fabric plane    0.00
// The panel used to be allowed back to -0.145, which put its fold troughs
// inside the sill; that is what was punching through the cloth.
const SILL_FRONT_Z = -0.115;
const CURTAIN_Z_MIN = -0.09;
// A fold can billow as far into the room as it likes, but behind the rod it
// runs out of room — so the rearward half of the wave saturates rather than
// being clipped flat by the collision clamp. Cloth genuinely behaves this way:
// the wall is what stops it.
const FOLD_BACK_LIMIT = 0.07;
const RETURN_DEPTH = 0.07; // outer edge wraps back toward the wall bracket
const RETURN_ZONE = 0.13; // width of that wrap, in metres

/**
 * Mesh resolution for a panel. Shared by the geometry builder and the cloth
 * simulation — if these two disagree the physics writes to the wrong vertices,
 * so there is exactly one definition. Roughly 13+ segments per fold, which is
 * where the folds stop looking faceted.
 */
function curtainSegments(widthM: number, fullness: number) {
  return {
    w: Math.max(80, Math.min(240, Math.round(widthM * 95 * fullness))),
    h: 14,
  };
}

/** Folds per metre of finished width, before fullness is applied. */
function foldDensity(header: CurtainHeader): number {
  if (header === "pencil") return 1.6;
  if (header === "single-pinch") return 1.15;
  if (header === "eyelet") return 0.85;
  return 1.0;
}

/**
 * Where the panel is attached to the hardware, in panel-local x.
 *
 * This is the single source of truth for both the cloth and the rail: a hook
 * has to sit on the pleat it carries, so the geometry phases its folds to
 * these positions and the rail hangs its rings at exactly the same ones.
 *
 * Pleated headers attach at every fold crest — the pleat *is* the fold, pinched
 * into the heading tape. Eyelets attach twice per fold instead: the rod runs
 * through every eyelet and the cloth between two of them swings alternately
 * to the front and the back of the rod, so an eyelet lands on each zero
 * crossing of the wave, not on its crest.
 */
function attachmentLayout(
  widthM: number,
  fullness: number,
  header: CurtainHeader,
  side: "left" | "right"
) {
  const totalFolds = Math.max(2, Math.round(2.6 * fullness * foldDensity(header) * widthM));
  const perFold = header === "eyelet" ? 2 : 1;
  const count = totalFolds * perFold;
  const spacing = widthM / count;
  // Numbered from the free leading edge inwards, so the pleat that shows most
  // is always a whole one and the last one lands on the return.
  const leadingX = side === "left" ? widthM / 2 : -widthM / 2;
  const dir = side === "left" ? -1 : 1;
  const positions: number[] = [];
  for (let k = 0; k <= count; k++) positions.push(leadingX + dir * k * spacing);
  return { totalFolds, spacing, positions, leadingX };
}

function curtainGeometry(
  widthM: number,
  heightM: number,
  reserve: FabricReserve,
  header: CurtainHeader,
  side: "left" | "right",
  material?: FabricSwatch["material"]
): THREE.BufferGeometry {
  const fullness = RESERVE_FACTOR[reserve];
  const segs = curtainSegments(widthM, fullness);
  const geo = new THREE.PlaneGeometry(widthM, heightM, segs.w, segs.h);
  const pos = geo.attributes.position;

  const attach = attachmentLayout(widthM, fullness, header, side);
  const totalFolds = attach.totalFolds;
  const isEyelet = header === "eyelet";

  // Material weight affects drape: heavy fabrics (velvet, wool) hang straighter
  // with deeper, fewer folds; light fabrics (sheer, silk) flutter more
  const weightFactor =
    material === "velvet" ? 1.3 :
    material === "wool" ? 1.2 :
    material === "silk-blend" ? 0.85 :
    material === "synthetic" ? 0.9 :
    material === "linen" ? 1.1 :
    1.0;

  // Half-depth of a fold. A pinch-pleat curtain at 2× fullness projects roughly
  // 10–14 cm front to back, so amplitude lands around 0.05–0.07 m.
  const baseAmp = (0.03 + 0.031 * (fullness - 1)) * weightFactor;

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

  const halfW0 = widthM / 2;
  // Outer edge = the one against the wall; it returns back to the bracket.
  const outerX = side === "right" ? halfW0 : -halfW0;
  const leadingX = attach.leadingX;

  // Phase the wave onto the hardware. A pleated panel ends in a whole rounded
  // fold at its leading edge (crest = π/2); an eyelet panel ends on an eyelet,
  // which sits on the rod plane (zero crossing = 0).
  const phaseAtLeading = (leadingX / widthM) * totalFolds * Math.PI * 2;
  const phaseShift = (isEyelet ? 0 : Math.PI / 2) - phaseAtLeading;

  // Fabric wrapping around to the wall smooths out; folds die into the return.
  function returnBlend(x: number): number {
    const t = 1 - Math.min(1, Math.abs(x - outerX) / RETURN_ZONE);
    return t * t;
  }

  function foldDisplacement(x: number, yNorm: number): number {
    const foldIdx = (x / widthM) * totalFolds;
    const foldPhase = foldIdx * Math.PI * 2 + phaseShift;
    // Per-fold variation has to be blended between neighbours, not stepped:
    // a jump at each fold boundary creases the surface and the panel ends up
    // looking like vertical blinds instead of cloth.
    const fAbs = Math.abs(foldIdx);
    const i0 = Math.floor(fAbs) % foldOffsets.length;
    const i1 = (i0 + 1) % foldOffsets.length;
    const f = fAbs - Math.floor(fAbs);
    const blend = f * f * (3 - 2 * f);
    // Near the header the hardware dictates the shape: pleats are pinched at
    // fixed centres by the hooks, so the random wander has to fade out or the
    // folds drift off the rings they are supposed to hang from. Lower down the
    // cloth is free and the irregularity comes back.
    const lock = Math.min(1, Math.max(0, (yNorm - 0.62) / 0.28));
    const free = 1 - lock * lock * (3 - 2 * lock);
    const phaseOffset =
      (foldOffsets[i0] + (foldOffsets[i1] - foldOffsets[i0]) * blend) * free;
    const ampVarRaw = foldAmps[i0] + (foldAmps[i1] - foldAmps[i0]) * blend;
    const ampVar = 1 + (ampVarRaw - 1) * free;

    let topTaper = 1;
    if (header === "triple-pinch") {
      topTaper = yNorm > 0.93 ? Math.max(0, (1 - yNorm) / 0.07) : 1;
    } else if (header === "flemish") {
      topTaper = yNorm > 0.90 ? Math.max(0.25, (1 - yNorm) / 0.1 + 0.25) : 1;
    } else if (header === "single-pinch") {
      // small evenly-spaced pinches — short taper, less aggressive than triple
      topTaper = yNorm > 0.95 ? Math.max(0.15, (1 - yNorm) / 0.05 * 0.85) : 1;
    } else if (header === "eyelet") {
      // The rod itself holds the wave open at the header, so an eyelet panel
      // is at its crispest right at the top — no taper, a touch of extra depth.
      topTaper = yNorm > 0.9 ? 1.12 : 1;
    } else if (header === "pencil") {
      // tightly gathered top — fold amplitude actually amplified near top
      topTaper = yNorm > 0.92 ? 1.25 : 1;
    }

    const gravityCurve = Math.pow(Math.max(yNorm, 0.15), -0.18 * weightFactor);
    const gravityFactor = Math.min(1.25, 0.6 + 0.55 * (1 - yNorm) * gravityCurve);

    const ret = returnBlend(x);
    const amp = baseAmp * topTaper * gravityFactor * ampVar * (1 - 0.75 * ret);

    // Fold cross-section: from inside the room a curtain reads as broad,
    // rounded crests separated by narrow deep creases — not a plain sine.
    const s = Math.sin(foldPhase + phaseOffset);
    const shaped = s >= 0 ? Math.pow(s, 0.82) : -Math.pow(-s, 1.3);
    let z = shaped * amp;

    z += Math.sin(foldPhase * 2 + phaseOffset * 1.7) * amp * 0.18;

    // Pinch pleats: above the heading tape the cloth between pleats lies flat
    // (that's the taper above), while the pleat itself is gathered into a
    // bunch that stands proud of the tape. Without these the header just
    // fades to a flat band and the panel loses what makes it a pinch pleat.
    if (
      (header === "triple-pinch" || header === "single-pinch" || header === "flemish") &&
      yNorm > 0.86
    ) {
      const band = Math.min(1, (yNorm - 0.86) / 0.11);
      const crest = Math.max(0, Math.sin(foldPhase + phaseOffset));
      const pinch = Math.pow(crest, 5); // narrow spike centred on the pleat
      const depth = header === "flemish" ? 1.15 : header === "single-pinch" ? 0.7 : 1.0;
      z += pinch * baseAmp * 0.95 * depth * band;
    }

    // Pencil pleats: extra high-frequency vertical ridges in the top band
    if (header === "pencil" && yNorm > 0.88) {
      const ridge = Math.sin(foldPhase * 3.5 + phaseOffset * 0.8) * amp * 0.45;
      z += ridge * Math.min(1, (yNorm - 0.88) / 0.06);
    }

    // Saturate the rearward half of the fold. tanh is linear for shallow
    // troughs, so ordinary folds are untouched; only the deepest ones ease off
    // as they approach the limit, instead of being sheared off by the clamp.
    if (z < 0) z = -FOLD_BACK_LIMIT * Math.tanh(-z / FOLD_BACK_LIMIT);

    // The return: the wall-side edge wraps back to the bracket instead of
    // stopping flat in mid-air. Slightly shallower at the hem, where the
    // fabric is free to swing.
    z -= RETURN_DEPTH * ret * (0.85 + 0.15 * yNorm);

    return z;
  }

  // Ambient occlusion, baked per vertex. Light barely reaches the bottom of a
  // crease between two folds, and no amount of direct lighting reproduces that
  // on its own — without it the cloth reads as corrugated plastic.
  const colors = new Float32Array(pos.count * 3);

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

    // Weighted hem: the lead tape in the bottom few centimetres holds the
    // cloth and pulls the very edge back toward the mean plane.
    if (yNorm < 0.035) {
      const settle = 1 - yNorm / 0.035;
      z *= 1 - 0.12 * settle;
    }

    pos.setZ(i, z);

    // The top edge is carried at the hooks and sags a little between them.
    // A dead-straight top edge floating under the hardware was the main reason
    // the panel didn't look attached to anything. Eyelet headers are stiffened
    // with buckram and stay straight, so they are left alone.
    if (!isEyelet && yNorm > 0.8) {
      const band = (yNorm - 0.8) / 0.2;
      const frac = ((x - leadingX) / attach.spacing) % 1;
      const between = Math.sin(Math.PI * Math.abs(frac));
      pos.setY(i, y - between * between * 0.011 * band * band);
    }

    // Depth within the fold, 0 at the back of a crease → 1 on the crest.
    const t = Math.min(1, Math.max(0, z / (baseAmp * 2.4) + 0.5));
    let ao = 0.66 + 0.34 * (t * t * (3 - 2 * t));
    ao *= 1 - 0.16 * returnBlend(x); // the return is tucked against the wall
    ao *= 1 - 0.1 * Math.max(0, 1 - yNorm / 0.12); // less light near the floor
    if (yNorm > 0.9) ao *= 1 - 0.12 * ((yNorm - 0.9) / 0.1); // shaded under the header
    colors[i * 3] = ao;
    colors[i * 3 + 1] = ao;
    colors[i * 3 + 2] = ao;
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
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

// --- Room surfaces -----------------------------------------------------
// All procedural: no extra assets to ship, and every tile is sized in metres
// so the grain and weave stay at a believable physical scale.

// Only the painted canvases are cached. Textures are built per mount: R3F
// disposes them when the Canvas unmounts, and handing a disposed texture to a
// later mount uploads nothing and renders black.
function texFromCanvas(canvas: HTMLCanvasElement, srgb: boolean): THREE.Texture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

let floorCanvasCache: { map: HTMLCanvasElement; normal: HTMLCanvasElement } | null = null;

/** Oak plank floor: one tile = 2 m × 2 m, planks running away from the wall. */
function floorCanvases() {
  if (floorCanvasCache) return floorCanvasCache;
  const size = 1024;
  const planks = 11; // ≈18 cm wide boards
  const plankW = size / planks;
  const rowH = size / 2; // ≈1 m long boards, staggered per column

  const make = (normal: boolean) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = normal ? "#8080ff" : "#b08e66";
    ctx.fillRect(0, 0, size, size);

    for (let p = 0; p < planks; p++) {
      const x = p * plankW;
      const offset = ((p * 0.37) % 1) * rowH; // stagger the end joints
      for (let r = -1; r < 3; r++) {
        const y = r * rowH + offset;
        if (!normal) {
          // Board tone varies plank to plank, as sawn oak does.
          const warm = 0.86 + ((p * 7 + r * 13) % 11) / 40;
          const rC = Math.min(255, 176 * warm);
          const gC = Math.min(255, 142 * warm);
          const bC = Math.min(255, 102 * warm);
          ctx.fillStyle = `rgb(${rC | 0},${gC | 0},${bC | 0})`;
          ctx.fillRect(x, y, plankW, rowH);

          // Grain: long, low-contrast streaks along the board.
          for (let g = 0; g < 26; g++) {
            const gx = x + Math.random() * plankW;
            const dark = Math.random() > 0.5;
            ctx.strokeStyle = dark
              ? `rgba(96,68,42,${0.05 + Math.random() * 0.12})`
              : `rgba(226,200,164,${0.04 + Math.random() * 0.08})`;
            ctx.lineWidth = 0.6 + Math.random() * 2.2;
            ctx.beginPath();
            ctx.moveTo(gx, y);
            for (let s = 0; s <= 6; s++) {
              ctx.lineTo(gx + Math.sin(s * 0.9 + g) * 2.5, y + (rowH / 6) * s);
            }
            ctx.stroke();
          }
        }
        // Board joints: a dark seam plus a bevel highlight either side.
        ctx.strokeStyle = normal ? "rgba(110,110,255,0.9)" : "rgba(74,52,32,0.55)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + plankW, y);
        ctx.stroke();
      }
      ctx.strokeStyle = normal ? "rgba(150,110,255,0.9)" : "rgba(74,52,32,0.6)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }

    return canvas;
  };

  floorCanvasCache = { map: make(false), normal: make(true) };
  return floorCanvasCache;
}

let wallCanvasCache: HTMLCanvasElement | null = null;

/** Painted plaster: fine tooth, one tile = 1.5 m. */
function wallCanvas() {
  if (wallCanvasCache) return wallCanvasCache;
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ece6da";
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 9;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  // A few broad trowel sweeps so large flat areas aren't perfectly uniform.
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.03})`;
    ctx.lineWidth = 8 + Math.random() * 26;
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    ctx.lineTo(Math.random() * size, Math.random() * size);
    ctx.stroke();
  }
  wallCanvasCache = canvas;
  return canvas;
}

let viewCanvasCache: HTMLCanvasElement | null = null;

/** What's outside: hazy sky, layered treeline, lawn — painted, then blurred. */
function outdoorCanvas() {
  if (viewCanvasCache) return viewCanvasCache;
  const w = 512;
  const h = 640;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  const horizon = h * 0.66;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#8fb6d8");
  sky.addColorStop(0.55, "#c2d8e6");
  sky.addColorStop(1, "#e6ecec");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizon);

  // Sun haze, off to one side — it's also where the key light comes from.
  const glow = ctx.createRadialGradient(w * 0.74, h * 0.16, 0, w * 0.74, h * 0.16, h * 0.42);
  glow.addColorStop(0, "rgba(255,248,228,0.85)");
  glow.addColorStop(1, "rgba(255,248,228,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, horizon);

  try {
    ctx.filter = "blur(3px)";
  } catch {
    /* filter unsupported — the painting still reads fine */
  }
  // Soft clouds
  for (let i = 0; i < 9; i++) {
    const cx = Math.random() * w;
    const cy = h * (0.05 + Math.random() * 0.3);
    ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.35})`;
    for (let b = 0; b < 5; b++) {
      ctx.beginPath();
      ctx.ellipse(cx + b * 18 - 36, cy + Math.sin(b) * 5, 34 - b * 3, 13, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Distant ridge, hazy and desaturated.
  ctx.filter = "blur(6px)";
  ctx.fillStyle = "#a7b6b0";
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  for (let x = 0; x <= w; x += 16) {
    ctx.lineTo(x, horizon - 46 - Math.sin(x * 0.011) * 26 - Math.sin(x * 0.031) * 11);
  }
  ctx.lineTo(w, horizon);
  ctx.closePath();
  ctx.fill();

  // Treeline: two layers, the nearer one darker and sharper.
  const treeRow = (baseY: number, color: string, scale: number, blur: number) => {
    ctx.filter = `blur(${blur}px)`;
    ctx.fillStyle = color;
    for (let x = -40; x < w + 40; x += 26 * scale) {
      const r = (20 + Math.random() * 22) * scale;
      const y = baseY - r * 0.45 + Math.random() * 10;
      ctx.beginPath();
      ctx.ellipse(x + Math.random() * 12, y, r, r * (0.8 + Math.random() * 0.5), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  treeRow(horizon - 6, "#7d9075", 0.85, 4);
  treeRow(horizon + 10, "#5c7355", 1.15, 2.5);

  // Lawn falling away from the window.
  ctx.filter = "none";
  const grass = ctx.createLinearGradient(0, horizon, 0, h);
  grass.addColorStop(0, "#6f8459");
  grass.addColorStop(1, "#899a60");
  ctx.fillStyle = grass;
  ctx.fillRect(0, horizon, w, h - horizon);
  try {
    ctx.filter = "blur(2px)";
  } catch {
    /* ignore */
  }
  for (let i = 0; i < 260; i++) {
    const y = horizon + Math.random() * (h - horizon);
    const t = (y - horizon) / (h - horizon);
    ctx.fillStyle = `rgba(${90 + t * 40},${110 + t * 30},${70 + t * 20},0.35)`;
    ctx.fillRect(Math.random() * w, y, 2 + t * 6, 1 + t * 3);
  }
  ctx.filter = "none";

  viewCanvasCache = canvas;
  return canvas;
}

const CurtainPanel = memo(function CurtainPanel({
  side,
  widthM,
  heightM,
  config,
  fabric,
  topY,
  xOffset,
  zOffset,
}: {
  side: "left" | "right";
  widthM: number;
  heightM: number;
  config: CurtainConfig;
  fabric: FabricSwatch;
  topY: number;
  xOffset: number;
  zOffset: number;
}) {
  const isPhoto = fabric.pattern === "photo";
  const geo = useMemo(
    () => curtainGeometry(widthM, heightM, config.reserve, config.header, side, fabric.material),
    [widthM, heightM, config.reserve, config.header, side, fabric.material]
  );
  const basePositions = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo]);
  const meshRef = useRef<THREE.Mesh>(null);

  // Verlet sway: per-vertex Z/X offset from rest, integrated each frame.
  // Top row pinned (yNorm=1). Horizontal coupling makes the cloth resist local
  // creases. Wind force is a low-frequency noise field. Damping bleeds energy.
  const segCountW = useMemo(
    () => curtainSegments(widthM, RESERVE_FACTOR[config.reserve]).w + 1,
    [widthM, config.reserve]
  );
  const segCountH = useMemo(
    () => curtainSegments(widthM, RESERVE_FACTOR[config.reserve]).h + 1,
    [widthM, config.reserve]
  );

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
  }, [segCountW, segCountH]);

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
    // the back wall (z=-0.22) or window frame (z≈-0.17). The panel's own z
    // offset is part of the budget, so the limit is expressed in local space.
    const Z_MIN = CURTAIN_Z_MIN - zOffset;
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

  // Texture scale is physical, not per-panel: one tile ≈ 30 cm of cloth. The
  // panel is drawn at its *finished* width, so the fabric it was cut from —
  // width × fullness — is what the weave has to be compressed into.
  useEffect(() => {
    const isPattern = isPhoto || fabric.pattern === "floral" || fabric.pattern === "geometric";
    const tile = isPattern ? 0.5 : 0.3;
    const flatWidth = widthM * RESERVE_FACTOR[config.reserve];
    const repX = Math.max(2, Math.round(flatWidth / tile));
    const repY = Math.max(2, Math.round(heightM / tile));
    tex.repeat.set(repX, repY);
    // The weave itself stays at its own scale regardless of the print.
    const nRep = Math.max(3, Math.round((widthM * RESERVE_FACTOR[config.reserve]) / 0.22));
    normalMap.repeat.set(nRep, Math.max(3, Math.round(heightM / 0.22)));
  }, [tex, normalMap, widthM, heightM, isPhoto, fabric.pattern, config.reserve]);

  // Cloth response per material: velvet has a strong, tight sheen and almost
  // no specular; linen and wool a broad dry one; silk sits between.
  const { roughness, sheen, sheenRoughness, normalScale } =
    fabric.material === "velvet"
      ? { roughness: 0.92, sheen: 1.0, sheenRoughness: 0.28, normalScale: 0.35 }
      : fabric.material === "wool"
      ? { roughness: 0.95, sheen: 0.55, sheenRoughness: 0.75, normalScale: 0.9 }
      : fabric.material === "silk-blend"
      ? { roughness: 0.55, sheen: 0.7, sheenRoughness: 0.35, normalScale: 0.4 }
      : fabric.material === "linen"
      ? { roughness: 0.88, sheen: 0.45, sheenRoughness: 0.8, normalScale: 1.05 }
      : fabric.material === "synthetic"
      ? { roughness: 0.72, sheen: 0.35, sheenRoughness: 0.5, normalScale: 0.55 }
      : { roughness: 0.82, sheen: 0.42, sheenRoughness: 0.7, normalScale: 0.85 };

  const transparent = fabric.transparency === "sheer" || fabric.transparency === "translucent";
  const opacity =
    fabric.transparency === "sheer" ? 0.55 : fabric.transparency === "translucent" ? 0.78 : 1;

  return (
    <mesh
      ref={meshRef}
      position={[xOffset, topY - heightM / 2, zOffset]}
      geometry={geo}
      castShadow
      receiveShadow
    >
      <meshPhysicalMaterial
        map={tex}
        vertexColors
        normalMap={normalMap}
        normalScale={new THREE.Vector2(normalScale, normalScale)}
        color={isPhoto && !fabric.textureUrl ? fabric.hex : "#ffffff"}
        roughness={roughness}
        metalness={0}
        sheen={sheen}
        sheenRoughness={sheenRoughness}
        sheenColor={new THREE.Color("#ffffff")}
        specularIntensity={fabric.material === "silk-blend" ? 0.5 : 0.18}
        side={THREE.DoubleSide}
        transparent={transparent}
        opacity={opacity}
      />
    </mesh>
  );
});

const Rail = memo(function Rail({
  widthM,
  header,
  railY,
  attachXs,
  fabricTopY,
}: {
  widthM: number;
  header: CurtainHeader;
  railY: number;
  /** World x of every point where a panel is actually hung. */
  attachXs: number[];
  /** World y of the fabric's top edge, so hooks reach it instead of stopping short. */
  fabricTopY: number;
}) {
  // A rod is cut to the curtain's span plus a finial's worth of clearance —
  // not the 40 cm of bare metal that used to hang past the fabric.
  const totalW = widthM + 0.12;
  const isEyelet = header === "eyelet";
  const isPencil = header === "pencil";
  const isSinglePinch = header === "single-pinch";
  const isTrack = isPencil || isSinglePinch;
  // Gliders sit under the track, rings on the rod; either way the hook has to
  // span whatever is left between the carrier and the top of the cloth.
  const carrierBottom = isTrack ? -0.078 : -0.027;
  const hookSpan = Math.max(0, railY - fabricTopY + carrierBottom);

  // Brackets carry the rod back to the wall — a rod floating in mid-air was
  // one of the clearest tells that this was a diagram, not a room.
  const bracketXs =
    totalW > 2.6 ? [-totalW / 2 + 0.16, 0, totalW / 2 - 0.16] : [-totalW / 2 + 0.16, totalW / 2 - 0.16];
  const bracketReach = Math.abs(WALL_Z) - 0.01;

  return (
    <group position={[0, railY, 0]}>
      {bracketXs.map((bx, i) => (
        <group key={`br${i}`} position={[bx, 0, 0]}>
          {/* arm from wall to rod */}
          <mesh position={[0, -0.005, -bracketReach / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.008, 0.008, bracketReach, 10]} />
            <meshStandardMaterial color="#232323" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* wall plate */}
          <mesh position={[0, -0.005, -bracketReach]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.028, 0.028, 0.008, 16]} />
            <meshStandardMaterial color="#1d1d1d" metalness={0.55} roughness={0.45} />
          </mesh>
          {/* saddle holding the rod */}
          <mesh position={[0, -0.018, 0]} castShadow>
            <boxGeometry args={[0.02, 0.03, 0.05]} />
            <meshStandardMaterial color="#1d1d1d" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      ))}
      {isTrack ? (
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
          {/* Round rod, Ø28 mm — the standard size, and it catches light
              along its length the way a flat box never did. */}
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.014, 0.014, totalW, 20]} />
            <meshStandardMaterial color="#232323" metalness={0.65} roughness={0.35} />
          </mesh>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * (totalW / 2), 0, 0]}>
              {/* collar + ball finial */}
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.019, 0.019, 0.018, 16]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
              </mesh>
              <mesh position={[s * 0.032, 0, 0]} castShadow>
                <sphereGeometry args={[0.028, 20, 16]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.28} />
              </mesh>
            </group>
          ))}
        </>
      )}
      {attachXs.map((rx, i) => {
        if (isEyelet) {
          // Brushed-steel eyelet punched through the cloth, with the rod
          // running through it. Standard size: 35 mm clear hole on a 28 mm
          // rod — barely wider than the bar, not the hoop it used to be.
          return (
            <group key={i} position={[rx, 0, 0]}>
              <mesh rotation={[0, Math.PI / 2, 0]} castShadow>
                <torusGeometry args={[0.0212, 0.0038, 12, 26]} />
                <meshStandardMaterial color="#c8c8cc" metalness={0.95} roughness={0.2} />
              </mesh>
              {/* shadowed lip on the inside of the hole */}
              <mesh rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.0182, 0.0012, 8, 22]} />
                <meshStandardMaterial color="#5a5a5e" metalness={0.6} roughness={0.5} />
              </mesh>
            </group>
          );
        }
        if (isTrack) {
          // Glider running in the track, with the hook that drops into the
          // pleat tape. The hook is drawn to the real top of the cloth so the
          // panel is visibly carried rather than floating under the rail.
          return (
            <group key={i} position={[rx, 0, 0]}>
              <mesh position={[0, -0.05, 0]} castShadow>
                <boxGeometry args={[isPencil ? 0.022 : 0.024, 0.045, 0.05]} />
                <meshStandardMaterial color="#141414" metalness={0.5} roughness={0.45} />
              </mesh>
              <mesh position={[0, -0.078, 0]} rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.006, 0.0015, 6, 12]} />
                <meshStandardMaterial color="#3a3a3a" metalness={0.7} roughness={0.4} />
              </mesh>
              {hookSpan > 0.002 && (
                <mesh position={[0, carrierBottom - hookSpan / 2, 0]}>
                  <cylinderGeometry args={[0.0016, 0.0016, hookSpan, 6]} />
                  <meshStandardMaterial color="#3a3a3a" metalness={0.75} roughness={0.35} />
                </mesh>
              )}
            </group>
          );
        }
        // Curtain ring: encircles the rod, with the eyelet and the wire hook
        // that carries the pleat.
        return (
          <group key={i} position={[rx, 0, 0]}>
            {/* 50 mm ring on a 28 mm rod, the size that's actually sold */}
            <mesh rotation={[0, Math.PI / 2, 0]} castShadow>
              <torusGeometry args={[0.021, 0.004, 12, 24]} />
              <meshStandardMaterial color="#262626" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[0, -0.027, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
              <torusGeometry args={[0.007, 0.002, 8, 16]} />
              <meshStandardMaterial color="#2e2e2e" metalness={0.7} roughness={0.35} />
            </mesh>
            {hookSpan > 0.002 && (
              <mesh position={[0, carrierBottom - hookSpan / 2, 0]}>
                <cylinderGeometry args={[0.0018, 0.0018, hookSpan, 6]} />
                <meshStandardMaterial color="#2e2e2e" metalness={0.75} roughness={0.35} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
});

/** A wall surface whose plaster texture keeps its physical scale. */
const WallPanel = memo(function WallPanel({
  w,
  h,
  position,
  rotation = [0, 0, 0],
  tint = "#ece6da",
}: {
  w: number;
  h: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  tint?: string;
}) {
  const map = useMemo(() => {
    const t = texFromCanvas(wallCanvas(), true);
    t.repeat.set(Math.max(1, w / 1.5), Math.max(1, h / 1.5));
    return t;
  }, [w, h]);
  useEffect(() => () => map.dispose(), [map]);
  if (w <= 0 || h <= 0) return null;
  return (
    <mesh position={position} rotation={rotation} receiveShadow castShadow>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={map} color={tint} roughness={0.96} metalness={0} />
    </mesh>
  );
});

const Room = memo(function Room({ m }: { m: SceneMetrics }) {
  const { wallW, ceilingY, roomDepth, winW, winH, sillY, winTopY } = m;
  const sideWallZEnd = roomDepth - 0.2;
  const sideWallLen = sideWallZEnd + 0.22;

  // Back wall = 4 strips framing the window opening. They cast shadows, so
  // the daylight coming from outside only reaches the room through the glass.
  const winLeft = -winW / 2;
  const winRight = winW / 2;

  const floorTex = useMemo(() => {
    const c = floorCanvases();
    return { map: texFromCanvas(c.map, true), normal: texFromCanvas(c.normal, false) };
  }, []);
  useEffect(
    () => () => {
      floorTex.map.dispose();
      floorTex.normal.dispose();
    },
    [floorTex]
  );
  const floorW = wallW + 2;
  useEffect(() => {
    floorTex.map.repeat.set(floorW / 2, roomDepth / 2);
    floorTex.normal.repeat.set(floorW / 2, roomDepth / 2);
  }, [floorTex, floorW, roomDepth]);

  const trimColor = "#f6f2ea";

  return (
    <group>
      {/* Back wall around the opening */}
      <WallPanel
        w={wallW}
        h={ceilingY - winTopY}
        position={[0, (winTopY + ceilingY) / 2, WALL_Z]}
      />
      <WallPanel w={wallW} h={sillY} position={[0, sillY / 2, WALL_Z]} />
      <WallPanel
        w={wallW / 2 + winLeft}
        h={winH}
        position={[(-wallW / 2 + winLeft) / 2, sillY + winH / 2, WALL_Z]}
      />
      <WallPanel
        w={wallW / 2 - winRight}
        h={winH}
        position={[(wallW / 2 + winRight) / 2, sillY + winH / 2, WALL_Z]}
      />

      {/* Side walls — slightly cooler, since they face away from the window */}
      <WallPanel
        w={sideWallLen}
        h={ceilingY}
        position={[wallW / 2, ceilingY / 2, (sideWallZEnd - 0.22) / 2]}
        rotation={[0, -Math.PI / 2, 0]}
        tint="#e5dfd2"
      />
      <WallPanel
        w={sideWallLen}
        h={ceilingY}
        position={[-wallW / 2, ceilingY / 2, (sideWallZEnd - 0.22) / 2]}
        rotation={[0, Math.PI / 2, 0]}
        tint="#e5dfd2"
      />

      {/* Ceiling — closes the room off, and gives the upper wall somewhere
          to end instead of fading into the background colour. */}
      <mesh
        position={[0, ceilingY, (sideWallZEnd - 0.22) / 2]}
        rotation={[Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[wallW, sideWallLen]} />
        <meshStandardMaterial color="#f7f4ee" roughness={1} />
      </mesh>
      {/* Cornice where ceiling meets the back wall */}
      <mesh position={[0, ceilingY - 0.035, WALL_Z + 0.02]}>
        <boxGeometry args={[wallW, 0.07, 0.04]} />
        <meshStandardMaterial color={trimColor} roughness={0.8} />
      </mesh>

      {/* Baseboard along back wall */}
      <mesh position={[0, 0.06, WALL_Z + 0.007]} castShadow receiveShadow>
        <boxGeometry args={[wallW, 0.12, 0.014]} />
        <meshStandardMaterial color={trimColor} roughness={0.7} />
      </mesh>
      {/* Baseboard along side walls */}
      <mesh
        position={[wallW / 2 - 0.007, 0.06, (sideWallZEnd - 0.22) / 2]}
        rotation={[0, -Math.PI / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[sideWallLen, 0.12, 0.014]} />
        <meshStandardMaterial color={trimColor} roughness={0.7} />
      </mesh>
      <mesh
        position={[-wallW / 2 + 0.007, 0.06, (sideWallZEnd - 0.22) / 2]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[sideWallLen, 0.12, 0.014]} />
        <meshStandardMaterial color={trimColor} roughness={0.7} />
      </mesh>

      <EuropeanWindow widthM={winW} heightM={winH} y={m.winCenterY} />

      {/* Framed artwork — portrait left, landscape right */}
      <Suspense fallback={null}>
        <FramedArt
          x={-(winW / 2 + 1.1)}
          y={Math.min(m.winCenterY + 0.15, ceilingY - 0.75)}
          w={0.55}
          h={0.78}
          src="/artwork_portrait.png"
        />
        <FramedArt
          x={winW / 2 + 1.2}
          y={Math.min(m.winCenterY + 0.2, ceilingY - 0.7)}
          w={0.95}
          h={0.62}
          src="/artwork_landscape.png"
        />
      </Suspense>

      {/* Oak plank floor */}
      <mesh position={[0, 0, roomDepth / 2 - 0.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[floorW, roomDepth]} />
        <meshStandardMaterial
          map={floorTex.map}
          normalMap={floorTex.normal}
          normalScale={new THREE.Vector2(0.35, 0.35)}
          roughness={0.62}
          metalness={0}
        />
      </mesh>

      {/* Decor — tucked in beside the curtain, clear of the pictures */}
      <ConsoleTable x={-(m.railWidthM / 2 + 0.52)} />
      <FloorLamp x={m.railWidthM / 2 + 0.48} />
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
  const outdoorTex = useMemo(() => {
    const t = texFromCanvas(outdoorCanvas(), true);
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }, []);
  useEffect(() => () => outdoorTex.dispose(), [outdoorTex]);
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

      {/* === Outside view === */}
      {/* One painted plane, oversized and set back behind the reveal so the
          view shifts a little as the camera moves, like real parallax. */}
      <mesh position={[0, 0, viewZ - 0.35]}>
        <planeGeometry args={[widthM * 2.1, heightM * 1.9]} />
        <meshBasicMaterial map={outdoorTex} toneMapped={false} />
      </mesh>

      {/* === Sashes & glass === */}
      {/* Glass — subtle tint, mobile-safe (no transmission shader) */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[widthM - frameT * 2 - 0.01, heightM - frameT * 2 - 0.01]} />
        <meshStandardMaterial
          transparent
          opacity={0.12}
          color="#dfe9ef"
          roughness={0.05}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Reflection: a slanted sheen across the upper panes. Real glass is
          never perfectly clear from this angle. */}
      <mesh position={[-widthM * 0.16, heightM * 0.2, 0.001]} rotation={[0, 0, -0.42]}>
        <planeGeometry args={[widthM * 0.42, heightM * 0.75]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.07} depthWrite={false} />
      </mesh>
      <mesh position={[widthM * 0.2, heightM * 0.05, 0.001]} rotation={[0, 0, -0.42]}>
        <planeGeometry args={[widthM * 0.13, heightM * 0.6]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.05} depthWrite={false} />
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

      {/* Sill — fills the reveal and overhangs the wall, but stops short of
          the curtain's travel: its front edge lands on SILL_FRONT_Z, which the
          panel is clamped to stay clear of. It used to reach far enough into
          the room to punch through the cloth. */}
      <mesh
        position={[0, -heightM / 2 - 0.025, SILL_FRONT_Z - z - 0.1]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[widthM + 0.2, 0.05, 0.2]} />
        <meshStandardMaterial color="#f1ead9" roughness={0.6} />
      </mesh>
      {/* Sill apron underneath */}
      <mesh position={[0, -heightM / 2 - 0.07, SILL_FRONT_Z - z - 0.135]}>
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

const CAM_FOV = 42;

/**
 * Where the camera has to stand for the whole room to fit: eye height, a
 * three-quarter angle, and a distance derived from the canvas's real aspect
 * ratio — a portrait phone canvas needs to back off much further than a wide
 * desktop one to hold the same rail.
 */
function cameraFraming(m: SceneMetrics, aspect: number) {
  const halfFov = Math.tan((CAM_FOV * Math.PI) / 360);
  const fitH = m.ceilingY * 1.04;
  const fitW = Math.max(m.railWidthM + 2.0, 3.0);
  const dist =
    Math.max(fitH / (2 * halfFov), fitW / (2 * halfFov * Math.max(0.5, aspect))) * 1.12;
  const position: [number, number, number] = [
    -dist * 0.44,
    Math.min(Math.max(m.ceilingY * 0.52, 1.2), 1.8),
    dist * 0.9,
  ];
  const target: [number, number, number] = [0, Math.min(m.railY * 0.55, m.ceilingY * 0.5), 0];
  return { dist, position, target };
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

/** Keeps the framing correct as the canvas resizes or the config changes. */
function FramedCamera({ m, controls }: { m: SceneMetrics; controls: boolean }) {
  const { size } = useThree();
  const aspect = size.width / Math.max(1, size.height);
  const { dist, position, target } = useMemo(() => cameraFraming(m, aspect), [m, aspect]);
  // The rig and the controls both drive the camera, so only one may be live:
  // once the user takes over, the rig steps aside instead of fighting them.
  return (
    <>
      {!controls && <CameraRig position={position} target={target} />}
      {controls && (
        <OrbitControls
          enablePan={false}
          minDistance={Math.max(1.2, dist * 0.45)}
          maxDistance={Math.min(m.roomDepth - 0.8, dist * 1.9)}
          minPolarAngle={Math.PI / 3.2}
          maxPolarAngle={Math.PI / 2.05}
          target={target}
        />
      )}
    </>
  );
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
  const drop = headerDrop(config.header);
  const m = sceneMetrics(railWidthM, heightM, drop);
  const isBoth = config.side === "both";
  // A closed pair barely parts in the middle; the leading edges pass each
  // other rather than stopping short of a 15 cm hole.
  const gap = 0.06;
  const panelWidthM = isBoth ? (railWidthM - gap) / 2 : railWidthM * 0.75;
  const leftXOffset = -railWidthM / 2 + panelWidthM / 2;
  const rightXOffset = railWidthM / 2 - panelWidthM / 2;

  const showLeft = config.side === "left" || isBoth;
  const showRight = config.side === "right" || isBoth;
  const topY = m.railY - drop;

  // Every ring, glider and grommet is placed on a pleat of a real panel, in
  // world x — the hardware is not spaced independently of the cloth it holds.
  const fullness = RESERVE_FACTOR[config.reserve];
  const attachXs: number[] = [];
  if (showLeft) {
    for (const px of attachmentLayout(panelWidthM, fullness, config.header, "left").positions) {
      attachXs.push(px + leftXOffset);
    }
  }
  if (showRight) {
    for (const px of attachmentLayout(panelWidthM, fullness, config.header, "right").positions) {
      attachXs.push(px + rightXOffset);
    }
  }

  // Initial guess only — FramedCamera refines it once the canvas size (and so
  // the aspect ratio) is known, and keeps it right through resizes.
  const initialCam = cameraFraming(m, 1.4).position;

  return (
    <Canvas
      camera={{ position: initialCam, fov: CAM_FOV }}
      shadows={!isMobile}
      frameloop="always"
      dpr={isMobile ? [1, 2] : [1, 1.5]}
      gl={{ preserveDrawingBuffer: true, antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      <Capture onReady={onReady} />
      {compact ? (
        <CameraRig position={[0, m.railY - 0.05, 0.55]} target={[0, m.railY - 0.12, 0]} />
      ) : (
        <FramedCamera m={m} controls={!controlsLocked} />
      )}
      <color attach="background" args={["#e9eef0"]} />
      {!isMobile && (
        <Suspense fallback={null}>
          <Environment files="/room.hdr" background={false} environmentIntensity={0.5} />
        </Suspense>
      )}

      {/* Daylight. The back wall casts shadows, so this only reaches the room
          through the window opening — it spills around the panels and lands as
          a patch of sun on the floor instead of a flat frontal wash. */}
      <directionalLight
        position={[m.railWidthM * 0.5 + 1.9, m.ceilingY + 1.3, -5.5]}
        intensity={1.45}
        color="#fff4e0"
        castShadow
        shadow-mapSize-width={isMobile ? 1024 : 2048}
        shadow-mapSize-height={isMobile ? 1024 : 2048}
        shadow-camera-left={-(m.wallW / 2 + 1)}
        shadow-camera-right={m.wallW / 2 + 1}
        shadow-camera-top={m.ceilingY + 1}
        shadow-camera-bottom={-1}
        shadow-camera-near={0.5}
        shadow-camera-far={18}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        target-position={[0, 0, 1.4]}
      />
      {/* Sky through the opening: cool, broad, no shadow of its own. */}
      <directionalLight position={[-1.5, m.ceilingY, -4]} intensity={0.45} color="#dbe7f2" />
      {/* Room light. With the pair drawn closed the window is blocked, so the
          front of the cloth lives on bounce light. It rakes across the panels
          from the side rather than facing them: frontal light flattens folds,
          a grazing one carves them. */}
      <directionalLight
        position={[5.6, m.ceilingY * 0.6, 1.5]}
        intensity={0.95}
        color="#fff2df"
        castShadow={!isMobile}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-(m.wallW / 2 + 1)}
        shadow-camera-right={m.wallW / 2 + 1}
        shadow-camera-top={m.ceilingY + 0.5}
        shadow-camera-bottom={-0.5}
        shadow-camera-near={0.5}
        shadow-camera-far={16}
        shadow-bias={-0.0006}
        shadow-normalBias={0.025}
        target-position={[0, m.railY * 0.45, 0]}
      />
      <directionalLight position={[-4.2, m.ceilingY * 0.75, 3.2]} intensity={0.3} color="#fff5ea" />
      <hemisphereLight args={["#eef4fa", "#c9ab86", 0.55]} />
      <ambientLight intensity={0.14} />

      <Room m={m} />
      <Rail
        widthM={railWidthM}
        header={config.header}
        railY={m.railY}
        attachXs={attachXs}
        fabricTopY={topY}
      />

      <Suspense fallback={null}>
        {showLeft && (
          <CurtainPanel
            side="left"
            widthM={panelWidthM}
            heightM={heightM}
            config={config}
            fabric={fabric}
            topY={topY}
            xOffset={leftXOffset}
            zOffset={isBoth ? 0.012 : 0}
          />
        )}
        {showRight && (
          <CurtainPanel
            side="right"
            widthM={panelWidthM}
            heightM={heightM}
            config={config}
            fabric={fabric}
            topY={topY}
            xOffset={rightXOffset}
            zOffset={isBoth ? -0.012 : 0}
          />
        )}
      </Suspense>

      <ContactShadows
        position={[0, 0.002, 0.1]}
        opacity={0.5}
        scale={Math.max(railWidthM + 2.5, 5)}
        blur={2.2}
        far={0.9}
        resolution={512}
      />

    </Canvas>
  );
}

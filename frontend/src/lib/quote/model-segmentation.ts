import * as THREE from "three";

/**
 * Split a photogrammetry mesh into parts by the colours baked into it.
 *
 * SAM 3D hands back one mesh with the photo painted onto it — a single lump the
 * customer cannot re-upholster. Since the piece is already colour-coded by
 * reality (pale seat fabric, dark wooden legs), clustering the surface colour
 * recovers the parts well enough to swap the fabric on exactly the surfaces
 * that were fabric to begin with.
 *
 * The mesh keeps one geometry: triangles are reordered so each cluster becomes
 * a draw group with its own material slot, which is what makes a material swap
 * a one-line change later.
 */

export type SegmentKind = "upholstery" | "frame";

export interface ModelSegment {
  id: string;
  /** Mean colour of the surface as photographed. */
  baseColor: THREE.Color;
  kind: SegmentKind;
  /** Share of the model's surface, 0–1. Drives ordering and the auto-guess. */
  share: number;
  /** The slot in the mesh's material array this segment owns. */
  material: THREE.MeshStandardMaterial;
  /** The photo texture this surface came with, for the "Original" view. */
  sourceMap: THREE.Texture | null;
  /** True when the original colours live in the mesh rather than a texture. */
  usesVertexColors: boolean;
}

export interface SegmentedModel {
  root: THREE.Group;
  segments: ModelSegment[];
  /** Every original material, kept so "Original" can be restored. */
  dispose(): void;
}

const MAX_CLUSTERS_PER_MESH = 6;
const MIN_TRIANGLES_PER_CLUSTER = 60;
const KMEANS_SAMPLE = 6000;
const KMEANS_ITERATIONS = 16;
/** [L, a, b, x, y, z] per triangle. */
const FEATURE_DIMS = 6;
/**
 * OKLab chroma is small next to lightness, and lightness is the one thing the
 * baked texture gets wrong: SAM paints the photo's own shadows onto the mesh,
 * so a cushion in shadow is darker than the wood beside it. Hue and chroma
 * survive that — cream stays greyish, teak stays orange — so the clustering
 * leans on them and discounts brightness.
 */
const CHROMA_WEIGHT = 5;
const LIGHTNESS_WEIGHT = 0.45;
/**
 * How much "next to each other" counts against "same colour". Small on purpose:
 * it only breaks ties between similar colours (a highlight on a wooden arm
 * joins the arm, not the cushion behind it). Turn it up and clusters become
 * spatial blobs that mix cream and teak, which shows up as blotches when the
 * new fabric is applied.
 */
const POSITION_WEIGHT = 0.15;
/**
 * Two clusters this close in OKLab are the same material to any customer, so
 * they become one part. Without it the panel offers six near-identical swatches
 * instead of "cover" and "frame".
 */
const MERGE_DISTANCE = 0.07;

/**
 * Prepare a loaded GLTF scene: centre it, scale it to a predictable size and
 * break every mesh into colour segments.
 */
export function segmentModel(source: THREE.Object3D): SegmentedModel {
  const root = new THREE.Group();
  const clone = source.clone(true);
  root.add(clone);

  const segments: ModelSegment[] = [];
  const created: THREE.Material[] = [];
  const meshes: THREE.Mesh[] = [];
  clone.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
  });

  let totalArea = 0;
  const perMesh = meshes.map((mesh) => {
    const result = splitMeshByColor(mesh);
    totalArea += result.reduce((sum, c) => sum + c.area, 0);
    return { mesh, clusters: result };
  });

  for (const { mesh, clusters } of perMesh) {
    const sourceMaterial = (
      Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
    ) as THREE.MeshStandardMaterial | undefined;
    const sourceMap = sourceMaterial?.map ?? null;
    const usesVertexColors = Boolean(mesh.geometry.getAttribute("color"));

    // Nothing to cluster by — a mesh whose colours we could not read at all.
    // It still becomes one segment, because a customer who cannot put their
    // fabric on the model has no use for the model.
    const effective =
      clusters.length > 0
        ? clusters
        : [{ color: sourceMaterial?.color?.clone() ?? new THREE.Color(0xd6d3d1), area: 1 }];

    const materials: THREE.MeshStandardMaterial[] = [];
    effective.forEach((cluster, i) => {
      const material = new THREE.MeshStandardMaterial({
        // Starts as the photographed surface; the viewer swaps in the chosen
        // material for whatever the customer treats as upholstery.
        map: sourceMap,
        color: sourceMap ? new THREE.Color(0xffffff) : cluster.color.clone(),
        roughness: 0.82,
        metalness: 0.02,
      });
      material.name = `${mesh.uuid}-${i}`;
      materials.push(material);
      created.push(material);
      segments.push({
        id: material.name,
        baseColor: cluster.color.clone(),
        kind: classify(cluster.color),
        share: totalArea > 0 ? cluster.area / totalArea : 1 / effective.length,
        material,
        sourceMap,
        usesVertexColors,
      });
    });
    // A single segment must not be handed to the mesh as a one-element array:
    // without matching draw groups three would render nothing.
    mesh.material = materials.length === 1 ? materials[0] : materials;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }

  // On a piece of furniture the covered surfaces are the majority of what you
  // see, so if the colour test left us with mostly "frame" it read the light in
  // the photo, not the material. Promote the largest parts until at least half
  // the surface is upholstery — the customer can still correct any of it.
  const byShare = [...segments].sort((a, b) => b.share - a.share);
  let covered = byShare
    .filter((s) => s.kind === "upholstery")
    .reduce((sum, s) => sum + s.share, 0);
  for (const segment of byShare) {
    if (covered >= 0.5) break;
    if (segment.kind === "upholstery") continue;
    // Never drag an unmistakably wooden part into the upholstery: a sofa whose
    // teak frame turns into fabric looks broken, and half-covered is fine.
    if (isDefinitelyFrame(segment.baseColor)) continue;
    segment.kind = "upholstery";
    covered += segment.share;
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug(
      "[quote] Segmente:",
      byShare.map((s) => `#${s.baseColor.getHexString()} ${s.kind} ${(s.share * 100).toFixed(0)}%`),
    );
  }

  fitToUnitBox(root);

  return {
    root,
    segments: segments.sort((a, b) => b.share - a.share),
    dispose() {
      for (const material of created) material.dispose();
    },
  };
}

interface Cluster {
  color: THREE.Color;
  area: number;
}

/**
 * Reorder a mesh's triangles into colour clusters and give each one a draw
 * group. Returns one entry per cluster, in group order.
 *
 * Two things make this work on a photogrammetry mesh where naive RGB clustering
 * does not: colours are compared in OKLab, where "cream" and "teak" are as far
 * apart as they look to a person, and each triangle's position is part of the
 * feature vector, so a highlight on a wooden armrest joins the armrest rather
 * than the white cushion it happens to match in brightness.
 */
function splitMeshByColor(mesh: THREE.Mesh): Cluster[] {
  // `Object3D.clone` shares geometry with the cached GLTF, and this reorders the
  // index buffer — so take a copy before touching anything.
  const geometry = mesh.geometry.clone();
  mesh.geometry = geometry;

  // SAM's meshes ship position and UVs only. Without normals every surface is
  // lit as if it faced nowhere, which is what makes an untouched reconstruction
  // look like flat grey clay.
  if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();

  const position = geometry.getAttribute("position");
  if (!position) return [];

  if (!geometry.index) {
    const indices = new Uint32Array(position.count);
    for (let i = 0; i < position.count; i++) indices[i] = i;
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  }
  const index = geometry.index!;
  const triangleCount = Math.floor(index.count / 3);
  if (triangleCount < MIN_TRIANGLES_PER_CLUSTER) return [];

  const sampler = createColorSampler(mesh, geometry);
  if (!sampler) {
    console.warn("[quote] Farben des 3D-Modells nicht lesbar — Modell bleibt einteilig.");
    return [];
  }

  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;
  const extent = bbox.getSize(new THREE.Vector3());
  const scale = new THREE.Vector3(
    extent.x > 1e-6 ? 1 / extent.x : 0,
    extent.y > 1e-6 ? 1 / extent.y : 0,
    extent.z > 1e-6 ? 1 / extent.z : 0,
  );

  // Per triangle: [L, a, b] in OKLab plus its normalised centroid.
  const features = new Float32Array(triangleCount * FEATURE_DIMS);
  const srgb = new Float32Array(triangleCount * 3);
  const areas = new Float32Array(triangleCount);

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const rgb: [number, number, number] = [0, 0, 0];

  for (let t = 0; t < triangleCount; t++) {
    const i0 = index.getX(t * 3);
    const i1 = index.getX(t * 3 + 1);
    const i2 = index.getX(t * 3 + 2);

    sampler(i0, i1, i2, rgb);
    srgb[t * 3] = rgb[0];
    srgb[t * 3 + 1] = rgb[1];
    srgb[t * 3 + 2] = rgb[2];

    const lab = srgbToOklab(rgb[0], rgb[1], rgb[2]);
    features[t * FEATURE_DIMS] = lab[0] * LIGHTNESS_WEIGHT;
    features[t * FEATURE_DIMS + 1] = lab[1] * CHROMA_WEIGHT;
    features[t * FEATURE_DIMS + 2] = lab[2] * CHROMA_WEIGHT;

    a.fromBufferAttribute(position as THREE.BufferAttribute, i0);
    b.fromBufferAttribute(position as THREE.BufferAttribute, i1);
    c.fromBufferAttribute(position as THREE.BufferAttribute, i2);
    features[t * FEATURE_DIMS + 3] =
      ((a.x + b.x + c.x) / 3 - bbox.min.x) * scale.x * POSITION_WEIGHT;
    features[t * FEATURE_DIMS + 4] =
      ((a.y + b.y + c.y) / 3 - bbox.min.y) * scale.y * POSITION_WEIGHT;
    features[t * FEATURE_DIMS + 5] =
      ((a.z + b.z + c.z) / 3 - bbox.min.z) * scale.z * POSITION_WEIGHT;

    areas[t] = b.clone().sub(a).cross(c.clone().sub(a)).length() * 0.5;
  }

  const k = Math.min(MAX_CLUSTERS_PER_MESH, Math.max(2, Math.floor(triangleCount / 250)));
  const centroids = kmeans(features, triangleCount, k);

  const assignment = new Uint8Array(triangleCount);
  for (let t = 0; t < triangleCount; t++) {
    assignment[t] = nearestCentroid(features, t, centroids);
  }

  // Fold clusters too small to be a part of the furniture into their nearest
  // surviving neighbour.
  const counts = new Array(centroids.length).fill(0);
  for (let t = 0; t < triangleCount; t++) counts[assignment[t]]++;
  const keep = centroids.map((_, i) => counts[i] >= MIN_TRIANGLES_PER_CLUSTER);
  if (!keep.some(Boolean)) keep[0] = true;
  const surviving = centroids.map((cen, i) => (keep[i] ? cen : null));
  for (let t = 0; t < triangleCount; t++) {
    if (keep[assignment[t]]) continue;
    assignment[t] = nearestCentroid(features, t, surviving);
  }

  // Summarise every surviving cluster, then fold together the ones that are the
  // same material to the eye — three shades of the same cream cushion are one
  // part, not three.
  const stats = centroids.map(() => ({ area: 0, sum: [0, 0, 0], members: 0 }));
  for (let t = 0; t < triangleCount; t++) {
    const st = stats[assignment[t]];
    st.area += areas[t];
    st.sum[0] += srgb[t * 3];
    st.sum[1] += srgb[t * 3 + 1];
    st.sum[2] += srgb[t * 3 + 2];
    st.members++;
  }

  const survivingIds = centroids
    .map((_, i) => i)
    .filter((i) => keep[i] && stats[i].members > 0)
    .sort((a, b) => stats[b].area - stats[a].area);

  const merged: { clusters: number[]; lab: [number, number, number] }[] = [];
  const mergedOf = new Map<number, number>();
  for (const ci of survivingIds) {
    const st = stats[ci];
    const mean: [number, number, number] = [
      st.sum[0] / st.members,
      st.sum[1] / st.members,
      st.sum[2] / st.members,
    ];
    const lab = srgbToOklab(mean[0], mean[1], mean[2]);
    const target = merged.findIndex((m) => oklabDistance(m.lab, lab) < MERGE_DISTANCE);
    if (target >= 0) {
      merged[target].clusters.push(ci);
      mergedOf.set(ci, target);
    } else {
      merged.push({ clusters: [ci], lab });
      mergedOf.set(ci, merged.length - 1);
    }
  }

  // Rebuild the index buffer part by part, so each becomes one draw group.
  const order: number[] = [];
  const clusters: Cluster[] = [];
  geometry.clearGroups();

  for (const [partIndex, part] of merged.entries()) {
    void part;
    const start = order.length * 3;
    let area = 0;
    const sum = [0, 0, 0];
    let members = 0;
    for (let t = 0; t < triangleCount; t++) {
      if (mergedOf.get(assignment[t]) !== partIndex) continue;
      order.push(t);
      area += areas[t];
      sum[0] += srgb[t * 3];
      sum[1] += srgb[t * 3 + 1];
      sum[2] += srgb[t * 3 + 2];
      members++;
    }
    if (members === 0) continue;
    geometry.addGroup(start, members * 3, clusters.length);
    clusters.push({
      // The swatch the customer sees is the plain average of what was
      // photographed, not the clustering feature — those are not the same thing.
      color: new THREE.Color().setRGB(
        sum[0] / members,
        sum[1] / members,
        sum[2] / members,
        THREE.SRGBColorSpace,
      ),
      area,
    });
  }

  const reordered = new Uint32Array(order.length * 3);
  order.forEach((t, i) => {
    reordered[i * 3] = index.getX(t * 3);
    reordered[i * 3 + 1] = index.getX(t * 3 + 1);
    reordered[i * 3 + 2] = index.getX(t * 3 + 2);
  });
  geometry.setIndex(new THREE.BufferAttribute(reordered, 1));

  return clusters;
}

/**
 * Returns a function that yields the photographed sRGB colour of one triangle,
 * from vertex colours when the mesh has them and from the baked texture through
 * the UVs otherwise. Texture taps are averaged over a small neighbourhood so a
 * single specular pixel cannot decide which part a triangle belongs to.
 */
function createColorSampler(
  mesh: THREE.Mesh,
  geometry: THREE.BufferGeometry,
): ((i0: number, i1: number, i2: number, out: [number, number, number]) => void) | null {
  const colorAttr = geometry.getAttribute("color");
  if (colorAttr && colorAttr.itemSize >= 3) {
    return (i0, i1, i2, out) => {
      out[0] = (colorAttr.getX(i0) + colorAttr.getX(i1) + colorAttr.getX(i2)) / 3;
      out[1] = (colorAttr.getY(i0) + colorAttr.getY(i1) + colorAttr.getY(i2)) / 3;
      out[2] = (colorAttr.getZ(i0) + colorAttr.getZ(i1) + colorAttr.getZ(i2)) / 3;
    };
  }

  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const map = (material as THREE.MeshStandardMaterial | undefined)?.map;
  const uv = geometry.getAttribute("uv");
  const image = map?.image as (HTMLImageElement | ImageBitmap | HTMLCanvasElement) | undefined;
  if (!uv || !image) return null;

  const width = (image as HTMLImageElement).width;
  const height = (image as HTMLImageElement).height;
  if (!width || !height) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(image as CanvasImageSource, 0, 0);
  } catch {
    return null;
  }

  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(0, 0, width, height).data;
  } catch {
    // Tainted canvas — the mesh came from another origin after all.
    return null;
  }

  const tap = (u: number, v: number, out: [number, number, number]) => {
    const x = clampInt(Math.round(u * (width - 1)), 0, width - 1);
    // glTF puts UV (0,0) at the image's top-left corner and GLTFLoader leaves
    // `flipY` off, which is exactly how a canvas is addressed — so v maps
    // straight to the pixel row. Flipping it here scrambles every sample and
    // the parts come out as speckle.
    const y = clampInt(Math.round(v * (height - 1)), 0, height - 1);
    let r = 0;
    let g = 0;
    let bl = 0;
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const px = clampInt(x + dx, 0, width - 1);
        const py = clampInt(y + dy, 0, height - 1);
        const p = (py * width + px) * 4;
        r += pixels[p];
        g += pixels[p + 1];
        bl += pixels[p + 2];
        n++;
      }
    }
    out[0] = r / n / 255;
    out[1] = g / n / 255;
    out[2] = bl / n / 255;
  };

  return (i0, i1, i2, out) => {
    tap((uv.getX(i0) + uv.getX(i1) + uv.getX(i2)) / 3, (uv.getY(i0) + uv.getY(i1) + uv.getY(i2)) / 3, out);
  };
}

/** k-means++ seeding, then Lloyd iterations over a subsample. */
function kmeans(features: Float32Array, count: number, k: number): number[][] {
  const step = Math.max(1, Math.floor(count / KMEANS_SAMPLE));
  const sample: number[] = [];
  for (let t = 0; t < count; t += step) sample.push(t);

  // Seed far apart instead of evenly along the buffer: an even seed picks
  // several points out of whatever the mesh happens to list first.
  const centroids: number[][] = [featureAt(features, sample[Math.floor(sample.length / 2)])];
  const dist = new Float32Array(sample.length).fill(Infinity);
  while (centroids.length < k) {
    let best = 0;
    let bestDist = -1;
    const last = centroids[centroids.length - 1];
    for (let i = 0; i < sample.length; i++) {
      const d = distanceTo(features, sample[i], last);
      if (d < dist[i]) dist[i] = d;
      if (dist[i] > bestDist) {
        bestDist = dist[i];
        best = i;
      }
    }
    if (bestDist <= 0) break;
    centroids.push(featureAt(features, sample[best]));
  }

  for (let iter = 0; iter < KMEANS_ITERATIONS; iter++) {
    const sums = centroids.map(() => new Array(FEATURE_DIMS + 1).fill(0));
    for (const t of sample) {
      const ci = nearestCentroid(features, t, centroids);
      for (let d = 0; d < FEATURE_DIMS; d++) sums[ci][d] += features[t * FEATURE_DIMS + d];
      sums[ci][FEATURE_DIMS]++;
    }
    let moved = 0;
    for (let i = 0; i < centroids.length; i++) {
      const n = sums[i][FEATURE_DIMS];
      if (n === 0) continue;
      for (let d = 0; d < FEATURE_DIMS; d++) {
        const next = sums[i][d] / n;
        moved += Math.abs(next - centroids[i][d]);
        centroids[i][d] = next;
      }
    }
    if (moved < 0.002) break;
  }
  return centroids;
}

function featureAt(features: Float32Array, t: number): number[] {
  const out = new Array(FEATURE_DIMS);
  for (let d = 0; d < FEATURE_DIMS; d++) out[d] = features[t * FEATURE_DIMS + d];
  return out;
}

function distanceTo(features: Float32Array, t: number, centroid: number[]): number {
  let sum = 0;
  for (let d = 0; d < FEATURE_DIMS; d++) {
    const diff = features[t * FEATURE_DIMS + d] - centroid[d];
    sum += diff * diff;
  }
  return sum;
}

function nearestCentroid(
  features: Float32Array,
  t: number,
  centroids: (number[] | null)[],
): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < centroids.length; i++) {
    const c = centroids[i];
    if (!c) continue;
    const d = distanceTo(features, t, c);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/**
 * sRGB to OKLab. Perceptual distance is the whole point: in raw RGB a cream
 * cushion in shadow sits closer to teak than to the same cushion in the light.
 */
function srgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabDistance(a: [number, number, number], b: [number, number, number]): number {
  const dl = a[0] - b[0];
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dl * dl + da * da + db * db);
}

function srgbToLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Wood, metal and dark bases read as "frame"; pale, greyish and strongly
 * coloured surfaces read as covering material. The customer can correct any of
 * it in one click, so this only has to be right often enough to feel effortless.
 */
function classify(color: THREE.Color): SegmentKind {
  return isFrameColor(color) ? "frame" : "upholstery";
}

function isFrameColor(color: THREE.Color): boolean {
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl, THREE.SRGBColorSpace);
  const hue = hsl.h * 360;

  // Anything this dark is a shadow gap, a metal foot or a black base.
  if (hsl.l < 0.18) return true;
  // Pale and barely coloured: linen, wool, cream leather. Never a teak leg.
  if (hsl.l > 0.62 && hsl.s < 0.3) return false;
  // Wood: orange-brown, actually saturated, and darker than the covering.
  return hue >= 10 && hue <= 55 && hsl.s >= 0.2 && hsl.l < 0.6;
}

/** How unmistakably wooden a colour is — used to decide what may be promoted. */
function isDefinitelyFrame(color: THREE.Color): boolean {
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl, THREE.SRGBColorSpace);
  const hue = hsl.h * 360;
  return hsl.l < 0.14 || (hue >= 12 && hue <= 48 && hsl.s >= 0.3 && hsl.l < 0.5);
}

/** Centre on the origin, stand on the ground, scale to roughly one unit tall. */
function fitToUnitBox(root: THREE.Object3D): void {
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = 1.7 / maxDim;

  root.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  root.scale.setScalar(scale);
}

function clampInt(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

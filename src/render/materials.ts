import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Acabamento cartoon: toon shading em 3 faixas + contorno preto (casco invertido).
// Materiais são compartilhados por cor (cache), então NÃO devem ser descartados junto com os objetos.

let gradient: THREE.DataTexture | null = null;
function gradientMap(): THREE.DataTexture {
  if (!gradient) {
    const data = new Uint8Array([90, 170, 255]);
    gradient = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
    gradient.minFilter = THREE.NearestFilter;
    gradient.magFilter = THREE.NearestFilter;
    gradient.needsUpdate = true;
  }
  return gradient;
}

const toonCache = new Map<string, THREE.MeshToonMaterial>();

export function toon(color: number, opts: { side?: THREE.Side; emissive?: number } = {}): THREE.MeshToonMaterial {
  const key = `${color}:${opts.side ?? 0}:${opts.emissive ?? 0}`;
  let m = toonCache.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial({
      color,
      gradientMap: gradientMap(),
      side: opts.side ?? THREE.FrontSide,
      emissive: opts.emissive ?? 0x000000,
    });
    m.userData.shared = true;
    toonCache.set(key, m);
  }
  return m;
}

const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1b1b1f, side: THREE.BackSide });
outlineMat.userData.shared = true;

/** Adiciona contorno preto às malhas do objeto (só em personagens: custa uma malha a mais por peça). */
export function addOutline(root: THREE.Object3D, thickness = 0.035): void {
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && !o.userData.outline && !o.userData.noOutline) meshes.push(o);
  });
  for (const m of meshes) {
    const geo = m.geometry;
    geo.computeBoundingSphere();
    const r = geo.boundingSphere?.radius ?? 1;
    const hull = new THREE.Mesh(geo, outlineMat);
    hull.userData.outline = true;
    hull.scale.setScalar(1 + thickness / Math.max(r, 0.05));
    m.add(hull);
  }
}

// ── Personagens: peças fundidas numa malha só, com cor por vértice ─────────

let vcMaterial: THREE.MeshToonMaterial | null = null;
/** Material toon que usa a cor de cada vértice (uma malha com várias cores = uma chamada de desenho). */
export function toonVertexColors(): THREE.MeshToonMaterial {
  if (!vcMaterial) {
    vcMaterial = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap() });
    vcMaterial.userData.shared = true;
  }
  return vcMaterial;
}

const extrudeCache = new Map<number, THREE.MeshBasicMaterial>();
/**
 * Contorno por extrusão ao longo da normal (casco invertido que não depende da origem da peça):
 * funciona em malhas fundidas, onde escalar o casco deslocaria o contorno.
 */
function extrudeOutline(thickness: number): THREE.MeshBasicMaterial {
  let m = extrudeCache.get(thickness);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color: 0x1b1b1f, side: THREE.BackSide });
    m.onBeforeCompile = (shader) => {
      // outlineNormal: normal média por posição (as quinas não abrem no contorno).
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 outlineNormal;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed += normalize(outlineNormal) * ${thickness.toFixed(4)};`);
    };
    m.customProgramCacheKey = () => `outline-${thickness}`;
    m.userData.shared = true;
    extrudeCache.set(thickness, m);
  }
  return m;
}

/** Peça que não deve ser fundida (animada à parte, ou de material especial). */
const keepSeparate = (o: THREE.Object3D, basic: boolean) => {
  if (o.name || o.userData.keep === true) return true;
  if (!(o instanceof THREE.Mesh)) return false;
  const m = o.material as THREE.MeshToonMaterial;
  // Texturas, transparência e dupla face não cabem na malha de cor por vértice.
  const kind = basic ? THREE.MeshBasicMaterial : THREE.MeshToonMaterial;
  return Array.isArray(o.material) || m.side !== THREE.FrontSide || !!m.map || m.transparent || !(m instanceof kind);
};

/**
 * Funde as malhas de cada nó do esqueleto (`nodes`) numa malha com cor por vértice, mais uma
 * para as peças sem contorno (olhos, brilhos). Reduz ~40 malhas por personagem para ~12 chamadas
 * de desenho, contando os contornos. Nós dentro de nós (cabeça dentro do corpo) ficam separados.
 */
const tmp = new THREE.Matrix4();

/**
 * Normal média de todos os vértices na mesma posição. Peças com quinas (caixas, cilindros) têm
 * vértices repetidos com normais diferentes; extrudar por elas abriria o contorno nas quinas.
 */
function smoothNormals(geo: THREE.BufferGeometry): THREE.BufferAttribute {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const sums = new Map<string, THREE.Vector3>();
  const keys: string[] = [];
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const key = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    keys.push(key);
    let sum = sums.get(key);
    if (!sum) sums.set(key, (sum = new THREE.Vector3()));
    sum.add(n.fromBufferAttribute(nor, i));
  }
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const s = sums.get(keys[i])!;
    if (s.lengthSq() < 1e-8) s.fromBufferAttribute(nor, i); // normais opostas se anulando: usa a própria
    s.normalize();
    out[i * 3] = s.x;
    out[i * 3 + 1] = s.y;
    out[i * 3 + 2] = s.z;
  }
  return new THREE.BufferAttribute(out, 3);
}
/** Índice 0..n-1 para geometrias sem índice (o merge exige que todas tenham, ou nenhuma). */
const indexFor = (n: number) => new THREE.BufferAttribute(n > 65535 ? new Uint32Array(n).map((_, i) => i) : new Uint16Array(n).map((_, i) => i), 1);

export function bakeRig(
  nodes: THREE.Object3D[],
  outline = 0.03,
  shadows = { cast: false, receive: false },
  /** Material sem luz (horizonte, nuvens): funde as peças MeshBasic em vez das toon. */
  basicMaterial?: THREE.MeshBasicMaterial,
): void {
  const nodeSet = new Set(nodes);
  for (const node of nodes) {
    const parts: { geo: THREE.BufferGeometry; outlined: boolean }[] = [];
    const remove: THREE.Object3D[] = [];
    node.updateMatrixWorld(true);
    const inv = node.matrixWorld.clone().invert();
    const visit = (obj: THREE.Object3D) => {
      for (const child of [...obj.children]) {
        if (nodeSet.has(child) || keepSeparate(child, !!basicMaterial)) continue;
        if (child instanceof THREE.Mesh && !child.userData.outline) {
          const color = (child.material as THREE.MeshToonMaterial).color;
          // Só posição, normal e índice (copiar a geometria inteira, com UV etc., é o que mais pesa).
          const src = child.geometry;
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', src.attributes.position.clone());
          geo.setAttribute('normal', src.attributes.normal.clone());
          geo.setIndex(src.index ? src.index.clone() : indexFor(src.attributes.position.count));
          geo.applyMatrix4(tmp.multiplyMatrices(inv, child.matrixWorld));
          const n = geo.attributes.position.count;
          const colors = new Float32Array(n * 3);
          for (let i = 0; i < n * 3; i += 3) {
            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
          }
          geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
          parts.push({ geo, outlined: !child.userData.noOutline });
          remove.push(child);
        }
        visit(child);
      }
    };
    visit(node);
    for (const o of remove) o.parent?.remove(o);
    for (const outlined of [true, false]) {
      const geos = parts.filter((p) => p.outlined === outlined).map((p) => p.geo);
      if (!geos.length) continue;
      const merged = mergeGeometries(geos);
      for (const g of geos) g.dispose();
      const m = new THREE.Mesh(merged, basicMaterial ?? toonVertexColors());
      m.castShadow = shadows.cast;
      m.receiveShadow = shadows.receive;
      if (outlined && outline > 0) {
        merged.setAttribute('outlineNormal', smoothNormals(merged));
        const hull = new THREE.Mesh(merged, extrudeOutline(outline));
        hull.userData.outline = true; // compartilha a geometria: não é descartada duas vezes
        m.add(hull);
      }
      node.add(m);
    }
  }
}

/** Libera geometrias (e materiais não compartilhados) de um objeto removido da cena. */
export function disposeTree(root: THREE.Object3D): void {
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    if (!o.userData.outline && !o.geometry.userData.shared) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) if (!m.userData.shared) m.dispose();
  });
}

/** Textura desenhada em canvas (padrões repetidos: calçadão, janelas). */
export function canvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  repeat: [number, number] = [1, 1],
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

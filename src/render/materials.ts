import * as THREE from 'three';

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

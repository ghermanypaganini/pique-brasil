import * as THREE from 'three';
import { BALANCE } from '../data/balance';
import { canvasTexture, disposeTree, toon } from './materials';

// Cenário do Rio de Janeiro: prédios e sobrados de um lado, calçadão de pedra portuguesa,
// areia e mar do outro; Pão de Açúcar e Cristo Redentor no horizonte; bandeirinhas de festa junina.

const LW = BALANCE.track.laneWidth;
const ROAD_HALF = LW * 1.5 + 0.3;
const SEG = 40; // metros por segmento de cenário
const TILE = 4; // comprimento de um ladrilho das texturas (para emendar sem costura)

const CARNIVAL = [0xff1744, 0xffd600, 0x00e676, 0x2979ff, 0xd500f9, 0xff9100];
const FACADES = [0xf48fb1, 0xffe082, 0x80deea, 0xa5d6a7, 0xffab91, 0xce93d8, 0xfff59d, 0x90caf9, 0xffccbc];

// Geometrias unitárias compartilhadas (escaladas por objeto). Marcadas para não serem descartadas.
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitCone = new THREE.ConeGeometry(1, 1, 8);
const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 8);
for (const g of [unitBox, unitCone, unitCyl]) g.userData.shared = true;

function part(geo: THREE.BufferGeometry, color: number, sx: number, sy: number, sz: number, x: number, y: number, z: number) {
  const m = new THREE.Mesh(geo, toon(color));
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  return m;
}

let rngState = 12345;
const rnd = () => {
  rngState = (rngState * 1664525 + 1013904223) >>> 0;
  return rngState / 4294967296;
};
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)];

// ── Texturas ──────────────────────────────────────────────────────

/** Ondas preto-e-brancas do calçadão de Copacabana. */
function calcadaoTexture(lengthMeters: number): THREE.CanvasTexture {
  return canvasTexture(
    256,
    256,
    (ctx) => {
      ctx.fillStyle = '#f5f2ea';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#26262b';
      for (let band = 0; band < 2; band++) {
        ctx.beginPath();
        const y0 = band * 128;
        ctx.moveTo(0, y0);
        for (let x = 0; x <= 256; x += 4) ctx.lineTo(x, y0 + 40 + Math.sin((x / 256) * Math.PI * 2) * 30);
        for (let x = 256; x >= 0; x -= 4) ctx.lineTo(x, y0 + 80 + Math.sin((x / 256) * Math.PI * 2) * 30);
        ctx.closePath();
        ctx.fill();
      }
    },
    [1, lengthMeters / TILE],
  );
}

function asphaltTexture(lengthMeters: number): THREE.CanvasTexture {
  return canvasTexture(
    128,
    128,
    (ctx) => {
      ctx.fillStyle = '#4a4a50';
      ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 300; i++) {
        ctx.fillStyle = Math.random() < 0.5 ? '#55555c' : '#424248';
        ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
      }
      // Faixas tracejadas entre as 3 pistas
      ctx.fillStyle = '#ffffff';
      const laneW = 128 / 3.2;
      for (const x of [64 - laneW / 2, 64 + laneW / 2]) ctx.fillRect(x - 2, 0, 4, 70);
    },
    [1, lengthMeters / TILE],
  );
}

const windowsTex = canvasTexture(128, 128, (ctx) => {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 3; x++) {
      ctx.fillStyle = '#5c7ea8';
      ctx.fillRect(12 + x * 40, 10 + y * 30, 24, 18);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(12 + x * 40, 26 + y * 30, 24, 3);
    }
  }
});
const buildingMats = new Map<number, THREE.MeshToonMaterial>();
function buildingMat(color: number): THREE.MeshToonMaterial {
  let m = buildingMats.get(color);
  if (!m) {
    m = toon(color).clone();
    m.map = windowsTex;
    m.userData.shared = true;
    buildingMats.set(color, m);
  }
  return m;
}

// ── Peças do cenário ──────────────────────────────────────────────

function palm(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const lean = (rnd() - 0.5) * 0.3;
  const trunk = part(unitCyl, 0x8d6e63, 0.18, 6, 0.18, 0, 3, 0);
  trunk.rotation.z = lean;
  g.add(trunk);
  const top = new THREE.Group();
  top.position.set(-Math.sin(lean) * 6, 6, 0);
  for (let i = 0; i < 6; i++) {
    const leaf = part(unitBox, 0x2e7d32, 0.5, 0.08, 2.6, 0, 0, 1.2);
    const holder = new THREE.Group();
    holder.rotation.set(0.5, (i / 6) * Math.PI * 2, 0, 'YXZ');
    holder.add(leaf);
    top.add(holder);
  }
  g.add(top);
  g.position.set(x, 0, z);
  return g;
}

function sobrado(x: number, z: number, side: 1 | -1): { obj: THREE.Group; depth: number } {
  const g = new THREE.Group();
  const w = 5 + rnd() * 2;
  const d = 6 + rnd() * 3;
  const h = 6 + rnd() * 2;
  const color = pick(FACADES);
  g.add(part(unitBox, color, w, h, d, 0, h / 2, 0));
  // Janelas coloniais e porta
  for (let fz = -d / 2 + 1.2; fz < d / 2 - 0.8; fz += 1.8) {
    for (const fy of [1.4, 4.2]) {
      const win = part(unitBox, 0x4e342e, 0.05, 1.5, 0.9, -side * (w / 2 + 0.02), fy, fz);
      const frame = part(unitBox, 0xffffff, 0.04, 1.7, 1.1, -side * (w / 2 + 0.01), fy, fz);
      g.add(frame, win);
    }
  }
  g.add(part(unitBox, 0xffffff, w + 0.3, 0.3, d + 0.3, 0, h, 0)); // cornija
  const roof = part(unitBox, 0xbf5b3b, w * 0.75, 1.4, d, 0, h + 0.7, 0);
  roof.rotation.z = Math.PI / 4;
  roof.scale.set(w * 0.55, w * 0.55, d);
  g.add(roof);
  g.position.set(x + side * (w / 2), 0, z + d / 2);
  return { obj: g, depth: d };
}

function predio(x: number, z: number, side: 1 | -1): { obj: THREE.Group; depth: number } {
  const g = new THREE.Group();
  const w = 6 + rnd() * 4;
  const d = 7 + rnd() * 5;
  const h = 10 + rnd() * 12;
  const m = new THREE.Mesh(unitBox, buildingMat(pick(FACADES)));
  m.scale.set(w, h, d);
  m.position.y = h / 2;
  g.add(m);
  g.add(part(unitBox, 0xeeeeee, w + 0.4, 0.4, d + 0.4, 0, h, 0));
  g.position.set(x + side * (w / 2), 0, z + d / 2);
  return { obj: g, depth: d };
}

function quiosque(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.add(part(unitBox, 0xffffff, 2.2, 2.2, 2.2, 0, 1.1, 0));
  g.add(part(unitBox, pick(CARNIVAL), 2.6, 0.3, 2.6, 0, 2.4, 0));
  g.add(part(unitBox, 0x8d6e63, 2.4, 0.15, 0.5, -1.3, 1.1, 0));
  g.position.set(x, 0, z);
  return g;
}

function umbrella(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.add(part(unitCyl, 0xeeeeee, 0.05, 2.2, 0.05, 0, 1.1, 0));
  g.add(part(unitCone, pick(CARNIVAL), 1.3, 0.6, 1.3, 0, 2.3, 0));
  g.position.set(x, 0, z);
  return g;
}

/** Fio de bandeirinhas de festa junina atravessando a rua. */
function bandeirinhas(z: number): THREE.Group {
  const g = new THREE.Group();
  const span = ROAD_HALF * 2 + 4;
  for (const x of [-span / 2, span / 2]) g.add(part(unitCyl, 0x6d4c41, 0.08, 5.4, 0.08, x, 2.7, 0));
  for (let row = 0; row < 2; row++) {
    const y = 5.0 - row * 0.5;
    const zz = row * 1.5;
    const n = 18;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const sag = Math.sin(t * Math.PI) * 0.6;
      const flag = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 3), toon(CARNIVAL[(i + row) % 6]));
      flag.rotation.x = Math.PI;
      flag.position.set(-span / 2 + t * span, y - sag - 0.25, zz);
      g.add(flag);
    }
  }
  g.position.z = z;
  return g;
}

/** Carro alegórico estacionado na areia (decoração). */
function floatDecor(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const c = pick(CARNIVAL);
  g.add(part(unitBox, c, 4, 2, 9, 0, 1.4, 0));
  g.add(part(unitBox, 0xffd600, 4.2, 0.3, 9.2, 0, 2.5, 0));
  const figure = new THREE.Mesh(new THREE.SphereGeometry(1.6, 14, 10), toon(pick(CARNIVAL)));
  figure.position.set(0, 4.4, 1);
  g.add(figure);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.4, 6), toon(0xffd600));
  crown.position.set(0, 6.5, 1);
  g.add(crown);
  for (let i = 0; i < 6; i++) g.add(part(unitCone, pick(CARNIVAL), 0.3, 1.8, 0.3, -1.6 + (i % 2) * 3.2, 3.4, -3.5 + i * 1.4));
  g.position.set(x, 0, z);
  g.rotation.y = 0.2;
  return g;
}

// ── Horizonte ─────────────────────────────────────────────────────

function backdrop(): THREE.Group {
  const g = new THREE.Group();
  const far = (color: number) => new THREE.MeshBasicMaterial({ color, fog: false });

  // Pão de Açúcar (lado do mar)
  const pao = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), far(0x5f7d6a));
  pao.scale.set(22, 48, 22);
  pao.position.set(70, 0, 280);
  const urca = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), far(0x6b8b72));
  urca.scale.set(28, 26, 24);
  urca.position.set(40, 0, 265);
  // Corcovado com o Cristo Redentor (lado dos prédios)
  const corcovado = new THREE.Mesh(new THREE.ConeGeometry(55, 90, 10), far(0x4f6f58));
  corcovado.position.set(-75, 30, 300);
  const cristo = new THREE.Group();
  cristo.add(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.4, 12, 8), far(0xf2f2f2)));
  const arms = new THREE.Mesh(new THREE.BoxGeometry(18, 1.6, 1.6), far(0xf2f2f2));
  arms.position.y = 3.5;
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), far(0xf2f2f2));
  head.position.y = 7.2;
  cristo.add(arms, head);
  cristo.position.set(-75, 81, 300);
  // Morro com casinhas coloridas
  const morro = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), far(0x5b7a55));
  morro.scale.set(60, 30, 30);
  morro.position.set(-90, -4, 220);
  g.add(pao, urca, corcovado, cristo, morro);
  for (let i = 0; i < 40; i++) {
    const a = rnd() * Math.PI - Math.PI / 2;
    const r = rnd() * 0.8;
    const casa = new THREE.Mesh(unitBox, far(pick(FACADES)));
    casa.scale.set(3, 2.4, 3);
    casa.position.set(-90 + Math.sin(a) * 50 * r, 4 + Math.cos(a) * 20 * (1 - r) + rnd() * 6, 205);
    g.add(casa);
  }
  return g;
}

// ── Gerenciador ───────────────────────────────────────────────────

export class Scenery {
  readonly root = new THREE.Group();
  private ground = new THREE.Group();
  private horizon = backdrop();
  private segments = new Map<number, THREE.Group>();
  private asphaltTex = asphaltTexture(260);
  private calcadaoTex = calcadaoTexture(260);

  constructor() {
    this.root.add(this.ground, this.horizon);

    const plane = (w: number, color: number, x: number, map?: THREE.Texture) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, 260),
        map ? new THREE.MeshToonMaterial({ color, map }) : toon(color),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0, 130);
      return m;
    };
    this.ground.add(plane(ROAD_HALF * 2, 0xffffff, 0, this.asphaltTex));
    // Calçada do lado dos prédios (pedra portuguesa clara) e calçadão de ondas do lado do mar
    const leftWalk = plane(5, 0xe8e2d4, -ROAD_HALF - 2.5);
    leftWalk.position.y = 0.15;
    const rightWalk = plane(6, 0xffffff, ROAD_HALF + 3, this.calcadaoTex);
    rightWalk.position.y = 0.15;
    const sand = plane(30, 0xf3d9a4, ROAD_HALF + 6 + 15);
    sand.position.y = 0.05;
    const sea = plane(300, 0x1e88e5, ROAD_HALF + 36 + 150);
    sea.position.y = -0.2;
    const foam = plane(1.5, 0xffffff, ROAD_HALF + 36);
    foam.position.y = 0.0;
    this.ground.add(leftWalk, rightWalk, sand, sea, foam);
    for (const s of [-1, 1]) {
      const curb = new THREE.Mesh(unitBox, toon(0xbdbdbd));
      curb.scale.set(0.3, 0.3, 260);
      curb.position.set(s * ROAD_HALF, 0.15, 130);
      this.ground.add(curb);
    }
  }

  update(pz: number): void {
    // Chão acompanha o jogador em passos do tamanho do ladrilho (a textura não "escorrega").
    this.ground.position.z = Math.floor((pz - 40) / TILE) * TILE;
    this.horizon.position.z = pz;

    const first = Math.floor((pz - 40) / SEG);
    const last = Math.floor((pz + 190) / SEG);
    for (let i = first; i <= last; i++) {
      if (!this.segments.has(i)) {
        const seg = this.buildSegment(i);
        this.segments.set(i, seg);
        this.root.add(seg);
      }
    }
    for (const [i, seg] of this.segments) {
      if (i < first) {
        this.root.remove(seg);
        disposeTree(seg);
        this.segments.delete(i);
      }
    }
  }

  reset(): void {
    for (const seg of this.segments.values()) {
      this.root.remove(seg);
      disposeTree(seg);
    }
    this.segments.clear();
  }

  private buildSegment(i: number): THREE.Group {
    rngState = (i * 2654435761) >>> 0 || 1; // mesmo segmento = mesmo visual
    const g = new THREE.Group();
    const z0 = i * SEG;

    // Lado esquerdo: prédios e sobrados colados uns nos outros
    let z = z0;
    while (z < z0 + SEG) {
      const b = rnd() < 0.45 ? sobrado(-ROAD_HALF - 5.2, z, -1) : predio(-ROAD_HALF - 5.2, z, -1);
      g.add(b.obj);
      z += b.depth + 0.3;
    }
    // Postes com fios
    for (let pz = z0 + 5; pz < z0 + SEG; pz += 20) {
      g.add(part(unitCyl, 0x757575, 0.1, 6, 0.1, -ROAD_HALF - 0.6, 3, pz));
      g.add(part(unitBox, 0x757575, 1.4, 0.1, 0.1, -ROAD_HALF, 6, pz));
    }

    // Lado direito: palmeiras no calçadão, quiosques e guarda-sóis na areia
    for (let pz = z0 + 3 + rnd() * 4; pz < z0 + SEG; pz += 9 + rnd() * 5) g.add(palm(ROAD_HALF + 5.4, pz));
    if (rnd() < 0.6) g.add(quiosque(ROAD_HALF + 9, z0 + 10 + rnd() * 20));
    for (let k = 0; k < 4; k++) g.add(umbrella(ROAD_HALF + 12 + rnd() * 14, z0 + rnd() * SEG));
    if (i % 5 === 2) g.add(floatDecor(ROAD_HALF + 20, z0 + 20));

    // Bandeirinhas de festa junina a cada 3 segmentos
    if (i % 3 === 0 && i > 0) g.add(bandeirinhas(z0 + 18));
    return g;
  }
}

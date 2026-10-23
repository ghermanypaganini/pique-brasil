import * as THREE from 'three';
import { BALANCE } from '../data/balance';
import { bakeRig, canvasTexture, disposeTree, toon } from './materials';
import { model } from './models';
import { makeOlindaDancer } from './props';

// Dois cenários que se alternam, com um túnel na troca:
// Rio de Janeiro — prédios e sobrados de um lado, calçadão de pedra portuguesa, areia e mar do outro;
//   Pão de Açúcar e Cristo Redentor no horizonte; bonecos de Olinda dançando nos trechos de carnaval.
// Brasília — Eixo Monumental com Esplanada, gramados, espelho d'água e ipês; Congresso e Catedral
//   no horizonte, fim de tarde.
// Nos dois: bandeirinhas de festa junina e carros alegóricos.

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
const unitSphere = new THREE.SphereGeometry(1, 10, 8);
for (const g of [unitBox, unitCone, unitCyl, unitSphere]) g.userData.shared = true;

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
  const ai = model('palmeira', [null, 6.5 + rnd() * 1.5, null]);
  if (ai) {
    ai.position.set(x, 0, z);
    ai.rotation.y = rnd() * Math.PI * 2;
    return ai;
  }
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
  // Sacadinhas de ferro no 1º andar, com vasos de planta
  for (let fz = -d / 2 + 1.2; fz < d / 2 - 0.8; fz += 1.8) {
    const fx = -side * (w / 2 + 0.35);
    g.add(part(unitBox, 0xffffff, 0.7, 0.1, 1.3, fx, 3.4, fz));
    g.add(part(unitBox, 0x263238, 0.05, 0.5, 1.3, fx - side * 0.33, 3.7, fz));
    if (rnd() < 0.6) g.add(part(unitSphere, 0x43a047, 0.22, 0.2, 0.22, fx, 3.6, fz + 0.4));
  }
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
  const face = -side * (w / 2); // fachada virada para a pista
  // Térreo comercial: porta de aço e toldo listrado
  const awning = pick(CARNIVAL);
  g.add(part(unitBox, 0x90a4ae, 0.1, 2.4, d * 0.7, face - side * 0.05, 1.2, 0));
  const tent = part(unitBox, awning, 1.2, 0.12, d * 0.8, face - side * 0.6, 2.9, 0);
  tent.rotation.z = side * 0.35;
  g.add(tent);
  // Sacadas a cada andar e aparelhos de ar-condicionado pendurados
  for (let fy = 5; fy < h - 1.5; fy += 3) {
    g.add(part(unitBox, 0xf5f5f5, 0.6, 0.12, d * 0.85, face - side * 0.3, fy, 0));
    g.add(part(unitBox, 0xe0e0e0, 0.05, 0.6, d * 0.85, face - side * 0.6, fy + 0.3, 0));
    if (rnd() < 0.7) g.add(part(unitBox, 0xeceff1, 0.45, 0.4, 0.6, face - side * 0.25, fy + 1.4, (rnd() - 0.5) * d * 0.6));
  }
  // Caixa-d'água e antena no telhado
  g.add(part(unitCyl, 0x4fc3f7, 0.9, 1.2, 0.9, (rnd() - 0.5) * w * 0.4, h + 0.8, (rnd() - 0.5) * d * 0.4));
  g.add(part(unitCyl, 0x9e9e9e, 0.03, 2, 0.03, w * 0.2, h + 1.2, d * 0.2));
  g.position.set(x + side * (w / 2), 0, z + d / 2);
  return { obj: g, depth: d };
}

/** Orelhão (telefone público laranja) — ícone das calçadas brasileiras. */
function orelhao(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.add(part(unitCyl, 0x9e9e9e, 0.07, 1.6, 0.07, 0, 0.8, 0));
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xff8f00));
  shell.position.y = 1.55;
  shell.scale.set(1, 1.3, 1);
  g.add(shell);
  g.add(part(unitBox, 0x37474f, 0.3, 0.45, 0.18, 0.2, 1.75, 0));
  g.position.set(x, 0, z);
  return g;
}

/** Banco de praça e lixeira laranja. */
function banco(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.add(part(unitBox, 0x8d6e63, 0.5, 0.1, 1.6, 0, 0.5, 0));
  g.add(part(unitBox, 0x8d6e63, 0.1, 0.45, 1.6, -0.25, 0.8, 0));
  for (const dz of [-0.65, 0.65]) g.add(part(unitBox, 0x424242, 0.45, 0.5, 0.08, 0, 0.25, dz));
  g.add(part(unitCyl, 0xff6f00, 0.25, 0.75, 0.25, 0.1, 0.38, 1.4));
  g.position.set(x, 0, z);
  return g;
}

/** Cadeiras de praia e cooler embaixo de um guarda-sol. */
function beachSet(x: number, z: number): THREE.Group {
  const g = umbrella(0, 0);
  for (const dz of [-0.7, 0.7]) {
    const chair = part(unitBox, pick(CARNIVAL), 0.6, 0.06, 1.3, 0.6, 0.35, dz);
    chair.rotation.z = 0.35;
    g.add(chair);
  }
  g.add(part(unitBox, 0x1e88e5, 0.45, 0.35, 0.35, -0.6, 0.18, 0));
  g.position.set(x, 0, z);
  return g;
}

function quiosque(x: number, z: number): THREE.Group {
  const ai = model('quiosque', [null, 3.2, null]);
  if (ai) {
    ai.position.set(x, 0, z);
    ai.rotation.y = -Math.PI / 2; // balcão virado para a pista (que fica em -x)
    return ai;
  }
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
  const ai = model('alegorico', [null, 6.5, null]);
  if (ai) {
    ai.position.set(x, 0, z);
    ai.rotation.y = x > 0 ? -Math.PI / 2 + 0.4 : Math.PI / 2 - 0.4; // de frente para a pista, um pouco virado para o jogador
    return ai;
  }
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

// ── Brasília ──────────────────────────────────────────────────────

/** Bloco da Esplanada dos Ministérios: lâmina comprida de vidro esverdeado. */
function ministerio(x: number, z: number, d: number): THREE.Group {
  const g = new THREE.Group();
  const w = 9;
  const h = 15;
  const m = new THREE.Mesh(unitBox, buildingMat(0xb7d3c6));
  m.scale.set(w, h, d);
  m.position.y = h / 2 + 1.2;
  g.add(m);
  g.add(part(unitBox, 0xf5f5f5, w + 0.3, 1.2, d + 0.3, 0, 0.6, 0)); // térreo sobre pilotis
  g.add(part(unitBox, 0xf5f5f5, w + 0.4, 0.5, d + 0.4, 0, h + 1.45, 0));
  g.position.set(x, 0, z + d / 2);
  return g;
}

/** Ipê florido (amarelo ou rosa), típico do cerrado na seca. */
function ipe(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const trunk = part(unitCyl, 0x5d4037, 0.16, 3.2, 0.16, 0, 1.6, 0);
  trunk.rotation.z = (rnd() - 0.5) * 0.3;
  g.add(trunk);
  const color = rnd() < 0.6 ? 0xffd600 : 0xf06292;
  for (let i = 0; i < 3; i++) {
    const crown = new THREE.Mesh(unitSphere, toon(color));
    const s = 1.3 + rnd() * 0.6;
    crown.scale.set(s, s * 0.7, s);
    crown.position.set((rnd() - 0.5) * 1.6, 3.4 + rnd() * 0.6, (rnd() - 0.5) * 1.6);
    g.add(crown);
  }
  g.position.set(x, 0, z);
  return g;
}

/** Poste alto do Eixo Monumental. */
function poste(x: number, z: number, side: 1 | -1): THREE.Group {
  const g = new THREE.Group();
  g.add(part(unitCyl, 0x9e9e9e, 0.12, 9, 0.12, 0, 4.5, 0));
  g.add(part(unitBox, 0x9e9e9e, 1.6, 0.12, 0.12, -side * 0.8, 9, 0));
  g.add(part(unitBox, 0xfff59d, 0.5, 0.12, 0.3, -side * 1.5, 8.9, 0));
  g.position.set(x, 0, z);
  return g;
}

/** Palácio com colunas brancas em arco e rampa até o salão (inspirado no Planalto, sem ser réplica). */
function palacio(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const len = 30;
  const white = 0xf7f7f7;
  g.add(part(unitBox, 0x9fd3ff, 10, 4, len - 2, 0, 4.6, 0)); // vidro do salão
  g.add(part(unitBox, white, 14, 0.5, len, 0, 2.4, 0)); // piso elevado
  g.add(part(unitBox, white, 14, 0.6, len, 0, 7.0, 0)); // laje de cobertura
  // Colunas: duas peças inclinadas formando um arco fino, na face voltada para a pista.
  for (let cz = -len / 2 + 2; cz <= len / 2 - 2; cz += 4) {
    for (const s of [-1, 1]) {
      const c = part(unitBox, white, 0.25, 3.6, 0.6, -6.6, 4.8, cz + s * 0.5);
      c.rotation.x = s * 0.35;
      g.add(c);
    }
  }
  // Rampa descendo em direção à pista
  const ramp = part(unitBox, white, 7, 0.3, 3, -9.5, 1.3, -4);
  ramp.rotation.z = -0.36;
  g.add(ramp);
  g.position.set(x, 0, z);
  return g;
}

// ── Túnel de transição entre cenários ─────────────────────────────

const TUNNEL_HALF = ROAD_HALF + 2.6;
const TUNNEL_H = 8.4;

function tunnelSegment(z0: number, entry: boolean, exit: boolean): THREE.Group {
  const g = new THREE.Group();
  const zc = z0 + SEG / 2;
  for (const s of [-1, 1]) {
    g.add(part(unitBox, 0xd7ccc8, 1, TUNNEL_H, SEG, s * (TUNNEL_HALF + 0.5), TUNNEL_H / 2, zc));
    g.add(part(unitBox, 0x1565c0, 0.05, 0.6, SEG, s * TUNNEL_HALF, 1.4, zc)); // faixa azul de azulejo
    g.add(part(unitBox, 0x8d8d8d, 1.2, 0.3, SEG, s * (TUNNEL_HALF - 0.6), 0.15, zc)); // mureta
  }
  g.add(part(unitBox, 0x9e9e9e, TUNNEL_HALF * 2 + 2, 1, SEG, 0, TUNNEL_H + 0.5, zc));
  for (let z = z0 + 3; z < z0 + SEG; z += 6) {
    for (const s of [-1, 1]) {
      const lamp = new THREE.Mesh(unitBox, toon(0xfff59d, { emissive: 0x8a7a20 }));
      lamp.scale.set(0.6, 0.15, 1.6);
      lamp.position.set(s * (TUNNEL_HALF - 1.5), TUNNEL_H - 0.1, z);
      g.add(lamp);
    }
  }
  // Boca do túnel: fachada com morro por cima (esconde a troca de horizonte).
  const portal = (z: number) => {
    for (const s of [-1, 1]) g.add(part(unitBox, 0xbcaaa4, 30, 16, 2, s * (TUNNEL_HALF + 15), 8, z));
    g.add(part(unitBox, 0xbcaaa4, TUNNEL_HALF * 2 + 2, 5, 2, 0, TUNNEL_H + 2.5, z));
    const hill = new THREE.Mesh(unitSphere, toon(0x558b2f));
    // Por cima do teto (nunca dentro do túnel), avançando sobre a pista.
    hill.scale.set(45, 14, 30);
    hill.position.set(0, TUNNEL_H + 1 + 14, z + (z === z0 ? 22 : -22));
    g.add(hill);
  };
  if (entry) portal(z0);
  if (exit) portal(z0 + SEG);
  return g;
}

// ── Horizonte ─────────────────────────────────────────────────────

const far = (color: number) => new THREE.MeshBasicMaterial({ color, fog: false });

function rioBackdrop(): THREE.Group {
  const g = new THREE.Group();

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

/** Fim de tarde no cerrado: Congresso no fim do Eixo, Catedral de lado, sol baixo. */
function brasiliaBackdrop(): THREE.Group {
  const g = new THREE.Group();
  const concrete = far(0xf3e9dc);
  // Congresso: plataforma, torres gêmeas, cúpula (para baixo) e cuia (para cima)
  const congresso = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(90, 4, 30), concrete);
  deck.position.y = 2;
  congresso.add(deck);
  for (const x of [-3.2, 3.2]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(5, 70, 9), concrete);
    tower.position.set(x, 35, 6);
    congresso.add(tower);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(11.4, 4, 9), concrete);
  bridge.position.set(0, 50, 6);
  congresso.add(bridge);
  const cupula = new THREE.Mesh(new THREE.SphereGeometry(13, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), concrete);
  cupula.scale.y = 0.55;
  cupula.position.set(-26, 4, -2);
  const cuia = new THREE.Mesh(new THREE.SphereGeometry(18, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), concrete);
  cuia.scale.y = 0.45;
  cuia.position.set(26, 12, -2);
  congresso.add(cupula, cuia);
  congresso.position.set(0, 0, 330);
  // Catedral: coroa de pilares curvos
  const catedral = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 34, 1.4), concrete);
    pillar.position.set(Math.cos(a) * 7, 15, Math.sin(a) * 7);
    pillar.lookAt(0, 15, 0);
    pillar.rotateX(0.5);
    catedral.add(pillar);
  }
  const glass = new THREE.Mesh(new THREE.ConeGeometry(11, 24, 16, 1, true), far(0x7fb3d5));
  glass.position.y = 12;
  glass.rotation.x = Math.PI;
  catedral.add(glass);
  catedral.position.set(85, 0, 260);
  // Sol baixo e cerrado com árvores retorcidas no horizonte
  const sun = new THREE.Mesh(new THREE.CircleGeometry(26, 24), far(0xffe08a));
  sun.position.set(-110, 38, 360);
  sun.rotation.y = Math.PI;
  g.add(congresso, catedral, sun);
  for (let i = 0; i < 30; i++) {
    const tree = new THREE.Mesh(unitSphere, far(pick([0x7a8a3a, 0x8f9a45, 0x6d7a32])));
    const s = 3 + rnd() * 4;
    tree.scale.set(s * 1.6, s, s * 1.6);
    tree.position.set((rnd() < 0.5 ? -1 : 1) * (60 + rnd() * 120), s * 0.6, 200 + rnd() * 120);
    g.add(tree);
  }
  return g;
}

// ── Gerenciador ───────────────────────────────────────────────────

export type Biome = 'rio' | 'brasilia';

/** A corrida alterna Rio e Brasília a cada ~1,5 km, com um túnel de transição na troca. */
const BIOME_SEGS = 38; // 1.520 m
const BIOME_LENGTH = BIOME_SEGS * SEG;
const BIOMES: Biome[] = ['rio', 'brasilia'];

const segBiome = (i: number): Biome => BIOMES[Math.floor(Math.max(0, i) / BIOME_SEGS) % BIOMES.length];
/** Segmentos do túnel: o último de um cenário e o primeiro do seguinte. */
const isTunnel = (i: number) => i > 0 && (i % BIOME_SEGS === BIOME_SEGS - 1 || (i % BIOME_SEGS === 0 && i >= BIOME_SEGS));

export const biomeAt = (z: number): Biome => segBiome(Math.floor(z / SEG));

/** Quanto de "Brasília" (0..1) tem o céu em z: troca suave ao longo do túnel. */
export function brasiliaAmount(z: number): number {
  const k = Math.round(z / BIOME_LENGTH);
  if (k === 0) return 0;
  const boundary = k * BIOME_LENGTH;
  const t = Math.min(1, Math.max(0, (z - (boundary - SEG)) / (2 * SEG)));
  const from = segBiome(k * BIOME_SEGS - 1) === 'brasilia' ? 1 : 0;
  const to = segBiome(k * BIOME_SEGS) === 'brasilia' ? 1 : 0;
  const s = t * t * (3 - 2 * t);
  return from + (to - from) * s;
}

interface Dancer {
  arms: THREE.Object3D;
  root: THREE.Object3D;
  phase: number;
}

/**
 * Funde as peças de cor sólida do segmento (centenas de peças, poucas chamadas de desenho).
 * O chão fica numa malha à parte que só recebe sombra: mar e gramados enormes projetando sombra
 * entrariam inteiros no mapa de sombra a cada quadro.
 */
function bakeSegment(g: THREE.Group, castProps: boolean): void {
  const ground = new THREE.Group();
  for (const c of [...g.children]) if (c.userData.ground) ground.add(c);
  bakeRig([ground], 0, { cast: false, receive: true });
  ground.userData.keep = true; // já fundido: fica fora da segunda fusão
  g.add(ground);
  bakeRig([g], 0, { cast: castProps, receive: true });
}

export class Scenery {
  readonly root = new THREE.Group();
  private horizons: Record<Biome, THREE.Group> = { rio: rioBackdrop(), brasilia: brasiliaBackdrop() };
  private segments = new Map<number, THREE.Group>();
  private dancers = new Map<number, Dancer[]>();
  private planes = new Map<number, THREE.PlaneGeometry>();
  private texMats: { asphalt: THREE.MeshToonMaterial; calcadao: THREE.MeshToonMaterial };

  constructor() {
    // Horizonte numa malha só por cenário (dezenas de casinhas e prédios distantes).
    const far = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
    for (const b of BIOMES) bakeRig([this.horizons[b]], 0, undefined, far);
    this.root.add(this.horizons.rio, this.horizons.brasilia);
    const textured = (map: THREE.Texture) => {
      const m = new THREE.MeshToonMaterial({ color: 0xffffff, map });
      m.userData.shared = true;
      return m;
    };
    this.texMats = {
      asphalt: textured(asphaltTexture(SEG)),
      calcadao: textured(calcadaoTexture(SEG)),
    };
  }

  update(pz: number, time = 0): void {
    // Horizonte do cenário em que o jogador vai estar logo à frente (troca dentro do túnel).
    const horizon = biomeAt(pz + 30);
    for (const b of BIOMES) {
      this.horizons[b].visible = b === horizon;
      this.horizons[b].position.z = pz;
    }

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
        this.dancers.delete(i);
      }
    }

    // Bonecos de Olinda dançando: balançam o corpo e os braços, cada um no seu tempo.
    for (const list of this.dancers.values()) {
      for (const d of list) {
        d.root.rotation.y = Math.sin(time * 2.2 + d.phase) * 0.5;
        d.root.rotation.z = Math.sin(time * 4.4 + d.phase) * 0.08;
        d.root.position.y = Math.abs(Math.sin(time * 4.4 + d.phase)) * 0.25;
        d.arms.rotation.z = Math.sin(time * 4.4 + d.phase) * 0.45;
      }
    }
  }

  reset(): void {
    for (const seg of this.segments.values()) {
      this.root.remove(seg);
      disposeTree(seg);
    }
    this.segments.clear();
    this.dancers.clear();
  }

  /** Faixa de chão de um segmento (geometria compartilhada por largura). */
  private ground(g: THREE.Group, z0: number, w: number, x: number, y: number, mat: THREE.Material): void {
    let geo = this.planes.get(w);
    if (!geo) {
      geo = new THREE.PlaneGeometry(w, SEG);
      geo.userData.shared = true;
      this.planes.set(w, geo);
    }
    const m = new THREE.Mesh(geo, mat);
    m.receiveShadow = true;
    m.userData.ground = true;
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z0 + SEG / 2);
    g.add(m);
  }

  private road(g: THREE.Group, z0: number): void {
    this.ground(g, z0, ROAD_HALF * 2, 0, 0, this.texMats.asphalt);
    for (const s of [-1, 1]) g.add(part(unitBox, 0xbdbdbd, 0.3, 0.3, SEG, s * ROAD_HALF, 0.15, z0 + SEG / 2));
  }

  private buildSegment(i: number): THREE.Group {
    rngState = (i * 2654435761) >>> 0 || 1; // mesmo segmento = mesmo visual
    const g = new THREE.Group();
    const z0 = i * SEG;
    this.road(g, z0);

    if (isTunnel(i)) {
      const k = i % BIOME_SEGS;
      g.add(tunnelSegment(z0, k === BIOME_SEGS - 1, k === 0));
      bakeSegment(g, false);
      return g;
    }
    if (segBiome(i) === 'brasilia') this.buildBrasilia(g, i, z0);
    else this.buildRio(g, i, z0);

    // Bandeirinhas de festa junina (quermesse) a cada 3 segmentos, nos dois cenários
    if (i % 3 === 0 && i > 0) g.add(bandeirinhas(z0 + 18));
    bakeSegment(g, true);
    return g;
  }

  private buildRio(g: THREE.Group, i: number, z0: number): void {
    // Calçada do lado dos prédios (pedra portuguesa clara), calçadão de ondas, areia e mar do outro lado
    this.ground(g, z0, 5, -ROAD_HALF - 2.5, 0.15, toon(0xe8e2d4));
    this.ground(g, z0, 6, ROAD_HALF + 3, 0.15, this.texMats.calcadao);
    this.ground(g, z0, 30, ROAD_HALF + 21, 0.05, toon(0xf3d9a4));
    this.ground(g, z0, 1.5, ROAD_HALF + 36, 0.0, toon(0xffffff));
    this.ground(g, z0, 300, ROAD_HALF + 186, -0.2, toon(0x1e88e5));

    // Lado esquerdo: prédios e sobrados colados uns nos outros
    let z = z0;
    while (z < z0 + SEG) {
      const b = rnd() < 0.45 ? sobrado(-ROAD_HALF - 5.2, z, -1) : predio(-ROAD_HALF - 5.2, z, -1);
      g.add(b.obj);
      z += b.depth + 0.3;
    }
    // Postes com fios, bancos, lixeiras e um orelhão de vez em quando
    for (let pz = z0 + 5; pz < z0 + SEG; pz += 20) {
      g.add(part(unitCyl, 0x757575, 0.1, 6, 0.1, -ROAD_HALF - 0.6, 3, pz));
      g.add(part(unitBox, 0x757575, 1.4, 0.1, 0.1, -ROAD_HALF, 6, pz));
      g.add(part(unitBox, 0xfff59d, 0.4, 0.12, 0.25, -ROAD_HALF + 0.6, 5.92, pz));
      g.add(banco(-ROAD_HALF - 3.6, pz + 8));
    }
    if (i % 2 === 0) g.add(orelhao(-ROAD_HALF - 1.2, z0 + 14));

    // Lado direito: palmeiras no calçadão, quiosques e guarda-sóis na areia
    for (let pz = z0 + 3 + rnd() * 4; pz < z0 + SEG; pz += 9 + rnd() * 5) g.add(palm(ROAD_HALF + 5.4, pz));
    if (rnd() < 0.6) g.add(quiosque(ROAD_HALF + 9, z0 + 10 + rnd() * 20));
    for (let k = 0; k < 4; k++) g.add(k < 2 ? beachSet(ROAD_HALF + 12 + rnd() * 14, z0 + rnd() * SEG) : umbrella(ROAD_HALF + 12 + rnd() * 14, z0 + rnd() * SEG));
    if (i % 5 === 2) g.add(floatDecor(ROAD_HALF + 20, z0 + 20));

    // Trecho de carnaval: bonecos de Olinda dançando nas calçadas
    if (i % 4 === 1) {
      const list: Dancer[] = [];
      for (const [x, dz] of [
        [-ROAD_HALF - 2.4, 8],
        [ROAD_HALF + 3.2, 22],
        [-ROAD_HALF - 2.4, 32],
      ] as const) {
        const d = makeOlindaDancer(i * 7 + list.length);
        const holder = new THREE.Group(); // vira o boneco para o jogador; a dança mexe só no boneco
        holder.userData.keep = true; // animado: fica fora da fusão do segmento
        holder.add(d.root);
        holder.position.set(x, 0.15, z0 + dz);
        holder.rotation.y = Math.PI;
        g.add(holder);
        list.push({ root: d.root, arms: d.arms, phase: rnd() * Math.PI * 2 });
      }
      this.dancers.set(i, list);
    }
  }

  private buildBrasilia(g: THREE.Group, i: number, z0: number): void {
    // Calçadas, gramados, espelho d'água de um lado e cerrado seco ao fundo
    for (const s of [-1, 1]) {
      this.ground(g, z0, 2, s * (ROAD_HALF + 1), 0.12, toon(0xe0e0e0));
      this.ground(g, z0, 300, s * (ROAD_HALF + 152), 0.02, toon(0xc5b358));
    }
    this.ground(g, z0, 24, -ROAD_HALF - 14, 0.06, toon(0x7cb342));
    this.ground(g, z0, 5, ROAD_HALF + 4.5, 0.06, toon(0x7cb342));
    this.ground(g, z0, 10, ROAD_HALF + 12, 0.04, toon(0x4fc3f7)); // espelho d'água
    g.add(part(unitBox, 0xf5f5f5, 0.4, 0.4, SEG, ROAD_HALF + 7, 0.2, z0 + SEG / 2));
    g.add(part(unitBox, 0xf5f5f5, 0.4, 0.4, SEG, ROAD_HALF + 17, 0.2, z0 + SEG / 2));
    this.ground(g, z0, 12, ROAD_HALF + 23, 0.06, toon(0x7cb342));

    // Esplanada: um ministério por segmento, recuado atrás do gramado
    g.add(ministerio(-ROAD_HALF - 19, z0 + 6, 28));
    for (let pz = z0 + 10; pz < z0 + SEG; pz += 20) {
      g.add(poste(-ROAD_HALF - 0.8, pz, -1));
      g.add(poste(ROAD_HALF + 0.8, pz, 1));
    }
    for (let k = 0; k < 3; k++) g.add(ipe(-ROAD_HALF - 4 - rnd() * 4, z0 + rnd() * SEG));
    if (rnd() < 0.7) g.add(ipe(ROAD_HALF + 4.5, z0 + rnd() * SEG));
    // Do outro lado do espelho d'água, de vez em quando, um palácio de colunas brancas
    if (i % 4 === 2) g.add(palacio(ROAD_HALF + 30, z0 + 20));
    else for (let k = 0; k < 2; k++) g.add(ipe(ROAD_HALF + 20 + rnd() * 8, z0 + rnd() * SEG));
    if (i % 5 === 2) g.add(floatDecor(-ROAD_HALF - 7, z0 + 20));
  }
}

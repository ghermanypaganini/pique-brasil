import * as THREE from 'three';
import { BALANCE } from '../data/balance';
import type { Obstacle, PickupKind } from '../systems/types';
import { isMoney } from '../systems/types';
import { makeCareca, makeDrunk, makePoliceman, makeVorcano, type Rig } from './characters';
import { addOutline, canvasTexture, toon } from './materials';
import { model } from './models';

const OB = BALANCE.obstacles;

export function box(w: number, h: number, d: number, color: number, y = h / 2, z = d / 2, x = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color));
  m.position.set(x, y, z);
  return m;
}

function cyl(r: number, h: number, color: number, segs = 10): THREE.Mesh {
  return new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, segs), toon(color));
}

function wheel(x: number, y: number, z: number, r = 0.35): THREE.Mesh {
  const w = cyl(r, 0.22, 0x222222, 12);
  w.rotation.z = Math.PI / 2;
  w.position.set(x, y, z);
  return w;
}

const CARNIVAL = [0xff1744, 0xffd600, 0x00e676, 0x2979ff, 0xd500f9, 0xff9100];

/** Partes animadas de um obstáculo (o desenho mexe nelas a cada quadro). */
export interface ObstacleView {
  root: THREE.Object3D;
  rig?: Rig; // policial, bêbado, boi (pernas)
  spin?: THREE.Object3D; // fitas do boi, braços do boneco
}

function cavalete(g: THREE.Group, color = 0xff7a00): void {
  for (const x of [-0.8, 0.8]) g.add(box(0.12, OB.low.height, 0.12, 0x555555, OB.low.height / 2, 0.2, x));
  g.add(box(1.9, 0.22, 0.1, color, OB.low.height - 0.12, 0.2));
  g.add(box(1.9, 0.22, 0.1, 0xffffff, OB.low.height - 0.38, 0.2));
}

/** Boneco de Olinda: cabeção, roupa colorida, braços abertos; dá para rolar entre as pernas. */
function olinda(g: THREE.Group, seed: number): THREE.Object3D {
  const colorA = CARNIVAL[seed % CARNIVAL.length];
  const colorB = CARNIVAL[(seed + 2) % CARNIVAL.length];
  for (const x of [-0.55, 0.55]) {
    const leg = cyl(0.12, OB.high.bottom, 0x333333, 8);
    leg.position.set(x, OB.high.bottom / 2, 0.2);
    g.add(leg);
  }
  const dress = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.0, 1.5, 14, 1, true), toon(colorA, { side: THREE.DoubleSide }));
  dress.position.set(0, OB.high.bottom + 0.75, 0.2);
  const torso = cyl(0.55, 0.9, colorB, 14);
  torso.position.set(0, OB.high.bottom + 1.8, 0.2);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), toon(0xf1c27d));
  head.position.set(0, OB.high.bottom + 2.95, 0.2);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.88, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), toon(seed % 2 ? 0x2b1b0e : 0xffd54f));
  hair.position.copy(head.position);
  for (const x of [-0.3, 0.3]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), toon(0x1b1b1f));
    eye.position.set(x, OB.high.bottom + 3.05, 0.95);
    g.add(eye);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 12, Math.PI), toon(0xb71c1c));
  smile.rotation.z = Math.PI;
  smile.position.set(0, OB.high.bottom + 2.75, 0.95);
  const arms = new THREE.Group();
  arms.position.set(0, OB.high.bottom + 2.0, 0.2);
  for (const s of [-1, 1]) {
    const arm = cyl(0.13, 1.4, colorB, 8);
    arm.rotation.z = s * 1.1;
    arm.position.x = s * 0.9;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), toon(0xf1c27d));
    hand.position.set(s * 1.5, -0.35, 0);
    arms.add(arm, hand);
  }
  g.add(dress, torso, head, hair, smile, arms);
  return arms;
}

/** Bumba-meu-boi: corpo coberto por saia colorida, chifres e fitas. */
function boi(g: THREE.Group, seed: number): THREE.Object3D {
  const body = new THREE.Group();
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.0, 0.9, 16, 1, true), toon(CARNIVAL[seed % 6], { side: THREE.DoubleSide }));
  skirt.position.y = 0.55;
  const back = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x1b1b1f));
  back.position.y = 0.95;
  back.scale.set(0.9, 0.5, 1.2);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), toon(0x1b1b1f));
  head.position.set(0, 1.15, -0.95); // olha para o jogador
  head.scale.set(1, 1, 1.3);
  for (const s of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 8), toon(0xfff3e0));
    horn.position.set(s * 0.3, 1.45, -0.95);
    horn.rotation.z = -s * 0.6;
    body.add(horn);
  }
  // Estrelas e espelhos bordados (sem texto)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const star = new THREE.Mesh(new THREE.CircleGeometry(0.12, 5), toon(0xffd600, { side: THREE.DoubleSide }));
    star.position.set(Math.cos(a) * 0.9, 0.6, Math.sin(a) * 0.9);
    star.lookAt(star.position.x * 2, 0.6, star.position.z * 2);
    body.add(star);
  }
  const ribbons = new THREE.Group();
  ribbons.position.y = 1.0;
  for (let i = 0; i < 8; i++) {
    const r = box(0.08, 0.9, 0.02, CARNIVAL[(seed + i) % 6], -0.45, 0);
    r.position.x = Math.cos((i / 8) * Math.PI * 2) * 0.9;
    r.position.z = Math.sin((i / 8) * Math.PI * 2) * 0.9;
    ribbons.add(r);
  }
  for (const x of [-0.3, 0.3]) {
    const leg = cyl(0.09, 0.25, 0x5d4037, 6);
    leg.position.set(x, 0.12, 0);
    body.add(leg);
  }
  body.add(skirt, back, head, ribbons);
  body.position.z = OB.boi.length / 2;
  g.add(body);
  return body;
}

/** Ônibus articulado com dois modelos de IA (um só ficaria esticado demais nos 10 m do obstáculo). */
function busModel(g: THREE.Group, length: number, height: number): boolean {
  const half = length / 2;
  for (let i = 0; i < 2; i++) {
    const m = model('onibus', [2.1, height, half - 0.15]);
    if (!m) return false;
    m.position.z = half * i + half / 2;
    g.add(m);
  }
  // Sanfona entre as duas partes
  g.add(box(1.8, height - 0.6, 0.4, 0x37474f, 0.3 + (height - 0.6) / 2, half));
  return true;
}

/** Carro alegórico: plataforma colorida onde dá para correr por cima, com esculturas nas laterais. */
function carroAlegorico(g: THREE.Group, length: number, seed: number): void {
  const h = OB.bus.height;
  g.add(box(2.1, h - 0.4, length, CARNIVAL[seed % 6], 0.4 + (h - 0.4) / 2, length / 2));
  g.add(box(2.2, 0.12, length, 0xffd600, h - 0.06, length / 2)); // borda dourada (piso)
  for (let z = 1; z < length; z += 2.2) {
    g.add(box(2.22, 0.3, 0.6, CARNIVAL[(seed + Math.floor(z)) % 6], 1.0, z));
    for (const x of [-1.25, 1.25]) {
      const plume = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.4, 6), toon(CARNIVAL[(seed + Math.floor(z) + 1) % 6]));
      plume.position.set(x, h + 0.6, z);
      g.add(plume);
    }
  }
  // Escultura gigante na frente (máscara de carnaval), fora do caminho
  const mask = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.25, 8, 16), toon(0xffd600));
  mask.position.set(1.6, h + 1.2, length - 1);
  mask.rotation.y = Math.PI / 2;
  g.add(mask);
  for (const z of [1.2, length - 1.2]) for (const x of [-0.95, 0.95]) g.add(wheel(x, 0.35, z));
}

/** Boneco de Olinda dançando na calçada (decoração do cenário). `arms` balança no ritmo. */
export function makeOlindaDancer(seed: number): { root: THREE.Group; arms: THREE.Object3D } {
  const g = new THREE.Group();
  const arms = olinda(g, seed);
  return { root: g, arms };
}

/** Sedã oficial preto (veículo vindo de frente em Brasília). */
function officialSedan(g: THREE.Group, length: number): void {
  g.add(box(1.8, 0.75, length, 0x111111, 0.55, length / 2));
  g.add(box(1.6, 0.6, length * 0.5, 0x1c1c2e, 1.2, length * 0.45));
  g.add(box(1.4, 0.45, 0.04, 0x9fd3ff, 1.2, length * 0.2));
  for (const x of [-0.6, 0.6]) g.add(box(0.3, 0.18, 0.05, 0xfff59d, 0.7, -0.01, x));
  g.add(box(0.3, 0.2, 0.02, 0x009c3b, 1.0, -0.02, 0.85)); // bandeirinha no para-lama
  for (const z of [0.8, length - 0.8]) for (const x of [-0.85, 0.85]) g.add(wheel(x, 0.33, z, 0.33));
}

/** Fita zebrada da Martelada: cones e fitas amarelo-e-preto dos dois lados da faixa, "X" na entrada. */
let zebraMat: THREE.MeshBasicMaterial | null = null;
function zebraTape(g: THREE.Group, length: number): void {
  const coneGeo = new THREE.ConeGeometry(0.2, 0.8, 8);
  for (let z = 0; z <= length; z += 5) {
    for (const x of [-0.95, 0.95]) {
      const cone = new THREE.Mesh(coneGeo, toon(0xff6d00));
      cone.position.set(x, 0.4, z);
      g.add(cone);
    }
  }
  // Uma fita por lado e altura, com listras de textura (poucas malhas para o celular).
  zebraMat ??= new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    map: canvasTexture(64, 8, (ctx) => {
      ctx.fillStyle = '#ffd600';
      ctx.fillRect(0, 0, 64, 8);
      ctx.fillStyle = '#111111';
      ctx.fillRect(32, 0, 32, 8);
    }),
  });
  zebraMat.userData.shared = true;
  for (const y of [0.8, 1.6]) {
    for (const x of [-0.95, 0.95]) {
      const geo = new THREE.PlaneGeometry(length, 0.16);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * length); // 1 listra por metro
      const tape = new THREE.Mesh(geo, zebraMat);
      tape.rotation.y = Math.PI / 2;
      tape.position.set(x, y, length / 2);
      g.add(tape);
    }
  }
  for (const s of [-1, 1]) {
    for (const y of [0.9, 1.7]) {
      const band = box(2.4, 0.16, 0.03, 0xffd600, y, 0);
      band.rotation.z = s * 0.35;
      g.add(band);
    }
  }
}

/** Púlpito do Careca de Toga. */
export function makeJudgeStand(): { root: THREE.Group; judge: Rig } {
  const g = new THREE.Group();
  g.add(box(1.6, 1.3, 1.0, 0x5d4037, 0.65, 0));
  g.add(box(1.8, 0.12, 1.2, 0x8d6e63, 1.36, 0));
  g.add(box(0.9, 0.5, 0.04, 0xffd600, 0.8, -0.51)); // brasão sem texto
  addOutline(g, 0.03);
  const judge = makeCareca();
  judge.root.position.set(0, 0.35, 0.5);
  judge.root.rotation.y = Math.PI; // olha para o jogador
  g.add(judge.root);
  return { root: g, judge };
}

export function makeObstacleView(o: Obstacle, biome: 'rio' | 'brasilia' = 'rio'): ObstacleView {
  const g = new THREE.Group();
  const view: ObstacleView = { root: g };
  const seed = o.id;
  switch (o.kind) {
    case 'low':
      if (o.variant === 'police') {
        cavalete(g, 0x1f3c88);
        const cop = makePoliceman();
        cop.root.position.set(0.95, 0, 0.9);
        cop.root.scale.setScalar(0.9);
        g.add(cop.root);
        view.rig = cop;
        // Giroflex no cavalete
        const light = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), toon(0xff1744, { emissive: 0x880000 }));
        light.position.set(-0.8, OB.low.height + 0.1, 0.2);
        light.name = 'siren';
        g.add(light);
      } else {
        cavalete(g);
      }
      break;
    case 'high':
      if (o.variant === 'olinda') {
        const facing = new THREE.Group(); // rosto virado para o jogador (que vem de -z)
        facing.rotation.y = Math.PI;
        facing.position.z = 0.4;
        g.add(facing);
        view.spin = olinda(facing, seed);
      } else {
        for (const x of [-1.0, 1.0]) g.add(box(0.12, OB.high.top, 0.12, 0x666666, OB.high.top / 2, 0.2, x));
        const h = OB.high.top - OB.high.bottom;
        g.add(box(2.0, h, 0.06, CARNIVAL[seed % 6], OB.high.bottom + h / 2, 0.2));
        g.add(box(2.0, 0.12, 0.07, 0xffffff, OB.high.bottom + h * 0.5, 0.2));
      }
      break;
    case 'bus':
      if (o.variant === 'roof') {
        carroAlegorico(g, o.length, seed);
      } else if (busModel(g, o.length, o.height)) {
        // ônibus articulado: dois modelos de IA em sequência
      } else {
        const color = seed % 2 ? 0xf2b705 : 0x1e88e5;
        g.add(box(2.0, o.height - 0.3, o.length, color, 0.3 + (o.height - 0.3) / 2, o.length / 2));
        g.add(box(2.02, 0.55, o.length - 0.6, 0x9fd3ff, o.height - 0.75, o.length / 2));
        g.add(box(1.7, 0.65, 0.05, 0x9fd3ff, o.height - 0.9, 0));
        g.add(box(2.02, 0.15, o.length, 0xffffff, 1.0, o.length / 2));
        for (const z of [1.2, o.length - 1.2]) for (const x of [-0.9, 0.9]) g.add(wheel(x, 0.35, z));
      }
      break;
    case 'stand': {
      // Banca de jornal (modelo de IA; as laterais lisas aguentam o esticão no comprimento)
      const banca = model('banca', [2.0, o.height, o.length]);
      if (banca) {
        banca.position.z = o.length / 2;
        g.add(banca);
        break;
      }
      g.add(box(1.9, o.height, o.length, 0x1b7f4c));
      g.add(box(2.1, 0.14, o.length + 0.3, 0x14563a, o.height + 0.07, o.length / 2));
      for (let i = 0; i < 3; i++) g.add(box(0.45, 0.6, 0.04, CARNIVAL[(seed + i) % 6], 1.25, -0.01, -0.55 + i * 0.55));
      break;
    }
    case 'ramp': {
      const len = Math.hypot(o.length, o.height);
      const slope = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.15, len), toon(0xffd600));
      slope.rotation.x = -Math.atan2(o.height, o.length);
      slope.position.set(0, o.height / 2, o.length / 2);
      g.add(slope);
      for (let i = 1; i < 6; i++) {
        const t = i / 6;
        const stripe = box(2.02, 0.16, 0.25, 0xff1744, t * o.height + 0.02, t * o.length);
        stripe.rotation.x = slope.rotation.x;
        g.add(stripe);
      }
      for (const x of [-1.0, 1.0]) g.add(box(0.1, o.height / 2, o.length, 0x8d6e63, o.height / 4, o.length / 2, x));
      break;
    }
    case 'vehicle': {
      if (biome === 'brasilia') {
        officialSedan(g, o.length);
        break;
      }
      // Táxi do Rio (amarelo com faixa azul) vindo de frente
      const taxi = model('taxi', [1.9, o.height, o.length]);
      if (taxi) {
        taxi.position.z = o.length / 2;
        g.add(taxi);
        break;
      }
      g.add(box(1.8, 0.8, o.length, 0xffd600, 0.55, o.length / 2));
      g.add(box(1.82, 0.14, o.length, 0x1565c0, 0.6, o.length / 2));
      g.add(box(1.6, 0.6, o.length * 0.5, 0xffd600, 1.25, o.length * 0.45));
      g.add(box(1.4, 0.45, 0.04, 0x9fd3ff, 1.25, o.length * 0.2));
      for (const x of [-0.6, 0.6]) g.add(box(0.3, 0.18, 0.05, 0xfff59d, 0.7, -0.01, x));
      for (const z of [0.8, o.length - 0.8]) for (const x of [-0.85, 0.85]) g.add(wheel(x, 0.33, z, 0.33));
      break;
    }
    case 'hole': {
      g.add(box(2.0, 0.02, o.length, 0x111111, 0.011, o.length / 2));
      g.add(box(2.1, 0.06, 0.15, 0xff6d00, 0.03, -0.1));
      for (const z of [-0.3, o.length + 0.3]) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 8), toon(0xff6d00));
        cone.position.set(-0.85, 0.25, z);
        g.add(cone);
      }
      break;
    }
    case 'tape':
      zebraTape(g, o.length);
      break;
    case 'boi': {
      // A dança mexe no `spin`; o modelo de IA fica um pouco acima da caixa de colisão (chifres).
      // Comprimento igual à caixa de colisão; um pouco mais alto que ela só nos chifres.
      const m = model('boi', [null, 1.45, OB.boi.length]);
      if (m) {
        const spin = new THREE.Group();
        spin.position.z = OB.boi.length / 2;
        spin.add(m);
        g.add(spin);
        view.spin = spin;
      } else {
        view.spin = boi(g, seed);
        addOutline(view.spin, 0.04);
      }
      break;
    }
    case 'drunk': {
      const d = makeDrunk();
      d.root.position.z = 0.4;
      d.root.rotation.y = Math.PI; // vem andando na direção do jogador
      g.add(d.root);
      view.rig = d;
      break;
    }
  }
  return view;
}

// ── Coletáveis ────────────────────────────────────────────────────

export function makePickupMesh(kind: PickupKind): THREE.Object3D {
  const g = new THREE.Group();
  switch (kind) {
    case 'coin': {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 16), toon(0xffca28));
      m.rotation.x = Math.PI / 2;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 6, 16), toon(0xffa000));
      g.add(m, rim);
      break;
    }
    case 'bill': {
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.03), toon(0x43a047, { emissive: 0x0a2a0a })));
      const c = new THREE.Mesh(new THREE.CircleGeometry(0.11, 12), toon(0xc8e6c9));
      c.position.z = 0.02;
      g.add(c);
      g.scale.setScalar(1.1);
      break;
    }
    case 'case': {
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.58, 0.26), toon(0x1a1a1a)));
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 6, 12, Math.PI), toon(0xffc107));
      handle.position.y = 0.29;
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.02), toon(0xffc107));
      lock.position.set(0, 0.13, 0.14);
      g.add(handle, lock);
      g.scale.setScalar(1.2);
      break;
    }
    case 'immunity': {
      // Mini carro oficial preto com giroflex
      g.add(box(0.7, 0.28, 1.0, 0x111111, 0, 0));
      g.add(box(0.6, 0.22, 0.55, 0x222244, 0.24, -0.05));
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), toon(0x2979ff, { emissive: 0x0d2a66 }));
      s.position.set(0, 0.4, -0.05);
      g.add(s);
      break;
    }
    case 'habeas': {
      // Pergaminho com selo vermelho
      const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.8, 12), toon(0xfff8e1));
      paper.rotation.z = Math.PI / 2;
      const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 12), toon(0xc62828));
      seal.rotation.x = Math.PI / 2;
      seal.position.z = 0.16;
      const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.025, 6, 14), toon(0xc62828));
      ribbon.rotation.y = Math.PI / 2;
      g.add(paper, seal, ribbon);
      break;
    }
    case 'cafe': {
      // Xícara de cafezinho no pires, com fumacinha
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.32, 14), toon(0xffffff));
      const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.2, 14), toon(0x4e342e));
      coffee.rotation.x = -Math.PI / 2;
      coffee.position.y = 0.161;
      coffee.userData.noOutline = true;
      const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.04, 16), toon(0xffffff));
      saucer.position.y = -0.17;
      const ear = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 6, 10), toon(0xffffff));
      ear.position.set(0.24, 0.02, 0);
      g.add(cup, coffee, saucer, ear);
      for (let i = 0; i < 3; i++) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(0.07 + i * 0.02, 8, 6),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }),
        );
        puff.position.set(Math.sin(i * 2) * 0.06, 0.3 + i * 0.15, 0);
        puff.userData.noOutline = true;
        g.add(puff);
      }
      break;
    }
    case 'sandal': {
      // Chinelo de dedo genérico (sem marca) em cima de uma mola
      const sole = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.4, 4, 10), toon(0x1e88e5));
      sole.rotation.x = Math.PI / 2;
      sole.scale.set(1, 1, 0.3);
      sole.position.y = 0.1;
      for (const s of [-1, 1]) {
        const strap = box(0.04, 0.04, 0.3, 0xffd600, 0.18, -0.05, s * 0.09);
        strap.rotation.y = -s * 0.5;
        g.add(strap);
      }
      for (let i = 0; i < 4; i++) {
        const coil = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 14), toon(0xbdbdbd));
        coil.rotation.x = Math.PI / 2;
        coil.position.y = -0.06 - i * 0.08;
        g.add(coil);
      }
      g.add(sole);
      break;
    }
    case 'pix': {
      // Envelope verde com notas saindo
      g.add(box(0.7, 0.45, 0.06, 0x2e7d32, 0, 0));
      for (let i = 0; i < 3; i++) {
        const bill = box(0.55, 0.26, 0.02, 0x66bb6a, 0, 0);
        bill.position.set(-0.08 + i * 0.08, 0.28 + i * 0.03, -0.01);
        bill.rotation.z = -0.25 + i * 0.25;
        g.add(bill);
      }
      const flap = box(0.36, 0.36, 0.02, 0x1b5e20, 0, 0);
      flap.rotation.z = Math.PI / 4;
      flap.position.set(0, 0.1, 0.04);
      g.add(flap);
      break;
    }
    case 'saci': {
      // Gorro vermelho do Saci girando num redemoinho
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 14), toon(0xd50000));
      cap.rotation.x = -0.3;
      const swirl = new THREE.Mesh(
        new THREE.TorusGeometry(0.4, 0.04, 6, 20),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }),
      );
      swirl.rotation.x = Math.PI / 2;
      swirl.position.y = -0.3;
      g.add(cap, swirl);
      break;
    }
  }
  if (!isMoney(kind)) {
    // Aura para diferenciar power-ups de dinheiro (também por forma, não só cor)
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.65, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
    );
    ring.name = 'aura';
    g.add(ring);
    addOutline(g, 0.03);
  }
  return g;
}

// ── Veículos especiais ───────────────────────────────────────────

/** Carro oficial preto com batedores (Imunidade Parlamentar). */
export function makeOfficialCar(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(1.9, 0.75, 4.4, 0x111111, 0.6, 0));
  g.add(box(1.7, 0.6, 2.2, 0x1c1c2e, 1.25, -0.3));
  g.add(box(1.5, 0.45, 0.04, 0x9fd3ff, 1.25, 0.8));
  for (const z of [-1.4, 1.4]) for (const x of [-0.9, 0.9]) g.add(wheel(x, 0.35, z));
  const flag = box(0.5, 0.3, 0.02, 0x009c3b, 1.4, 2.0, 0.8);
  g.add(flag);
  for (const [x, c] of [[-0.35, 0x2979ff], [0.35, 0xff1744]] as const) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), toon(c, { emissive: c }));
    s.position.set(x, 1.62, -0.3);
    s.name = 'siren';
    g.add(s);
  }
  // Batedores de moto
  for (const x of [-1.6, 1.6]) {
    const bike = new THREE.Group();
    bike.add(box(0.25, 0.4, 1.2, 0xffffff, 0.45, 0));
    bike.add(wheel(0, 0.3, 0.5, 0.3), wheel(0, 0.3, -0.5, 0.3));
    const rider = box(0.4, 0.6, 0.35, 0x1f3c88, 1.0, -0.1);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), toon(0xffffff));
    helmet.position.set(0, 1.45, -0.1);
    bike.add(rider, helmet);
    bike.position.set(x, 0, 2.4);
    g.add(bike);
  }
  addOutline(g, 0.03);
  return g;
}

/** Carro-forte do Vorcano, com ele debruçado na janela jogando maletas. */
export function makeArmoredTruck(): { root: THREE.Group; vorcano: Rig } {
  const g = new THREE.Group();
  g.add(box(2.2, 2.2, 5.5, 0x546e7a, 1.35, 0));
  g.add(box(2.1, 1.5, 1.6, 0x455a64, 1.0, 3.4));
  g.add(box(1.9, 0.6, 0.05, 0x9fd3ff, 1.4, 4.21));
  g.add(box(2.22, 0.3, 5.5, 0xffc107, 1.6, 0));
  for (const z of [-1.8, 1.8, 3.4]) for (const x of [-1.0, 1.0]) g.add(wheel(x, 0.4, z, 0.4));
  addOutline(g, 0.03);
  const v = makeVorcano();
  v.root.scale.setScalar(0.8);
  v.root.position.set(-0.9, 1.0, 3.2);
  v.root.rotation.y = -Math.PI / 2; // virado para a pista
  g.add(v.root);
  return { root: g, vorcano: v };
}

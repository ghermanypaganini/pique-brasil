import * as THREE from 'three';
import type { Character } from '../systems/types';
import { addOutline, toon } from './materials';

// Personagens montados com formas simples, acabamento cartoon (toon + contorno).
// Proporções de desenho animado: cabeça grande, mãos e pés grandes.

const mesh = (geo: THREE.BufferGeometry, color: number) => new THREE.Mesh(geo, toon(color));

const SKIN = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];
const HAIR = [0x2b1b0e, 0x4a3020, 0x111111, 0x8a6a3a, 0xcccccc];

export interface Rig {
  root: THREE.Group;
  body: THREE.Group; // inclina/rola
  head: THREE.Object3D;
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
}

function limb(w: number, h: number, color: number, pivotY: number): THREE.Group {
  const g = new THREE.Group();
  const m = mesh(new THREE.CapsuleGeometry(w / 2, h - w, 3, 8), color);
  m.position.y = -h / 2;
  g.add(m);
  g.position.y = pivotY;
  return g;
}

interface RigOpts {
  torso: number;
  pants: number;
  skin: number;
  shoes: number;
  sleeves?: number;
  scale?: number;
}

function baseRig(o: RigOpts): Rig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = mesh(new THREE.CapsuleGeometry(0.34, 0.36, 4, 10), o.torso);
  torso.scale.set(1, 1, 0.68);
  torso.position.y = 1.02;
  body.add(torso);

  const head = new THREE.Group();
  head.position.y = 1.66;
  const skull = mesh(new THREE.SphereGeometry(0.36, 16, 12), o.skin);
  head.add(skull);
  const nose = mesh(new THREE.SphereGeometry(0.08, 8, 6), o.skin);
  nose.position.set(0, -0.02, 0.35);
  head.add(nose);
  for (const x of [-0.13, 0.13]) {
    const eye = mesh(new THREE.SphereGeometry(0.05, 8, 6), 0x1b1b1f);
    eye.position.set(x, 0.07, 0.31);
    eye.userData.noOutline = true;
    head.add(eye);
    const ear = mesh(new THREE.SphereGeometry(0.08, 8, 6), o.skin);
    ear.position.set(x * 2.7, 0, 0);
    head.add(ear);
  }
  body.add(head);

  const legL = limb(0.26, 0.66, o.pants, 0.68);
  const legR = limb(0.26, 0.66, o.pants, 0.68);
  legL.position.x = -0.17;
  legR.position.x = 0.17;
  for (const leg of [legL, legR]) {
    const shoe = mesh(new THREE.BoxGeometry(0.28, 0.14, 0.42), o.shoes);
    shoe.position.set(0, -0.68, 0.07);
    leg.add(shoe);
  }
  body.add(legL, legR);

  const armL = limb(0.2, 0.62, o.sleeves ?? o.torso, 1.32);
  const armR = limb(0.2, 0.62, o.sleeves ?? o.torso, 1.32);
  armL.position.x = -0.46;
  armR.position.x = 0.46;
  for (const arm of [armL, armR]) {
    const hand = mesh(new THREE.SphereGeometry(0.13, 10, 8), o.skin);
    hand.position.y = -0.66;
    arm.add(hand);
  }
  body.add(armL, armR);

  if (o.scale) root.scale.setScalar(o.scale);
  return { root, body, head, legL, legR, armL, armR };
}

/** Lule: idoso, barba e cabelo brancos, terno vermelho, chapéu panamá. */
function makeLule(): Rig {
  const rig = baseRig({ torso: 0xc8102e, pants: 0x9e0c24, skin: 0xe8b98a, shoes: 0x222222 });
  const { head, body } = rig;

  const beard = mesh(new THREE.SphereGeometry(0.33, 14, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), 0xf4f4f4);
  beard.position.set(0, -0.02, 0.05);
  beard.scale.set(1.04, 1.15, 1.02);
  head.add(beard);
  const mustache = mesh(new THREE.CapsuleGeometry(0.05, 0.2, 3, 6), 0xf4f4f4);
  mustache.rotation.z = Math.PI / 2;
  mustache.position.set(0, -0.08, 0.34);
  head.add(mustache);

  const hair = mesh(new THREE.SphereGeometry(0.375, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), 0xeeeeee);
  hair.position.z = -0.03;
  head.add(hair);

  const hat = new THREE.Group();
  const brim = mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.04, 20), 0xe9dcb5);
  const crown = mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.28, 20), 0xe9dcb5);
  crown.position.y = 0.15;
  const band = mesh(new THREE.CylinderGeometry(0.345, 0.345, 0.07, 20), 0x222222);
  band.position.y = 0.05;
  band.userData.noOutline = true;
  hat.add(brim, crown, band);
  hat.position.y = 0.3;
  hat.rotation.x = -0.08;
  head.add(hat);

  // Camisa branca e gravata aparecendo pelo terno
  const shirt = mesh(new THREE.BoxGeometry(0.24, 0.42, 0.04), 0xffffff);
  shirt.position.set(0, 1.12, 0.23);
  shirt.userData.noOutline = true;
  const tie = mesh(new THREE.BoxGeometry(0.08, 0.34, 0.03), 0x7a0a1a);
  tie.position.set(0, 1.1, 0.255);
  tie.userData.noOutline = true;
  body.add(shirt, tie);

  addOutline(rig.root);
  return rig;
}

/** Bolsonero: mais novo, sem barba, cabelo curto penteado de lado, camisa amarela, relógio preto. */
function makeBolsonero(): Rig {
  const rig = baseRig({ torso: 0xffd400, pants: 0x1f2a44, skin: 0xf0c8a0, shoes: 0x3a2a1a });
  const { head, body } = rig;

  const hair = mesh(new THREE.SphereGeometry(0.38, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.4), 0x2b1d12);
  hair.rotation.z = 0.15;
  hair.position.set(0.02, 0.02, -0.02);
  head.add(hair);
  // Topete penteado para o lado
  const fringe = mesh(new THREE.CapsuleGeometry(0.08, 0.36, 3, 8), 0x2b1d12);
  fringe.rotation.z = Math.PI / 2 - 0.3;
  fringe.position.set(0.06, 0.24, 0.25);
  head.add(fringe);

  const collar = mesh(new THREE.TorusGeometry(0.2, 0.05, 6, 14), 0x0a7d3b);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.4;
  body.add(collar);

  const watch = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12), 0x111111);
  watch.position.y = -0.5;
  rig.armL.add(watch);

  addOutline(rig.root);
  return rig;
}

export function makeRunner(character: Character): Rig {
  return character === 'lule' ? makeLule() : makeBolsonero();
}

/** Perseguidor: apoiador do lado rival. `side` é a cor do lado que persegue. */
export function makeChaser(side: 'verde-amarelo' | 'vermelho', index: number): Rig {
  const greenYellow = index % 2 === 0 ? 0xffd400 : 0x0a9c4a;
  const torso = side === 'vermelho' ? (index % 2 === 0 ? 0xd7192f : 0xa50f22) : greenYellow;
  const rig = baseRig({
    torso,
    pants: [0x1f2a44, 0x3b3b3b, 0x5a4632][index % 3],
    skin: SKIN[index % SKIN.length],
    shoes: 0x222222,
    scale: 0.94 + (index % 3) * 0.05,
  });
  const hair = mesh(new THREE.SphereGeometry(0.375, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.38), HAIR[index % HAIR.length]);
  rig.head.add(hair);
  if (index % 3 === 1) {
    const cap = mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.16, 14), side === 'vermelho' ? 0xffffff : 0x0a9c4a);
    cap.position.y = 0.26;
    const visor = mesh(new THREE.BoxGeometry(0.4, 0.04, 0.3), side === 'vermelho' ? 0xffffff : 0x0a9c4a);
    visor.position.set(0, 0.2, 0.3);
    rig.head.add(cap, visor);
  }

  // Bandeira sem texto: só cores e formas.
  if (index % 2 === 0) {
    const flag = new THREE.Group();
    const pole = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.7, 6), 0x8b5a2b);
    pole.position.y = 0.85;
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 0.66),
      toon(side === 'vermelho' ? 0xe0102a : 0x0a9c4a, { side: THREE.DoubleSide }),
    );
    cloth.position.set(0.52, 1.36, 0);
    cloth.name = 'cloth';
    cloth.userData.noOutline = true; // contorno por casco não funciona em planos (mancha preta)
    flag.add(pole, cloth);
    const emblem =
      side === 'verde-amarelo'
        ? new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.46), toon(0xffd400, { side: THREE.DoubleSide }))
        : new THREE.Mesh(new THREE.CircleGeometry(0.17, 5), toon(0xffffff, { side: THREE.DoubleSide }));
    if (side === 'verde-amarelo') {
      emblem.rotation.z = Math.PI / 4;
      const globe = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), toon(0x1e3a8a, { side: THREE.DoubleSide }));
      globe.position.z = 0.004;
      globe.userData.noOutline = true;
      emblem.add(globe);
    }
    emblem.position.z = 0.005;
    emblem.userData.noOutline = true;
    cloth.add(emblem);
    flag.position.y = -0.6;
    rig.armR.add(flag);
  }
  addOutline(rig.root, 0.03);
  return rig;
}

/** Policial cartoon (sem armas visíveis): farda azul, quepe, apito. */
export function makePoliceman(): Rig {
  const rig = baseRig({ torso: 0x1f3c88, pants: 0x14285c, skin: 0xd8a47f, shoes: 0x111111, sleeves: 0x1f3c88 });
  const cap = mesh(new THREE.CylinderGeometry(0.4, 0.34, 0.2, 14), 0x14285c);
  cap.position.y = 0.3;
  const visor = mesh(new THREE.BoxGeometry(0.44, 0.04, 0.26), 0x111111);
  visor.position.set(0, 0.2, 0.3);
  const badge = mesh(new THREE.CircleGeometry(0.06, 6), 0xffc107);
  badge.position.set(0, 0.32, 0.36);
  rig.head.add(cap, visor, badge);
  const whistle = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 6), 0xc0c0c0);
  whistle.rotation.x = Math.PI / 2;
  whistle.position.set(0, -0.14, 0.4);
  rig.head.add(whistle);
  addOutline(rig.root, 0.03);
  return rig;
}

/** Homem bêbado cartoon: camisa aberta, garrafa sem rótulo, nariz vermelho. */
export function makeDrunk(): Rig {
  const rig = baseRig({ torso: 0xf4f1e8, pants: 0x6b5b3e, skin: 0xe8b090, shoes: 0x3d2b1f, sleeves: 0xf4f1e8 });
  const nose = mesh(new THREE.SphereGeometry(0.1, 8, 6), 0xe04848);
  nose.position.set(0, -0.02, 0.36);
  rig.head.add(nose);
  const hair = mesh(new THREE.SphereGeometry(0.37, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.3), 0x5a4632);
  rig.head.add(hair);
  const bottle = new THREE.Group();
  const glass = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 8), 0x2e7d32);
  const neck = mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.12, 8), 0x2e7d32);
  neck.position.y = 0.2;
  bottle.add(glass, neck);
  bottle.position.y = -0.75;
  rig.armR.add(bottle);
  addOutline(rig.root, 0.03);
  return rig;
}

/** Vorcano: banqueiro de terno, cabelo penteado para trás (caricatura, nome de paródia). */
export function makeVorcano(): Rig {
  const rig = baseRig({ torso: 0x2b2b35, pants: 0x2b2b35, skin: 0xf0c8a0, shoes: 0x111111 });
  const hair = mesh(new THREE.SphereGeometry(0.38, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), 0x1a1208);
  hair.position.z = -0.04;
  rig.head.add(hair);
  const shirt = mesh(new THREE.BoxGeometry(0.24, 0.42, 0.04), 0xffffff);
  shirt.position.set(0, 1.12, 0.23);
  const tie = mesh(new THREE.BoxGeometry(0.08, 0.34, 0.03), 0x1565c0);
  tie.position.set(0, 1.1, 0.255);
  rig.body.add(shirt, tie);
  addOutline(rig.root, 0.03);
  return rig;
}

/** Careca de Toga: juiz careca genérico, toga preta, martelo na mão direita. Sem nome nem traços de alguém real. */
export function makeCareca(): Rig {
  const rig = baseRig({ torso: 0x15151a, pants: 0x15151a, skin: 0xe8b98a, shoes: 0x111111 });
  // Toga até os pés, gola branca
  const robe = mesh(new THREE.CylinderGeometry(0.36, 0.55, 1.0, 14), 0x15151a);
  robe.position.y = 0.62;
  const collar = mesh(new THREE.BoxGeometry(0.2, 0.22, 0.05), 0xffffff);
  collar.position.set(0, 1.3, 0.22);
  collar.userData.noOutline = true;
  rig.body.add(robe, collar);
  // Careca brilhando: só um tufo de cabelo de cada lado
  for (const x of [-0.3, 0.3]) {
    const tuft = mesh(new THREE.SphereGeometry(0.11, 8, 6), 0x9e9e9e);
    tuft.position.set(x, 0.02, -0.08);
    rig.head.add(tuft);
  }
  const shine = mesh(new THREE.SphereGeometry(0.06, 8, 6), 0xffffff);
  shine.position.set(-0.1, 0.32, 0.12);
  shine.userData.noOutline = true;
  rig.head.add(shine);
  const gavel = new THREE.Group();
  const handle = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), 0x6d4c41);
  const hammer = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.3, 10), 0x8d6e63);
  hammer.rotation.z = Math.PI / 2;
  hammer.position.y = -0.25;
  gavel.add(handle, hammer);
  gavel.rotation.x = Math.PI / 2;
  gavel.position.set(0, -0.7, 0.22);
  rig.armR.add(gavel);
  addOutline(rig.root, 0.03);
  return rig;
}

/** Saci (folclore): menino de uma perna só com gorro vermelho. Formas simples, sem cachimbo. */
export function makeSaci(): THREE.Group {
  const g = new THREE.Group();
  const body = mesh(new THREE.CapsuleGeometry(0.16, 0.24, 4, 8), 0x5d3a1a);
  body.position.y = 0.62;
  const shorts = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.14, 10), 0xb71c1c);
  shorts.position.y = 0.42;
  const leg = mesh(new THREE.CapsuleGeometry(0.07, 0.3, 3, 6), 0x5d3a1a);
  leg.position.y = 0.2;
  const head = mesh(new THREE.SphereGeometry(0.2, 12, 10), 0x5d3a1a);
  head.position.y = 0.98;
  const cap = mesh(new THREE.ConeGeometry(0.2, 0.4, 12), 0xd50000);
  cap.position.set(0, 1.22, -0.04);
  cap.rotation.x = -0.4;
  for (const x of [-0.07, 0.07]) {
    const eye = mesh(new THREE.SphereGeometry(0.035, 6, 6), 0xffffff);
    eye.position.set(x, 1.0, 0.18);
    eye.userData.noOutline = true;
    g.add(eye);
  }
  g.add(body, shorts, leg, head, cap);
  addOutline(g, 0.025);
  return g;
}

/** Cuca (do Sítio do Picapau Amarelo): jacaré de cabelo loiro voando na vassoura. */
export function makeCuca(): THREE.Group {
  const g = new THREE.Group();
  const broom = new THREE.Group();
  const stick = mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), 0x8b5a2b);
  stick.rotation.z = Math.PI / 2;
  const bristles = mesh(new THREE.ConeGeometry(0.28, 0.6, 10), 0xd4a33b);
  bristles.rotation.z = Math.PI / 2;
  bristles.position.x = -1.4;
  broom.add(stick, bristles);
  g.add(broom);

  const body = mesh(new THREE.CapsuleGeometry(0.35, 0.5, 4, 10), 0x4caf50);
  body.position.set(0.1, 0.45, 0);
  body.rotation.z = 0.3;
  const dress = mesh(new THREE.ConeGeometry(0.5, 0.7, 12), 0x6a1b9a);
  dress.position.set(0.05, 0.25, 0);
  const head = new THREE.Group();
  head.position.set(0.35, 1.05, 0);
  const skull = mesh(new THREE.SphereGeometry(0.32, 14, 10), 0x4caf50);
  const snout = mesh(new THREE.BoxGeometry(0.62, 0.2, 0.34), 0x4caf50);
  snout.position.set(0.42, -0.08, 0);
  for (const z of [-0.12, 0.12]) {
    const eye = mesh(new THREE.SphereGeometry(0.09, 8, 6), 0xffeb3b);
    eye.position.set(0.12, 0.2, z);
    head.add(eye);
  }
  const hair = mesh(new THREE.SphereGeometry(0.36, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), 0xffd54f);
  hair.position.set(-0.08, 0.06, 0);
  const bun = mesh(new THREE.SphereGeometry(0.16, 10, 8), 0xffd54f);
  bun.position.set(-0.3, 0.3, 0);
  head.add(skull, snout, hair, bun);
  g.add(body, dress, head);
  addOutline(g, 0.04);
  return g;
}

/** Ciclo de corrida simples (fase em radianos). */
export function animateRun(rig: Rig, phase: number, amount = 1): void {
  const s = Math.sin(phase) * 0.9 * amount;
  rig.legL.rotation.x = s;
  rig.legR.rotation.x = -s;
  rig.armL.rotation.x = -s * 0.8;
  rig.armR.rotation.x = s * 0.8;
  rig.body.position.y = Math.abs(Math.cos(phase)) * 0.08 * amount;
}

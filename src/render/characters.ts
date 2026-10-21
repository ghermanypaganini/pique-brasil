import * as THREE from 'three';
import type { Character } from '../systems/types';

// Personagens montados com formas simples (greybox estilizado). No dia 2 ganham acabamento cartoon.

const mat = (color: number) => new THREE.MeshLambertMaterial({ color });

const SKIN = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];
const HAIR = [0x2b1b0e, 0x4a3020, 0x111111, 0x8a6a3a, 0xcccccc];

export interface Rig {
  root: THREE.Group;
  body: THREE.Group; // inclina/rola
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
}

function limb(w: number, h: number, color: number, pivotY: number): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat(color));
  m.position.y = -h / 2;
  g.add(m);
  g.position.y = pivotY;
  return g;
}

function baseRig(opts: {
  torso: number;
  pants: number;
  skin: number;
  shoes: number;
  sleeves?: number;
}): Rig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.42), mat(opts.torso));
  torso.position.y = 1.0;
  body.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 10), mat(opts.skin));
  head.position.y = 1.62;
  head.name = 'head';
  body.add(head);

  const legL = limb(0.24, 0.66, opts.pants, 0.66);
  const legR = limb(0.24, 0.66, opts.pants, 0.66);
  legL.position.x = -0.18;
  legR.position.x = 0.18;
  for (const leg of [legL, legR]) {
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.38), mat(opts.shoes));
    shoe.position.set(0, -0.66, 0.06);
    leg.add(shoe);
  }
  body.add(legL, legR);

  const armL = limb(0.18, 0.6, opts.sleeves ?? opts.torso, 1.3);
  const armR = limb(0.18, 0.6, opts.sleeves ?? opts.torso, 1.3);
  armL.position.x = -0.46;
  armR.position.x = 0.46;
  for (const arm of [armL, armR]) {
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), mat(opts.skin));
    hand.position.y = -0.64;
    arm.add(hand);
  }
  body.add(armL, armR);

  return { root, body, legL, legR, armL, armR };
}

/** Lule: idoso, barba e cabelo brancos, terno vermelho, chapéu panamá. */
function makeLule(): Rig {
  const rig = baseRig({ torso: 0xc8102e, pants: 0x9e0c24, skin: 0xe8b98a, shoes: 0x222222 });
  const head = rig.body.getObjectByName('head')!;

  const beard = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
    mat(0xf2f2f2),
  );
  beard.position.set(0, -0.04, 0.06);
  beard.scale.set(1.05, 1.1, 1);
  head.add(beard);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), mat(0xeeeeee));
  hair.position.z = -0.03;
  head.add(hair);

  const hat = new THREE.Group();
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.04, 16), mat(0xe9dcb5));
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.26, 16), mat(0xe9dcb5));
  crown.position.y = 0.14;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.325, 0.325, 0.06, 16), mat(0x222222));
  band.position.y = 0.05;
  hat.add(brim, crown, band);
  hat.position.y = 0.28;
  hat.rotation.x = -0.08;
  head.add(hat);

  // Camisa e gravata aparecendo pelo terno
  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.02), mat(0xffffff));
  shirt.position.set(0, 1.08, 0.22);
  rig.body.add(shirt);
  return rig;
}

/** Bolsonero: mais novo, sem barba, cabelo curto penteado de lado, camisa amarela, relógio preto. */
function makeBolsonero(): Rig {
  const rig = baseRig({ torso: 0xffd400, pants: 0x1f2a44, skin: 0xf0c8a0, shoes: 0x3a2a1a });
  const head = rig.body.getObjectByName('head')!;

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.345, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), mat(0x2b1d12));
  hair.rotation.z = 0.18; // repartido de lado
  hair.position.set(0.02, 0.02, -0.02);
  head.add(hair);
  const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.12), mat(0x2b1d12));
  fringe.position.set(0.06, 0.2, 0.24);
  fringe.rotation.z = -0.25;
  head.add(fringe);

  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.44), mat(0x0a7d3b));
  collar.position.y = 1.36;
  rig.body.add(collar);

  const watch = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.08, 0.21), mat(0x111111));
  watch.position.y = -0.5;
  rig.armL.add(watch);
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
  });
  const head = rig.body.getObjectByName('head')!;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.4), mat(HAIR[index % HAIR.length]));
  head.add(hair);
  if (index % 3 === 1) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.35, 0.16, 12), mat(side === 'vermelho' ? 0xffffff : 0x0a9c4a));
    cap.position.y = 0.24;
    head.add(cap);
  }

  // Bandeira sem texto: só cores e formas.
  if (index % 2 === 0) {
    const flag = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), mat(0x8b5a2b));
    pole.position.y = 0.8;
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.6),
      new THREE.MeshLambertMaterial({ color: side === 'vermelho' ? 0xe0102a : 0x0a9c4a, side: THREE.DoubleSide }),
    );
    cloth.position.set(0.46, 1.3, 0);
    cloth.name = 'cloth';
    flag.add(pole, cloth);
    if (side === 'verde-amarelo') {
      const diamond = new THREE.Mesh(
        new THREE.PlaneGeometry(0.42, 0.42),
        new THREE.MeshLambertMaterial({ color: 0xffd400, side: THREE.DoubleSide }),
      );
      diamond.rotation.z = Math.PI / 4;
      diamond.position.z = 0.005;
      cloth.add(diamond);
    } else {
      const star = new THREE.Mesh(
        new THREE.CircleGeometry(0.16, 5),
        new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
      );
      star.position.z = 0.005;
      cloth.add(star);
    }
    flag.position.y = -0.55;
    rig.armR.add(flag);
  }
  return rig;
}

/** Ciclo de corrida simples (fase em radianos). */
export function animateRun(rig: Rig, phase: number, amount = 1): void {
  const s = Math.sin(phase) * 0.9 * amount;
  rig.legL.rotation.x = s;
  rig.legR.rotation.x = -s;
  rig.armL.rotation.x = -s * 0.8;
  rig.armR.rotation.x = s * 0.8;
}

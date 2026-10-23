import * as THREE from 'three';
import type { Character } from '../systems/types';
import { addOutline, bakeRig, toon } from './materials';

// Personagens montados com formas simples, acabamento cartoon (toon + contorno).
// Proporções de desenho animado: cabeça grande, mãos e pés grandes.
// As peças são montadas uma a uma (fácil de ajustar) e depois fundidas por parte do corpo
// (`bakeRig`), para caber muitos detalhes sem pesar no celular.

const mesh = (geo: THREE.BufferGeometry, color: number) => new THREE.Mesh(geo, toon(color));

const SKIN = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];
const HAIR = [0x2b1b0e, 0x4a3020, 0x111111, 0x8a6a3a, 0xcccccc];
const DARK = 0x1b1b1f;

export interface Rig {
  root: THREE.Group;
  body: THREE.Group; // inclina/rola
  head: THREE.Object3D;
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
}

const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T => {
  o.position.set(x, y, z);
  return o;
};

/** Marca peças pequenas que não levam contorno (olhos, brilhos, detalhes chapados). */
const flat = <T extends THREE.Object3D>(o: T): T => {
  o.userData.noOutline = true;
  return o;
};

interface RigOpts {
  torso: number;
  pants: number;
  skin: number;
  shoes: number;
  sleeves?: number;
  brows?: number;
  scale?: number;
  width?: number; // 1 = normal; >1 mais largo
  belly?: number; // 1 = reto; >1 barriga
  shortSleeves?: boolean;
  shorts?: boolean;
  mouth?: 'smile' | 'open' | 'flat';
}

/** Tronco arredondado (mais largo nos ombros, com barriga opcional). */
function torsoGeometry(width: number, belly: number): THREE.BufferGeometry {
  const pts = [
    [0.0, 0.7],
    [0.27, 0.71],
    [0.3, 0.8],
    [0.31 * belly, 0.95],
    [0.31 * belly, 1.08],
    [0.34, 1.24],
    [0.35, 1.33],
    [0.27, 1.43],
    [0.1, 1.47],
    [0.0, 1.475],
  ].map(([r, y]) => new THREE.Vector2(r * width, y));
  const geo = new THREE.LatheGeometry(pts, 16);
  geo.scale(1, 1, 0.7);
  return geo;
}

function limb(w: number, h: number, color: number, pivotY: number): THREE.Group {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.CapsuleGeometry(w / 2, h - w, 3, 10), color), 0, -h / 2, 0));
  g.position.y = pivotY;
  return g;
}

/** Rosto cartoon: olhos com pupila e brilho, sobrancelhas, nariz, boca e orelhas. */
function face(head: THREE.Object3D, o: RigOpts): void {
  head.add(at(mesh(new THREE.SphereGeometry(0.29, 14, 10), o.skin), 0, -0.1, 0.03)); // queixo/bochechas
  const nose = at(mesh(new THREE.SphereGeometry(0.085, 10, 8), o.skin), 0, -0.03, 0.35);
  nose.scale.set(1, 0.9, 1.15);
  head.add(nose);
  for (const s of [-1, 1]) {
    const eye = at(flat(mesh(new THREE.SphereGeometry(0.075, 12, 10), 0xffffff)), s * 0.13, 0.07, 0.29);
    eye.scale.set(1, 1.15, 0.6);
    head.add(eye);
    head.add(at(flat(mesh(new THREE.SphereGeometry(0.042, 10, 8), DARK)), s * 0.125, 0.06, 0.33));
    head.add(at(flat(mesh(new THREE.SphereGeometry(0.014, 6, 4), 0xffffff)), s * 0.125 + 0.015, 0.08, 0.365));
    const brow = at(mesh(new THREE.CapsuleGeometry(0.022, 0.1, 3, 6), o.brows ?? 0x3a2a1a), s * 0.13, 0.17, 0.31);
    brow.rotation.z = Math.PI / 2 + s * 0.15;
    head.add(brow);
    const ear = at(mesh(new THREE.SphereGeometry(0.085, 10, 8), o.skin), s * 0.36, 0, 0);
    ear.scale.set(0.5, 1, 0.8);
    head.add(ear);
  }
  const kind = o.mouth ?? 'smile';
  if (kind === 'open') {
    const m = at(flat(mesh(new THREE.SphereGeometry(0.06, 10, 8), 0x7a1f1f)), 0, -0.15, 0.3);
    m.scale.set(1.2, 0.8, 0.5);
    head.add(m);
  } else {
    const m = at(flat(mesh(new THREE.TorusGeometry(0.075, 0.016, 6, 12, kind === 'smile' ? Math.PI : 0.6), 0x7a1f1f)), 0, -0.12, 0.31);
    m.rotation.z = kind === 'smile' ? Math.PI : Math.PI / 2 + Math.PI - 0.3;
    head.add(m);
  }
}

function baseRig(o: RigOpts): Rig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const width = o.width ?? 1;

  body.add(mesh(torsoGeometry(width, o.belly ?? 1), o.torso));
  const hips = at(mesh(new THREE.SphereGeometry(0.29, 14, 10), o.pants), 0, 0.74, 0);
  hips.scale.set(width, 0.55, 0.72);
  body.add(hips);
  body.add(at(mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.14, 10), o.skin), 0, 1.5, 0)); // pescoço

  const head = new THREE.Group();
  head.position.y = 1.66;
  const skull = mesh(new THREE.SphereGeometry(0.36, 18, 14), o.skin);
  skull.scale.set(1, 1.04, 0.97);
  head.add(skull);
  face(head, o);
  body.add(head);

  const legL = limb(0.25, 0.6, o.pants, 0.7);
  const legR = limb(0.25, 0.6, o.pants, 0.7);
  for (const [leg, s] of [[legL, -1], [legR, 1]] as const) {
    leg.position.x = s * 0.15 * width;
    if (o.shorts) leg.add(at(mesh(new THREE.CapsuleGeometry(0.1, 0.24, 3, 8), o.skin), 0, -0.42, 0)); // canela
    const shoe = at(mesh(new THREE.CapsuleGeometry(0.12, 0.2, 4, 10), o.shoes), 0, -0.64, 0.07);
    shoe.rotation.x = Math.PI / 2;
    shoe.scale.set(1.05, 1, 0.62);
    leg.add(shoe);
    leg.add(at(flat(mesh(new THREE.BoxGeometry(0.24, 0.04, 0.42), 0xeeeeee)), 0, -0.7, 0.07)); // sola
  }
  body.add(legL, legR);

  const sleeve = o.sleeves ?? o.torso;
  const armL = o.shortSleeves ? limb(0.22, 0.3, sleeve, 1.32) : limb(0.2, 0.58, sleeve, 1.32);
  const armR = o.shortSleeves ? limb(0.22, 0.3, sleeve, 1.32) : limb(0.2, 0.58, sleeve, 1.32);
  for (const [arm, s] of [[armL, -1], [armR, 1]] as const) {
    arm.position.x = s * 0.44 * width;
    if (o.shortSleeves) arm.add(at(mesh(new THREE.CapsuleGeometry(0.085, 0.3, 3, 8), o.skin), 0, -0.42, 0));
    const hand = at(mesh(new THREE.SphereGeometry(0.12, 12, 10), o.skin), 0, -0.64, 0.01);
    hand.scale.set(0.95, 1.1, 0.85);
    arm.add(hand);
    arm.add(at(mesh(new THREE.SphereGeometry(0.05, 8, 6), o.skin), -s * 0.08, -0.6, 0.06)); // polegar
  }
  body.add(armL, armR);

  if (o.scale) root.scale.setScalar(o.scale);
  return { root, body, head, legL, legR, armL, armR };
}

/** Funde as peças de cada parte do corpo (ver bakeRig). */
function finish(rig: Rig, outline = 0.03): Rig {
  bakeRig([rig.body, rig.head, rig.legL, rig.legR, rig.armL, rig.armR], outline);
  return rig;
}

/** Cabelo: calota na cabeça; `back` cobre a nuca (visível de costas). */
function hairCap(head: THREE.Object3D, color: number, opts: { top?: number; back?: boolean } = {}): void {
  const cap = mesh(new THREE.SphereGeometry(0.375, 16, 10, 0, Math.PI * 2, 0, Math.PI * (opts.top ?? 0.42)), color);
  cap.position.z = -0.03;
  head.add(cap);
  if (opts.back) {
    const nape = at(mesh(new THREE.SphereGeometry(0.36, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), color), 0, -0.02, -0.07);
    nape.rotation.x = -0.9; // calota inclinada para trás: cobre a nuca
    head.add(nape);
  }
}

/** Lule: idoso, barba e cabelo brancos, terno vermelho, chapéu panamá. */
function makeLule(): Rig {
  const o: RigOpts = { torso: 0xc8102e, pants: 0x9e0c24, skin: 0xe8b98a, shoes: 0x222222, brows: 0xf4f4f4, belly: 1.12, width: 1.05 };
  const rig = baseRig(o);
  const { head, body } = rig;

  // Barba cheia, bigode e cabelo branco na nuca (aparece por baixo do chapéu, de costas)
  const beard = at(mesh(new THREE.SphereGeometry(0.34, 16, 12, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58), 0xf4f4f4), 0, -0.04, 0.05);
  beard.scale.set(1.04, 1.18, 1.02);
  head.add(beard);
  const mustache = at(mesh(new THREE.CapsuleGeometry(0.055, 0.2, 3, 8), 0xf4f4f4), 0, -0.09, 0.335);
  mustache.rotation.z = Math.PI / 2;
  head.add(mustache);
  hairCap(head, 0xeeeeee, { back: true });

  // Chapéu panamá com fita preta
  const hat = new THREE.Group();
  hat.add(mesh(new THREE.CylinderGeometry(0.58, 0.6, 0.05, 24), 0xe9dcb5));
  hat.add(at(mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.3, 20), 0xe9dcb5), 0, 0.16, 0));
  hat.add(at(mesh(new THREE.CylinderGeometry(0.352, 0.352, 0.08, 20), 0x222222), 0, 0.06, 0));
  const top = at(mesh(new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xe9dcb5), 0, 0.3, 0);
  top.scale.y = 0.25; // topo quase reto, com leve amassado
  hat.add(top);
  hat.position.y = 0.3;
  hat.rotation.x = -0.08;
  head.add(hat);

  // Terno: camisa branca, gravata, lapelas, botões, lenço no bolso e barra do paletó
  body.add(at(flat(mesh(new THREE.BoxGeometry(0.22, 0.36, 0.04), 0xffffff)), 0, 1.24, 0.23));
  body.add(at(flat(mesh(new THREE.BoxGeometry(0.08, 0.34, 0.03), 0x7a0a1a)), 0, 1.2, 0.255));
  for (const s of [-1, 1]) {
    const lapel = at(mesh(new THREE.BoxGeometry(0.1, 0.36, 0.04), 0x9e0c24), s * 0.13, 1.24, 0.235);
    lapel.rotation.z = s * 0.35;
    body.add(lapel);
  }
  for (const y of [0.98, 0.88]) body.add(at(flat(mesh(new THREE.SphereGeometry(0.025, 6, 4), 0x222222)), 0, y, 0.25));
  body.add(at(flat(mesh(new THREE.BoxGeometry(0.1, 0.05, 0.02), 0xffffff)), -0.2, 1.22, 0.24));
  const hem = at(mesh(new THREE.CylinderGeometry(0.33, 0.37, 0.14, 16, 1, true), 0xc8102e), 0, 0.8, 0);
  hem.scale.set(1.05, 1, 0.72);
  body.add(hem);
  for (const arm of [rig.armL, rig.armR]) arm.add(at(flat(mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.05, 10), 0xffffff)), 0, -0.53, 0)); // punho

  return finish(rig);
}

/** Bolsonero: mais novo, sem barba, cabelo curto penteado de lado, camisa amarela, relógio preto. */
function makeBolsonero(): Rig {
  const o: RigOpts = { torso: 0xffd400, pants: 0x1f2a44, skin: 0xf0c8a0, shoes: 0x3a2a1a, brows: 0x2b1d12, width: 0.96, shortSleeves: true };
  const rig = baseRig(o);
  const { head, body } = rig;

  hairCap(head, 0x2b1d12, { top: 0.4, back: true });
  // Topete volumoso penteado para o lado (risca à esquerda)
  const fringe = at(mesh(new THREE.CapsuleGeometry(0.1, 0.38, 4, 10), 0x2b1d12), 0.06, 0.26, 0.2);
  fringe.rotation.z = Math.PI / 2 - 0.3;
  fringe.rotation.y = 0.2;
  head.add(fringe);
  head.add(at(flat(mesh(new THREE.BoxGeometry(0.02, 0.02, 0.3), 0xf0c8a0)), -0.14, 0.34, 0.02)); // risca

  // Camisa amarela com gola e punhos verdes, botões e cinto
  const collar = at(mesh(new THREE.TorusGeometry(0.17, 0.045, 6, 16), 0x0a7d3b), 0, 1.44, 0);
  collar.rotation.x = Math.PI / 2;
  body.add(collar);
  body.add(at(flat(mesh(new THREE.BoxGeometry(0.03, 0.42, 0.02), 0xe6be00)), 0, 1.12, 0.235)); // carcela
  for (const y of [1.25, 1.1, 0.95]) body.add(at(flat(mesh(new THREE.SphereGeometry(0.018, 6, 4), 0xffffff)), 0, y, 0.25));
  const belt = at(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 16), 0x4e342e), 0, 0.76, 0);
  belt.scale.set(0.96, 1, 0.72);
  body.add(belt);
  body.add(at(flat(mesh(new THREE.BoxGeometry(0.08, 0.06, 0.02), 0xc0c0c0)), 0, 0.76, 0.22)); // fivela
  for (const arm of [rig.armL, rig.armR]) {
    const cuff = at(mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.05, 10), 0x0a7d3b), 0, -0.26, 0);
    arm.add(cuff);
  }
  // Relógio preto no pulso esquerdo
  rig.armL.add(at(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 12), 0x111111), 0, -0.53, 0));
  rig.armL.add(at(flat(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 10), 0x37474f)), 0, -0.53, 0.09).rotateX(Math.PI / 2));

  return finish(rig);
}

export function makeRunner(character: Character): Rig {
  return character === 'lule' ? makeLule() : makeBolsonero();
}

/** Perseguidor: apoiador do lado rival. `side` é a cor do lado que persegue. */
export function makeChaser(side: 'verde-amarelo' | 'vermelho', index: number): Rig {
  const greenYellow = index % 2 === 0 ? 0xffd400 : 0x0a9c4a;
  const torso = side === 'vermelho' ? [0xd7192f, 0xa50f22, 0xe53935][index % 3] : greenYellow;
  const hairColor = HAIR[index % HAIR.length];
  const ponytail = index % 3 === 2;
  const rig = baseRig({
    torso,
    pants: [0x1f2a44, 0x3b3b3b, 0x5a4632, 0x1565c0][index % 4],
    skin: SKIN[index % SKIN.length],
    shoes: [0x222222, 0xffffff, 0x8d6e63][index % 3],
    brows: hairColor,
    scale: 0.94 + (index % 3) * 0.05,
    width: [1, 1.12, 0.92, 1.05, 0.98][index % 5],
    belly: index % 4 === 1 ? 1.15 : 1,
    shortSleeves: true,
    shorts: index % 2 === 1,
    mouth: 'open', // gritando
  });
  hairCap(rig.head, hairColor, { top: 0.38, back: !ponytail });
  if (ponytail) {
    hairCap(rig.head, hairColor, { top: 0.5, back: true });
    const tail = at(mesh(new THREE.CapsuleGeometry(0.09, 0.3, 3, 8), hairColor), 0, -0.02, -0.38);
    tail.rotation.x = 0.5;
    rig.head.add(tail);
  }
  if (index % 3 === 1) {
    const capColor = side === 'vermelho' ? 0xffffff : 0x0a9c4a;
    rig.head.add(at(mesh(new THREE.SphereGeometry(0.38, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), capColor), 0, 0.06, -0.01));
    rig.head.add(at(mesh(new THREE.BoxGeometry(0.4, 0.04, 0.3), capColor), 0, 0.12, 0.33));
  }
  if (index % 4 === 2) {
    // Óculos escuros
    for (const s of [-1, 1]) rig.head.add(at(flat(mesh(new THREE.BoxGeometry(0.16, 0.1, 0.03), 0x111111)), s * 0.13, 0.07, 0.34));
    rig.head.add(at(flat(mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), 0x111111)), 0, 0.09, 0.345));
  }
  // Faixa de torcedor nas costas: listra na cor contrária (só cor, sem texto)
  const stripe = side === 'vermelho' ? 0xffffff : greenYellow === 0xffd400 ? 0x0a9c4a : 0xffd400;
  rig.body.add(at(flat(mesh(new THREE.BoxGeometry(0.4, 0.08, 0.02), stripe)), 0, 1.15, -0.245));

  // Bandeira sem texto: só cores e formas.
  if (index % 2 === 0) {
    const flag = new THREE.Group();
    flag.userData.keep = true; // balança com o tecido: fica fora da fusão
    flag.add(at(mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.7, 6), 0x8b5a2b), 0, 0.85, 0));
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 0.66),
      toon(side === 'vermelho' ? 0xe0102a : 0x0a9c4a, { side: THREE.DoubleSide }),
    );
    cloth.position.set(0.52, 1.36, 0);
    cloth.name = 'cloth';
    cloth.userData.noOutline = true; // contorno por casco não funciona em planos (mancha preta)
    flag.add(cloth);
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
  finish(rig);
  const pole = rig.armR.children.find((c) => c.userData.keep);
  if (pole) addOutline(pole.children[0], 0.03);
  return rig;
}

/** Policial cartoon (sem armas visíveis): farda azul, quepe, apito. */
export function makePoliceman(): Rig {
  const rig = baseRig({ torso: 0x1f3c88, pants: 0x14285c, skin: 0xd8a47f, shoes: 0x111111, sleeves: 0x1f3c88, brows: 0x2b1b0e, mouth: 'flat' });
  const cap = at(mesh(new THREE.CylinderGeometry(0.4, 0.34, 0.2, 14), 0x14285c), 0, 0.3, 0);
  const visor = at(mesh(new THREE.BoxGeometry(0.44, 0.04, 0.26), 0x111111), 0, 0.2, 0.3);
  const badge = at(flat(mesh(new THREE.CircleGeometry(0.06, 6), 0xffc107)), 0, 0.32, 0.36);
  rig.head.add(cap, visor, badge);
  const whistle = at(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 6), 0xc0c0c0), 0, -0.14, 0.4);
  whistle.rotation.x = Math.PI / 2;
  rig.head.add(whistle);
  rig.body.add(at(flat(mesh(new THREE.CircleGeometry(0.05, 5), 0xffc107)), -0.16, 1.25, 0.24)); // distintivo
  const belt = at(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 16), 0x111111), 0, 0.76, 0);
  belt.scale.set(1, 1, 0.72);
  rig.body.add(belt);
  return finish(rig);
}

/** Homem bêbado cartoon: camisa aberta, garrafa sem rótulo, nariz vermelho. */
export function makeDrunk(): Rig {
  const rig = baseRig({ torso: 0xf4f1e8, pants: 0x6b5b3e, skin: 0xe8b090, shoes: 0x3d2b1f, sleeves: 0xf4f1e8, belly: 1.2, shortSleeves: true, brows: 0x5a4632 });
  rig.head.add(at(mesh(new THREE.SphereGeometry(0.1, 8, 6), 0xe04848), 0, -0.02, 0.37)); // nariz vermelho
  hairCap(rig.head, 0x5a4632, { top: 0.3 });
  const bottle = new THREE.Group();
  bottle.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 8), 0x2e7d32));
  bottle.add(at(mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.12, 8), 0x2e7d32), 0, 0.2, 0));
  bottle.position.y = -0.75;
  rig.armR.add(bottle);
  return finish(rig);
}

/** Vorcano: banqueiro de terno, cabelo penteado para trás (caricatura, nome de paródia). */
export function makeVorcano(): Rig {
  const rig = baseRig({ torso: 0x2b2b35, pants: 0x2b2b35, skin: 0xf0c8a0, shoes: 0x111111, brows: 0x1a1208 });
  hairCap(rig.head, 0x1a1208, { top: 0.45, back: true });
  rig.body.add(at(flat(mesh(new THREE.BoxGeometry(0.22, 0.36, 0.04), 0xffffff)), 0, 1.24, 0.23));
  rig.body.add(at(flat(mesh(new THREE.BoxGeometry(0.08, 0.34, 0.03), 0x1565c0)), 0, 1.2, 0.255));
  return finish(rig);
}

/** Careca de Toga: juiz careca genérico, toga preta, martelo na mão direita. Sem nome nem traços de alguém real. */
export function makeCareca(): Rig {
  const rig = baseRig({ torso: 0x15151a, pants: 0x15151a, skin: 0xe8b98a, shoes: 0x111111, brows: 0x9e9e9e, mouth: 'flat' });
  // Toga até os pés, gola branca
  rig.body.add(at(mesh(new THREE.CylinderGeometry(0.36, 0.55, 1.0, 14), 0x15151a), 0, 0.62, 0));
  rig.body.add(at(flat(mesh(new THREE.BoxGeometry(0.2, 0.22, 0.05), 0xffffff)), 0, 1.3, 0.22));
  // Careca brilhando: só um tufo de cabelo de cada lado
  for (const x of [-0.3, 0.3]) rig.head.add(at(mesh(new THREE.SphereGeometry(0.11, 8, 6), 0x9e9e9e), x, 0.02, -0.08));
  rig.head.add(at(flat(mesh(new THREE.SphereGeometry(0.06, 8, 6), 0xffffff)), -0.1, 0.32, 0.12));
  const gavel = new THREE.Group();
  gavel.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), 0x6d4c41));
  const hammer = at(mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.3, 10), 0x8d6e63), 0, -0.25, 0);
  hammer.rotation.z = Math.PI / 2;
  gavel.add(hammer);
  gavel.rotation.x = Math.PI / 2;
  gavel.position.set(0, -0.7, 0.22);
  rig.armR.add(gavel);
  return finish(rig);
}

/** Saci (folclore): menino de uma perna só com gorro vermelho. Formas simples, sem cachimbo. */
export function makeSaci(): THREE.Group {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.CapsuleGeometry(0.16, 0.24, 4, 8), 0x5d3a1a), 0, 0.62, 0));
  g.add(at(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.14, 10), 0xb71c1c), 0, 0.42, 0));
  g.add(at(mesh(new THREE.CapsuleGeometry(0.07, 0.3, 3, 6), 0x5d3a1a), 0, 0.2, 0));
  g.add(at(mesh(new THREE.SphereGeometry(0.2, 12, 10), 0x5d3a1a), 0, 0.98, 0));
  const cap = at(mesh(new THREE.ConeGeometry(0.2, 0.4, 12), 0xd50000), 0, 1.22, -0.04);
  cap.rotation.x = -0.4;
  g.add(cap);
  for (const x of [-0.07, 0.07]) g.add(at(flat(mesh(new THREE.SphereGeometry(0.035, 6, 6), 0xffffff)), x, 1.0, 0.18));
  addOutline(g, 0.025);
  return g;
}

/** Cuca (do Sítio do Picapau Amarelo): jacaré de cabelo loiro voando na vassoura. */
export function makeCuca(): THREE.Group {
  const g = new THREE.Group();
  const broom = new THREE.Group();
  const stick = mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), 0x8b5a2b);
  stick.rotation.z = Math.PI / 2;
  const bristles = at(mesh(new THREE.ConeGeometry(0.28, 0.6, 10), 0xd4a33b), -1.4, 0, 0);
  bristles.rotation.z = Math.PI / 2;
  broom.add(stick, bristles);
  g.add(broom);

  const body = at(mesh(new THREE.CapsuleGeometry(0.35, 0.5, 4, 10), 0x4caf50), 0.1, 0.45, 0);
  body.rotation.z = 0.3;
  const dress = at(mesh(new THREE.ConeGeometry(0.5, 0.7, 12), 0x6a1b9a), 0.05, 0.25, 0);
  const head = new THREE.Group();
  head.position.set(0.35, 1.05, 0);
  head.add(mesh(new THREE.SphereGeometry(0.32, 14, 10), 0x4caf50));
  head.add(at(mesh(new THREE.BoxGeometry(0.62, 0.2, 0.34), 0x4caf50), 0.42, -0.08, 0));
  for (const z of [-0.12, 0.12]) head.add(at(mesh(new THREE.SphereGeometry(0.09, 8, 6), 0xffeb3b), 0.12, 0.2, z));
  head.add(at(mesh(new THREE.SphereGeometry(0.36, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), 0xffd54f), -0.08, 0.06, 0));
  head.add(at(mesh(new THREE.SphereGeometry(0.16, 10, 8), 0xffd54f), -0.3, 0.3, 0));
  g.add(body, dress, head);
  addOutline(g, 0.04);
  return g;
}

/** Ciclo de corrida (fase em radianos): pernas e braços alternados, tronco girando e inclinado. */
export function animateRun(rig: Rig, phase: number, amount = 1): void {
  const s = Math.sin(phase) * 0.9 * amount;
  rig.legL.rotation.x = s;
  rig.legR.rotation.x = -s;
  rig.armL.rotation.x = -s * 0.8;
  rig.armR.rotation.x = s * 0.8;
  rig.armL.rotation.z = -0.12 * amount; // braços levemente abertos
  rig.armR.rotation.z = 0.12 * amount;
  rig.body.position.y = Math.abs(Math.cos(phase)) * 0.08 * amount;
  rig.body.rotation.y = Math.sin(phase) * 0.1 * amount;
  rig.body.rotation.x = 0.1 * amount; // inclinado para a frente
  rig.head.rotation.y = -Math.sin(phase) * 0.08 * amount; // a cabeça compensa o giro do tronco
}

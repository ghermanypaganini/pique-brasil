import * as THREE from 'three';
import { BALANCE, laneX } from '../data/balance';
import type { Game } from '../systems/game';
import type { Obstacle, Pickup, PickupKind } from '../systems/types';
import { animateRun, makeChaser, makeRunner, type Rig } from './characters';

const mat = (color: number) => new THREE.MeshLambertMaterial({ color });
const LW = BALANCE.track.laneWidth;

// ── Fábricas de malhas (greybox) ───────────────────────────────────

function box(w: number, h: number, d: number, color: number, y = h / 2, z = d / 2): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(0, y, z);
  return m;
}

function makeObstacleMesh(o: Obstacle): THREE.Object3D {
  const g = new THREE.Group();
  const OB = BALANCE.obstacles;
  switch (o.kind) {
    case 'low': {
      // Cavalete de obra listrado
      for (const x of [-0.8, 0.8]) g.add(box(0.12, OB.low.height, 0.12, 0x555555, OB.low.height / 2, 0.2).translateX(x));
      g.add(box(1.9, 0.22, 0.1, 0xff7a00, OB.low.height - 0.12, 0.2));
      g.add(box(1.9, 0.22, 0.1, 0xffffff, OB.low.height - 0.38, 0.2));
      break;
    }
    case 'high': {
      // Faixa esticada entre dois postes (sem texto)
      for (const x of [-1.0, 1.0]) g.add(box(0.12, OB.high.top, 0.12, 0x666666, OB.high.top / 2, 0.2).translateX(x));
      const h = OB.high.top - OB.high.bottom;
      g.add(box(2.0, h, 0.06, 0x2a6df4, OB.high.bottom + h / 2, 0.2));
      g.add(box(2.0, 0.12, 0.07, 0xffffff, OB.high.bottom + h * 0.5, 0.2));
      break;
    }
    case 'bus': {
      const color = o.length > OB.bus.length ? 0x2e7d32 : 0xf2b705; // teto após rampa: vagão verde
      g.add(box(2.0, o.height - 0.3, o.length, color, 0.3 + (o.height - 0.3) / 2, o.length / 2));
      g.add(box(2.02, 0.5, o.length - 0.6, 0x9fd3ff, o.height - 0.75, o.length / 2)); // janelas
      g.add(box(1.7, 0.6, 0.05, 0x9fd3ff, o.height - 0.9, 0)); // para-brisa
      for (const z of [1.2, o.length - 1.2]) {
        for (const x of [-0.9, 0.9]) {
          const w = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 10), mat(0x222222));
          w.rotation.z = Math.PI / 2;
          w.position.set(x, 0.35, z);
          g.add(w);
        }
      }
      break;
    }
    case 'stand': {
      // Banca de jornal
      g.add(box(1.9, o.height, o.length, 0x1b7f4c));
      g.add(box(2.1, 0.12, o.length + 0.3, 0x14563a, o.height + 0.06, o.length / 2));
      g.add(box(1.5, 0.9, 0.05, 0xf4e04d, 1.2, 0));
      break;
    }
    case 'ramp': {
      const len = Math.hypot(o.length, o.height);
      const slope = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.15, len), mat(0x8d6e63));
      slope.rotation.x = -Math.atan2(o.height, o.length);
      slope.position.set(0, o.height / 2, o.length / 2);
      g.add(slope);
      g.add(box(0.1, o.height / 2, o.length, 0x6d4c41, o.height / 4, o.length / 2).translateX(-1.0));
      g.add(box(0.1, o.height / 2, o.length, 0x6d4c41, o.height / 4, o.length / 2).translateX(1.0));
      break;
    }
    case 'vehicle': {
      // Carro vindo de frente (faróis voltados para o jogador)
      g.add(box(1.8, 0.8, o.length, 0xd32f2f, 0.55, o.length / 2));
      g.add(box(1.6, 0.6, o.length * 0.5, 0xb71c1c, 1.25, o.length * 0.45));
      g.add(box(1.4, 0.45, 0.04, 0x9fd3ff, 1.25, o.length * 0.2));
      for (const x of [-0.6, 0.6]) g.add(box(0.3, 0.18, 0.05, 0xfff59d, 0.7, -0.01).translateX(x));
      break;
    }
    case 'hole': {
      g.add(box(2.0, 0.02, o.length, 0x111111, 0.011, o.length / 2));
      for (const z of [-0.3, o.length + 0.3]) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 8), mat(0xff6d00));
        cone.position.set(-0.85, 0.25, z);
        g.add(cone);
      }
      break;
    }
  }
  return g;
}

function makePickupMesh(kind: PickupKind): THREE.Object3D {
  switch (kind) {
    case 'coin': {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 14), mat(0xffc107));
      m.rotation.x = Math.PI / 2;
      const g = new THREE.Group();
      g.add(m);
      return g;
    }
    case 'bill': {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.38, 0.03), mat(0x43a047)));
      const c = new THREE.Mesh(new THREE.CircleGeometry(0.1, 10), mat(0xc8e6c9));
      c.position.z = 0.02;
      g.add(c);
      return g;
    }
    case 'case': {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.55, 0.25), mat(0x1a1a1a)));
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 12, Math.PI), mat(0xffc107));
      handle.position.y = 0.28;
      g.add(handle);
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.02), mat(0xffc107));
      lock.position.set(0, 0.12, 0.13);
      g.add(lock);
      g.scale.setScalar(1.15);
      return g;
    }
  }
}

/** Libera geometrias e materiais de um objeto removido da cena (senão ficam presos na GPU). */
function disposeTree(root: THREE.Object3D): void {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      const m = o.material as THREE.Material | THREE.Material[];
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m.dispose();
    }
  });
}

/** Pool simples por tipo: reaproveita malhas em vez de criar/destruir (evita travadas de GC). */
class Pool<K extends string> {
  private free = new Map<K, THREE.Object3D[]>();
  constructor(private parent: THREE.Object3D) {}
  get(key: K, make: () => THREE.Object3D): THREE.Object3D {
    const list = this.free.get(key);
    const obj = list?.pop() ?? make();
    obj.visible = true;
    if (!obj.parent) this.parent.add(obj);
    return obj;
  }
  release(key: K, obj: THREE.Object3D) {
    obj.visible = false;
    if (!this.free.has(key)) this.free.set(key, []);
    this.free.get(key)!.push(obj);
  }
}

// ── Cena ───────────────────────────────────────────────────────────

const BUILDING_COLORS = [0xf48fb1, 0xffe082, 0x80deea, 0xa5d6a7, 0xffab91, 0xce93d8, 0xfff59d, 0x90caf9];

export interface RenderSettings {
  reduceShake: boolean;
  active: boolean; // false em pausa/menu: congela animações, tremor e objetos voando
}

export class SceneRenderer {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(70, 9 / 16, 0.1, 220);
  private world = new THREE.Group();

  private runner: Rig | null = null;
  private crowd: Rig[] = [];
  private crowdCloths: (THREE.Object3D | undefined)[] = [];
  private crowdCount = 0;
  private shadow: THREE.Mesh;

  private obstacleMeshes = new Map<number, { kind: string; obj: THREE.Object3D; knockT: number }>();
  private pickupMeshes = new Map<number, { kind: PickupKind; obj: THREE.Object3D }>();
  private obstaclePool: Pool<string>;
  private pickupPool: Pool<PickupKind>;

  private road: THREE.Group;
  private dashes: THREE.Mesh[] = [];
  private buildings: THREE.Mesh[] = [];
  private buildingNextZ = { left: -30, right: -30 };

  private runPhase = 0;
  private time = 0;
  private camPos = new THREE.Vector3(0, 4, -6.5);
  private camTarget = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 70, 170);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8d6e63, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(-4, 10, -3);
    this.scene.add(sun);
    this.scene.add(this.world);

    this.obstaclePool = new Pool(this.world);
    this.pickupPool = new Pool(this.world);

    this.road = this.makeRoad();
    this.world.add(this.road);

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.45, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.world.add(this.shadow);
  }

  private makeRoad(): THREE.Group {
    const g = new THREE.Group();
    const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(LW * 3 + 0.6, 260), mat(0x4a4a4f));
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.position.z = 100;
    g.add(asphalt);
    // Calçadão (faixas claras e escuras alternadas lembram a pedra portuguesa)
    for (const side of [-1, 1]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(4, 260), mat(0xeeeeee));
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(side * (LW * 1.5 + 0.3 + 2), 0.02, 100);
      g.add(walk);
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 260), mat(0xbdbdbd));
      curb.position.set(side * (LW * 1.5 + 0.3), 0.1, 100);
      g.add(curb);
    }
    for (let i = 0; i < 40; i++) {
      for (const x of [-LW / 2, LW / 2]) {
        const d = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 2), mat(0xffffff));
        d.rotation.x = -Math.PI / 2;
        d.position.set(x, 0.01, i * 5);
        this.dashes.push(d);
        this.world.add(d);
      }
    }
    return g;
  }

  setCharacter(game: Game): void {
    if (this.runner) this.removeAndDispose(this.runner.root);
    this.runner = makeRunner(game.character);
    this.world.add(this.runner.root);
    for (const r of this.crowd) this.removeAndDispose(r.root);
    this.crowd = [];
    this.crowdCloths = [];
    this.crowdCount = 0;
    for (const { obj, kind } of this.obstacleMeshes.values()) this.obstaclePool.release(kind, obj);
    for (const { obj, kind } of this.pickupMeshes.values()) this.pickupPool.release(kind, obj);
    this.obstacleMeshes.clear();
    this.pickupMeshes.clear();
    for (const b of this.buildings) this.removeAndDispose(b);
    this.buildings = [];
    this.buildingNextZ = { left: -30, right: -30 };
  }

  private removeAndDispose(obj: THREE.Object3D): void {
    this.world.remove(obj);
    disposeTree(obj);
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private ensureCrowd(game: Game, width: number): void {
    const n = width < BALANCE.crowd.narrowScreenPx ? 4 : 5;
    if (n === this.crowdCount) return;
    for (const r of this.crowd) this.removeAndDispose(r.root);
    const side = game.character === 'lule' ? 'verde-amarelo' : 'vermelho';
    this.crowd = Array.from({ length: n }, (_, i) => makeChaser(side, i));
    for (const r of this.crowd) this.world.add(r.root);
    this.crowdCloths = this.crowd.map((r) => r.root.getObjectByName('cloth'));
    this.crowdCount = n;
  }

  private updateBuildings(z: number): void {
    for (const side of ['left', 'right'] as const) {
      while (this.buildingNextZ[side] < z + 170) {
        const w = 4 + Math.random() * 3;
        const h = 4 + Math.random() * 9;
        const d = 6 + Math.random() * 6;
        const b = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          mat(BUILDING_COLORS[Math.floor(Math.random() * BUILDING_COLORS.length)]),
        );
        const sx = side === 'left' ? -1 : 1;
        b.position.set(sx * (LW * 1.5 + 4.6 + w / 2), h / 2, this.buildingNextZ[side] + d / 2);
        this.world.add(b);
        this.buildings.push(b);
        this.buildingNextZ[side] += d + 0.4;
      }
    }
    if (this.buildings.length && this.buildings[0].position.z < z - 30) {
      this.buildings = this.buildings.filter((b) => {
        if (b.position.z >= z - 30) return true;
        this.removeAndDispose(b);
        return false;
      });
    }
  }

  private syncObstacles(game: Game, frameDt: number): void {
    const seen = new Set<number>();
    for (const o of game.obstacles) {
      seen.add(o.id);
      let entry = this.obstacleMeshes.get(o.id);
      if (!entry) {
        // A malha depende das dimensões (ônibus vs. teto), então só reaproveita se o tamanho bater.
        const key = `${o.kind}:${o.length.toFixed(1)}`;
        entry = { kind: key, obj: this.obstaclePool.get(key, () => makeObstacleMesh(o)), knockT: 0 };
        entry.obj.rotation.set(0, 0, 0);
        this.obstacleMeshes.set(o.id, entry);
      }
      const obj = entry.obj;
      obj.position.set(laneX(o.lane), 0, o.z);
      if (o.knocked) {
        // Sai voando para o lado, estilo desenho animado.
        entry.knockT += frameDt;
        const t = entry.knockT;
        const dir = o.lane === 0 ? -1 : 1;
        obj.position.x += dir * t * 12;
        obj.position.y = t * 8 - t * t * 10;
        obj.rotation.z = dir * t * 4;
      }
    }
    for (const [id, entry] of this.obstacleMeshes) {
      if (!seen.has(id)) {
        this.obstaclePool.release(entry.kind, entry.obj);
        this.obstacleMeshes.delete(id);
      }
    }
  }

  private syncPickups(game: Game): void {
    const seen = new Set<number>();
    const spin = this.time * 4;
    for (const k of game.pickups as Pickup[]) {
      seen.add(k.id);
      let entry = this.pickupMeshes.get(k.id);
      if (!entry) {
        entry = { kind: k.kind, obj: this.pickupPool.get(k.kind, () => makePickupMesh(k.kind)) };
        this.pickupMeshes.set(k.id, entry);
      }
      entry.obj.position.set(laneX(k.lane), k.y + Math.sin(spin + k.z) * 0.08, k.z);
      entry.obj.rotation.y = k.kind === 'coin' ? spin : Math.sin(spin * 0.5 + k.z) * 0.5;
    }
    for (const [id, entry] of this.pickupMeshes) {
      if (!seen.has(id)) {
        this.pickupPool.release(entry.kind, entry.obj);
        this.pickupMeshes.delete(id);
      }
    }
  }

  render(game: Game, frameDt: number, width: number, settings: RenderSettings): void {
    // Fora da corrida (pausa, menu, Continuar) o tempo visual para.
    const dt = settings.active ? frameDt : 0;
    this.time += dt;
    const p = game.player;
    this.ensureCrowd(game, width);
    this.updateBuildings(p.z);
    this.syncObstacles(game, dt);
    this.syncPickups(game);

    // Estrada acompanha o jogador
    this.road.position.z = p.z - 30;
    const dashBase = Math.floor(p.z / 5) * 5 - 20;
    this.dashes.forEach((d, i) => (d.position.z = dashBase + Math.floor(i / 2) * 5));

    // Jogador
    const r = this.runner!;
    const running = game.phase === 'running' && settings.active;
    if (running) this.runPhase += dt * (6 + game.speed * 0.45);
    r.root.position.set(p.x, p.y, p.z);
    r.body.rotation.set(0, 0, 0);
    r.body.position.set(0, 0, 0);
    r.body.scale.set(1, 1, 1);
    if (p.roll > 0) {
      // Rolamento: encolhe e gira para a frente.
      const t = 1 - p.roll / BALANCE.player.rollTime;
      r.body.scale.set(1, 0.5, 1);
      r.body.rotation.x = t * Math.PI * 2;
      r.body.position.y = 0.45;
      animateRun(r, 0, 0);
    } else if (!p.grounded) {
      r.legL.rotation.x = -0.6;
      r.legR.rotation.x = 0.3;
      r.armL.rotation.x = -2.6;
      r.armR.rotation.x = -2.6;
    } else {
      animateRun(r, this.runPhase, running ? 1 : 0);
    }
    if (p.stumble > 0) r.body.rotation.x = p.stumbleKind === 'strong' ? 0.5 : 0.3;
    if (p.laneT < 1) r.body.rotation.z = (laneX(p.lane) - p.x) * -0.15;
    // Pisca durante a invulnerabilidade
    r.root.visible = !(p.invuln > 0 && Math.floor(this.time * 14) % 2 === 0);

    const ground = game.groundHeight;
    this.shadow.position.set(p.x, 0.03 + ground, p.z);
    const s = Math.max(0.4, 1 - (p.y - ground) * 0.2);
    this.shadow.scale.set(s, s, s);

    // Multidão: distância de perseguição -> metros atrás do jogador
    const gap = BALANCE.crowd.minGap + game.chase * BALANCE.crowd.metersPerChase;
    const lunge = game.lungeActive > 0 ? Math.sin(this.time * 10) * 0.4 : 0;
    this.crowd.forEach((c, i) => {
      const spread = this.crowd.length === 4 ? [-1.5, -0.5, 0.5, 1.5][i] : [-2, -1, 0, 1, 2][i];
      const jitter = Math.sin(this.time * 2 + i * 1.7);
      c.root.position.set(spread * LW * 0.7 + jitter * 0.3, 0, p.z - gap - (i % 2) * 0.9 + lunge);
      animateRun(c, this.runPhase * 1.05 + i, running ? 1 : 0.2);
      // Braços esticados quando estão perto
      if (game.chase < 20 && i % 2 === 1) {
        c.armL.rotation.x = -1.4;
        c.armR.rotation.x = -1.4;
      }
      const cloth = this.crowdCloths[i];
      if (cloth) cloth.rotation.y = Math.sin(this.time * 8 + i) * 0.3;
    });

    // Câmera
    const speedT = (game.speed - BALANCE.speed.base) / (BALANCE.speed.max - BALANCE.speed.base);
    const targetFov = 68 + Math.max(0, speedT) * 10 + (p.boost > 0 ? 6 : 0);
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 4);
    this.camera.updateProjectionMatrix();
    const target = this.camTarget.set(p.x * 0.7, 4.1 + p.y * 0.7, p.z - 6.6 - Math.max(0, speedT) * 1.2);
    this.camPos.lerp(target, Math.min(1, dt * 8));
    this.camPos.z = target.z; // nunca atrasa no eixo da corrida
    this.camera.position.copy(this.camPos);
    if (!settings.reduceShake && running) {
      const danger = Math.max(0, 1 - game.chase / 25);
      const shake = danger * 0.12 + (p.stumble > 0 ? 0.15 : 0);
      this.camera.position.x += (Math.random() - 0.5) * shake;
      this.camera.position.y += (Math.random() - 0.5) * shake;
    }
    this.camera.lookAt(p.x * 0.7, 1.2 + p.y * 0.6, p.z + 6);

    this.renderer.render(this.scene, this.camera);
  }

}

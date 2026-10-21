import * as THREE from 'three';
import { BALANCE, laneX } from '../data/balance';
import type { Game } from '../systems/game';
import type { PickupKind } from '../systems/types';
import { isMoney } from '../systems/types';
import { animateRun, makeChaser, makeCuca, makeRunner, makeSaci, type Rig } from './characters';
import { disposeTree } from './materials';
import { makeArmoredTruck, makeObstacleView, makeOfficialCar, makePickupMesh, type ObstacleView } from './props';
import { Scenery } from './scenery';
import { SpeedLines } from './speedlines';

const LW = BALANCE.track.laneWidth;

/** Pool simples por chave: reaproveita objetos em vez de criar/destruir (evita travadas de GC). */
class Pool<T extends { root: THREE.Object3D }> {
  private free = new Map<string, T[]>();
  constructor(private parent: THREE.Object3D) {}
  get(key: string, make: () => T): T {
    const item = this.free.get(key)?.pop() ?? make();
    item.root.visible = true;
    if (!item.root.parent) this.parent.add(item.root);
    return item;
  }
  release(key: string, item: T) {
    item.root.visible = false;
    if (!this.free.has(key)) this.free.set(key, []);
    this.free.get(key)!.push(item);
  }
}

export interface RenderSettings {
  reduceShake: boolean;
  reduceFlashes: boolean; // sem piscar (invulnerabilidade, sirenes)
  active: boolean; // false em pausa/menu: congela animações, tremor e objetos voando
}

interface ObstacleEntry {
  key: string;
  view: ObstacleView;
  knockT: number;
}

interface PickupEntry {
  key: string;
  view: { root: THREE.Object3D };
}

export class SceneRenderer {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(70, 9 / 16, 0.1, 420);
  private world = new THREE.Group();
  private scenery = new Scenery();
  private speedLines = new SpeedLines();

  private runner: Rig | null = null;
  private crowd: Rig[] = [];
  private crowdCloths: (THREE.Object3D | undefined)[] = [];
  private crowdCount = 0;
  private shadow: THREE.Mesh;

  // Efeitos dos power-ups e eventos
  private officialCar = makeOfficialCar();
  private habeasPaper = makePickupMesh('habeas');
  private whirl: THREE.Mesh;
  private saci = makeSaci();
  private truck = makeArmoredTruck();
  private cuca = makeCuca();
  private cucaT = -1; // progresso do voo da Cuca (-1 = escondida)
  private truckZ = 0;

  private obstacles = new Map<number, ObstacleEntry>();
  private pickups = new Map<number, PickupEntry>();
  private obstaclePool: Pool<ObstacleView>;
  private pickupPool: Pool<{ root: THREE.Object3D }>;

  private runPhase = 0;
  private flashes = false; // "reduzir flashes": luzes fixas em vez de piscando
  private time = 0;
  private camPos = new THREE.Vector3(0, 4, -6.5);
  private camTarget = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.background = new THREE.Color(0x8fd3ff);
    this.scene.fog = new THREE.Fog(0x8fd3ff, 80, 200);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb08d6e, 1.5));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.8);
    sun.position.set(-5, 12, -4);
    this.scene.add(sun);
    this.scene.add(this.world);
    this.world.add(this.scenery.root, this.speedLines.root);

    this.obstaclePool = new Pool(this.world);
    this.pickupPool = new Pool(this.world);

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;

    this.whirl = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 0.35, 2.4, 20, 4, true),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.saci.scale.setScalar(0.9);
    this.cuca.scale.setScalar(1.3);
    const fx = [this.officialCar, this.habeasPaper, this.whirl, this.saci, this.truck.root, this.cuca];
    this.world.add(this.shadow, ...fx);
    for (const o of fx) o.visible = false;
  }

  setCharacter(game: Game): void {
    if (this.runner) this.removeAndDispose(this.runner.root);
    this.runner = makeRunner(game.character);
    this.world.add(this.runner.root);
    for (const r of this.crowd) this.removeAndDispose(r.root);
    this.crowd = [];
    this.crowdCloths = [];
    this.crowdCount = 0;
    for (const e of this.obstacles.values()) this.obstaclePool.release(e.key, e.view);
    for (const e of this.pickups.values()) this.pickupPool.release(e.key, e.view);
    this.obstacles.clear();
    this.pickups.clear();
    this.scenery.reset();
    this.speedLines.reset(game.player.z);
    this.cucaT = -1;
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
    for (const r of this.crowd) {
      r.root.scale.multiplyScalar(BALANCE.crowd.scale);
      this.world.add(r.root);
    }
    this.crowdCloths = this.crowd.map((r) => r.root.getObjectByName('cloth'));
    this.crowdCount = n;
  }

  private syncObstacles(game: Game, dt: number): void {
    const seen = new Set<number>();
    for (const o of game.obstacles) {
      seen.add(o.id);
      let e = this.obstacles.get(o.id);
      if (!e) {
        // A malha depende do tipo, da variante e do tamanho; só reaproveita quando tudo bate.
        const key = `${o.kind}:${o.variant}:${o.length.toFixed(1)}`;
        e = { key, view: this.obstaclePool.get(key, () => makeObstacleView(o)), knockT: 0 };
        e.view.root.rotation.set(0, 0, 0);
        this.obstacles.set(o.id, e);
      }
      const root = e.view.root;
      root.position.set(o.x, 0, o.z);
      root.rotation.z = 0;
      // O boneco de Olinda é mais alto que a câmera: some depois que o jogador passa por baixo.
      if (o.variant === 'olinda') root.visible = o.z + o.length > game.player.z - 0.8;

      // Animações próprias
      if (o.kind === 'boi' && e.view.spin) {
        e.view.spin.rotation.y = Math.sin(this.time * 6 + o.id) * 0.5;
        e.view.spin.position.y = Math.abs(Math.sin(this.time * 8)) * 0.15;
      } else if (o.kind === 'high' && o.variant === 'olinda' && e.view.spin) {
        e.view.spin.rotation.z = Math.sin(this.time * 3 + o.id) * 0.25;
        root.rotation.y = Math.sin(this.time * 2 + o.id) * 0.12;
      } else if (o.kind === 'drunk' && e.view.rig) {
        animateRun(e.view.rig, this.time * 5, 0.5);
        e.view.rig.body.rotation.z = Math.sin(this.time * 2.3 + o.id) * 0.25;
      } else if (o.variant === 'police' && e.view.rig) {
        e.view.rig.armR.rotation.x = -1.2 + Math.sin(this.time * 6) * 0.5; // gesticula
        const siren = root.getObjectByName('siren');
        if (siren) siren.visible = this.flashes || Math.floor(this.time * 4) % 2 === 0;
      }

      if (o.knocked) {
        // Sai voando para o lado, estilo desenho animado.
        e.knockT += dt;
        const t = e.knockT;
        const dir = o.x <= 0 ? -1 : 1;
        root.position.x += dir * t * 12;
        root.position.y = t * 8 - t * t * 10;
        root.rotation.z = dir * t * 4;
      }
    }
    for (const [id, e] of this.obstacles) {
      if (!seen.has(id)) {
        this.obstaclePool.release(e.key, e.view);
        this.obstacles.delete(id);
      }
    }
  }

  private syncPickups(game: Game): void {
    const seen = new Set<number>();
    const spin = this.time * 4;
    const p = game.player;
    const magnet = p.powers.saci > 0;
    for (const k of game.pickups) {
      seen.add(k.id);
      let e = this.pickups.get(k.id);
      if (!e) {
        const kind: PickupKind = k.kind;
        e = { key: kind, view: this.pickupPool.get(kind, () => ({ root: makePickupMesh(kind) })) };
        this.pickups.set(k.id, e);
      }
      const obj = e.view.root;
      let x = laneX(k.lane);
      let y = k.y + Math.sin(spin + k.z) * 0.08;
      // Redemoinho do Saci: o dinheiro próximo voa em direção ao jogador.
      if (magnet && isMoney(k.kind)) {
        const d = k.z - p.z;
        if (d < 12 && d > -1) {
          const t = 1 - Math.max(0, d) / 12;
          x += (p.x - x) * t;
          y += (p.y + 1 - y) * t;
        }
      }
      obj.position.set(x, y, k.z);
      obj.rotation.y = k.kind === 'coin' ? spin : Math.sin(spin * 0.5 + k.z) * 0.5;
      const aura = obj.getObjectByName('aura');
      if (aura) {
        aura.rotation.z = spin;
        aura.scale.setScalar(1 + Math.sin(spin * 2) * 0.1);
      }
    }
    for (const [id, e] of this.pickups) {
      if (!seen.has(id)) {
        this.pickupPool.release(e.key, e.view);
        this.pickups.delete(id);
      }
    }
  }

  render(game: Game, frameDt: number, width: number, settings: RenderSettings): void {
    // Fora da corrida (pausa, menu, Continuar) o tempo visual para.
    const dt = settings.active ? frameDt : 0;
    this.flashes = settings.reduceFlashes;
    this.time += dt;
    const p = game.player;
    this.ensureCrowd(game, width);
    this.scenery.update(p.z);
    this.syncObstacles(game, dt);
    this.syncPickups(game);

    // ── Jogador ──
    const r = this.runner!;
    const running = game.phase === 'running' && settings.active;
    if (running) this.runPhase += dt * (6 + game.speed * 0.45);
    const driving = p.powers.immunity > 0;
    r.root.position.set(p.x, p.y, p.z);
    r.body.rotation.set(0, 0, 0);
    r.body.scale.set(1, 1, 1);
    animateRun(r, this.runPhase, running && p.grounded && p.roll === 0 && !driving ? 1 : 0);
    if (p.roll > 0) {
      // Rolamento: encolhe e gira para a frente.
      const t = 1 - p.roll / BALANCE.player.rollTime;
      r.body.scale.set(1, 0.5, 1);
      r.body.rotation.x = t * Math.PI * 2;
      r.body.position.y = 0.45;
    } else if (!p.grounded) {
      r.legL.rotation.x = -0.6;
      r.legR.rotation.x = 0.3;
      r.armL.rotation.x = -2.6;
      r.armR.rotation.x = -2.6;
    }
    if (p.stumble > 0) r.body.rotation.x = p.stumbleKind === 'strong' ? 0.5 : 0.3;
    if (p.laneT < 1) r.body.rotation.z = (laneX(p.lane) - p.x) * -0.15;

    // Imunidade Parlamentar: dentro do carro oficial, acenando pelo teto solar.
    this.officialCar.visible = driving;
    if (driving) {
      this.officialCar.position.set(p.x, 0, p.z);
      this.officialCar.rotation.z = (laneX(p.lane) - p.x) * -0.05;
      r.root.position.y = 0.55;
      r.armL.rotation.x = r.armR.rotation.x = -2.8;
      for (const c of this.officialCar.children) {
        if (c.name === 'siren') c.visible = this.flashes || Math.floor(this.time * 6) % 2 === 0;
      }
    }
    // Pisca durante a invulnerabilidade
    r.root.visible = settings.reduceFlashes || !(p.invuln > 0 && !driving && Math.floor(this.time * 14) % 2 === 0);

    // Habeas Corpus: pergaminho orbitando
    this.habeasPaper.visible = p.powers.habeas;
    if (p.powers.habeas) {
      const a = this.time * 3;
      this.habeasPaper.position.set(p.x + Math.cos(a) * 0.9, p.y + 1.3 + Math.sin(a * 2) * 0.15, p.z + Math.sin(a) * 0.9);
      this.habeasPaper.rotation.y = -a;
    }

    // Redemoinho do Saci: redemoinho em volta + o Saci girando nele
    const saciOn = p.powers.saci > 0;
    this.whirl.visible = this.saci.visible = saciOn;
    if (saciOn) {
      this.whirl.position.set(p.x, p.y + 1.1, p.z);
      this.whirl.rotation.y = this.time * 12;
      const a = this.time * 5;
      this.saci.position.set(p.x + Math.cos(a) * 1.3, p.y + 0.6 + Math.sin(this.time * 9) * 0.2, p.z + Math.sin(a) * 1.3);
      this.saci.rotation.y = -a + Math.PI;
      const ending = !settings.reduceFlashes && p.powers.saci < 2 && Math.floor(this.time * 8) % 2 === 0; // avisa que está acabando
      (this.whirl.material as THREE.MeshBasicMaterial).opacity = ending ? 0.1 : 0.35;
    }

    const ground = game.groundHeight;
    this.shadow.position.set(p.x, 0.03 + ground, p.z);
    const s = Math.max(0.4, 1 - (p.y - ground) * 0.2);
    this.shadow.scale.set(s, s, s);

    this.renderCrowd(game, running);
    this.renderEvents(game, dt);
    this.renderCamera(game, dt, settings, running);
    this.renderer.render(this.scene, this.camera);
  }

  /** Posição horizontal na tela (0 = esquerda, 1 = direita) de um ponto do mundo. Usado nos testes. */
  screenX(x: number, y: number, z: number): number {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return (v.x + 1) / 2;
  }

  private renderCrowd(game: Game, running: boolean): void {
    const p = game.player;
    // Distância de perseguição -> metros atrás do jogador
    const gap = BALANCE.crowd.minGap + game.chase * BALANCE.crowd.metersPerChase;
    const lunge = game.lungeActive > 0 ? Math.sin(this.time * 10) * 0.4 : 0;
    this.crowd.forEach((c, i) => {
      // Agrupados atrás do jogador (a tela em retrato é estreita) e seguindo a faixa dele.
      const spread = this.crowd.length === 4 ? [-1.5, -0.5, 0.5, 1.5][i] : [-2, -1, 0, 1, 2][i];
      const jitter = Math.sin(this.time * 2 + i * 1.7);
      c.root.position.set(p.x * 0.6 + spread * 0.8 + jitter * 0.2, 0, p.z - gap - (i % 2) * 0.7 + lunge);
      animateRun(c, this.runPhase * 1.05 + i, running ? 1 : 0.2);
      // Braços esticados quando estão perto
      if (game.chase < 20 && i % 2 === 1) {
        c.armL.rotation.x = -1.4;
        c.armR.rotation.x = -1.4;
      }
      const cloth = this.crowdCloths[i];
      if (cloth) cloth.rotation.y = Math.sin(this.time * 8 + i) * 0.3;
    });
  }

  private renderEvents(game: Game, dt: number): void {
    const p = game.player;

    // Vorcano: carro-forte passa pela calçada à frente, jogando maletas.
    const vOn = game.vorcanoActive > 0;
    if (vOn && !this.truck.root.visible) this.truckZ = p.z + 20;
    this.truck.root.visible = vOn;
    if (vOn) {
      this.truckZ += (game.speed + 2) * dt; // um pouco mais rápido que o jogador
      this.truck.root.position.set(LW * 1.5 + 2.4, 0.15, this.truckZ);
      this.truck.vorcano.armL.rotation.x = -1.5 + Math.sin(this.time * 10) * 1.2; // arremessa
      this.truck.vorcano.armR.rotation.x = -1.5 + Math.cos(this.time * 10) * 1.2;
    }

    // Cuca: cruza o céu durante o aviso e a investida da multidão.
    const lungeOn = game.lungeWarning > 0 || game.lungeActive > 0;
    if (lungeOn && this.cucaT < 0) this.cucaT = 0;
    if (this.cucaT >= 0) {
      this.cucaT += dt / 5;
      const t = this.cucaT;
      this.cuca.visible = t < 1;
      // Cruza da esquerda para a direita da tela (+x fica à esquerda).
      this.cuca.position.set(13 - t * 26, 7 + Math.sin(t * Math.PI * 3) * 1.0, p.z + 24);
      this.cuca.rotation.y = Math.PI; // voa no sentido do movimento
      this.cuca.rotation.z = Math.sin(this.time * 4) * 0.15;
      if (t >= 1 && !lungeOn) this.cucaT = -1;
    } else {
      this.cuca.visible = false;
    }
  }

  private renderCamera(game: Game, dt: number, settings: RenderSettings, running: boolean): void {
    const p = game.player;
    // Progresso na curva de velocidade (0 na largada, 1 no máximo). Maleta e Imunidade entram
    // só pelos extras abaixo, para não serem contadas duas vezes.
    const speedT = (game.baseSpeed - BALANCE.speed.base) / (BALANCE.speed.max - BALANCE.speed.base);
    const targetFov = 64 + speedT * 14 + (p.boost > 0 ? 6 : 0) + (p.powers.immunity > 0 ? 8 : 0);
    // Linhas de velocidade (desligadas com "reduzir tremor", que é a opção de menos movimento).
    const extra = p.powers.immunity > 0 ? 0.4 : p.boost > 0 ? 0.25 : 0;
    const lines = running && !settings.reduceShake ? Math.min(1, speedT * 1.1 + extra) * p.speedMul : 0;
    this.speedLines.update(p.z, lines);
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 4);
    this.camera.updateProjectionMatrix();
    // Câmera mais alta e mais afastada: mostra o jogador e a multidão logo atrás dele.
    const target = this.camTarget.set(p.x * 0.7, 4.6 + p.y * 0.6, p.z - 9.5 - speedT * 1.2);
    this.camPos.lerp(target, Math.min(1, dt * 8));
    this.camPos.z = target.z; // nunca atrasa no eixo da corrida
    this.camera.position.copy(this.camPos);
    if (!settings.reduceShake && running) {
      const danger = Math.max(0, 1 - game.chase / 25);
      const shake = danger * 0.12 + (p.stumble > 0 ? 0.15 : 0);
      this.camera.position.x += (Math.random() - 0.5) * shake;
      this.camera.position.y += (Math.random() - 0.5) * shake;
    }
    this.camera.lookAt(p.x * 0.7, 1.2 + p.y * 0.6, p.z + 8);
  }
}

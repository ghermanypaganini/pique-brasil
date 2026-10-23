import * as THREE from 'three';

// Partículas simples e baratas: poeira dos passos e da aterrissagem, brilho ao pegar dinheiro,
// estrelinhas no tropeço. Todas numa malha em lote (uma chamada de desenho), cada uma com sua cor;
// em vez de ficarem transparentes aos poucos, encolhem até sumir.

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  size: number;
  life: number;
  maxLife: number;
  grow: number;
  gravity: number;
  spin: number;
}

const COUNT = 60;

export class Particles {
  readonly root: THREE.InstancedMesh;
  private items: Particle[] = [];
  private next = 0;
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();

  constructor() {
    // Facetado, combina com o low-poly. Levemente transparente, igual para todas.
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8, depthWrite: false });
    this.root = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), mat, COUNT);
    this.root.frustumCulled = false;
    this.root.count = 0;
    for (let i = 0; i < COUNT; i++) {
      this.items.push({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), size: 0, life: 0, maxLife: 1, grow: 0, gravity: 0, spin: 0 });
      this.root.setColorAt(i, this.color.setHex(0xffffff));
    }
  }

  emit(
    pos: THREE.Vector3Like,
    count: number,
    opts: { color: number; size: number; speed: number; up?: number; life?: number; grow?: number; gravity?: number },
  ): void {
    for (let i = 0; i < count; i++) {
      const index = this.next;
      const p = this.items[index];
      this.next = (this.next + 1) % COUNT;
      const a = Math.random() * Math.PI * 2;
      p.vel.set(Math.cos(a) * opts.speed * Math.random(), (opts.up ?? 0) * (0.5 + Math.random() * 0.5), Math.sin(a) * opts.speed * Math.random());
      p.pos.set(pos.x, pos.y, pos.z);
      p.size = opts.size * (0.6 + Math.random() * 0.6);
      p.life = p.maxLife = (opts.life ?? 0.5) * (0.7 + Math.random() * 0.6);
      p.grow = opts.grow ?? 1.5;
      p.gravity = opts.gravity ?? 0;
      p.spin = Math.random() * 3;
      this.root.setColorAt(index, this.color.setHex(opts.color));
    }
    if (this.root.instanceColor) this.root.instanceColor.needsUpdate = true;
  }

  update(dt: number): void {
    const d = this.dummy;
    this.items.forEach((p, i) => {
      if (p.life > 0) {
        p.life -= dt;
        p.vel.y -= p.gravity * dt;
        p.pos.addScaledVector(p.vel, dt);
        p.size *= 1 + p.grow * dt;
        p.spin += dt * 4;
      }
      // Encolhe no fim da vida (substitui o esmaecer); vida esgotada = tamanho zero.
      const fade = p.life > 0 ? Math.min(1, (p.life / p.maxLife) * 2) : 0;
      d.position.copy(p.pos);
      d.rotation.set(p.spin, p.spin * 0.7, 0);
      d.scale.setScalar(Math.max(0, p.size * fade));
      d.updateMatrix();
      this.root.setMatrixAt(i, d.matrix);
    });
    this.root.count = COUNT;
    this.root.instanceMatrix.needsUpdate = true;
  }

  clear(): void {
    for (const p of this.items) p.life = 0;
  }
}

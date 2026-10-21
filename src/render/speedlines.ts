import * as THREE from 'three';

// Linhas de velocidade: riscos brancos parados no mundo, ao redor do caminho do jogador.
// Como o jogador passa por eles, parecem voar em direção à câmera; ficam mais visíveis
// e mais compridos conforme a velocidade sobe.

const COUNT = 36;
const AHEAD = 60; // metros à frente do jogador onde os riscos aparecem
const BEHIND = 8; // reciclados quando ficam atrás da câmera

export class SpeedLines {
  readonly root = new THREE.Group();
  private lines: THREE.Mesh[] = [];
  private material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });

  constructor() {
    const geo = new THREE.BoxGeometry(0.035, 0.035, 1);
    for (let i = 0; i < COUNT; i++) {
      const m = new THREE.Mesh(geo, this.material);
      this.place(m, 0, Math.random() * AHEAD);
      this.lines.push(m);
      this.root.add(m);
    }
  }

  /** Espalha num "túnel" ao redor da pista, sem cobrir o centro (onde está o jogador). */
  private place(m: THREE.Mesh, pz: number, dz: number): void {
    const side = Math.random() < 0.5 ? -1 : 1;
    m.position.set(side * (2.5 + Math.random() * 5), 0.6 + Math.random() * 5, pz + dz);
  }

  /** `intensity` 0..1 (0 = parado/lento, 1 = velocidade máxima). */
  update(playerZ: number, intensity: number): void {
    const visible = intensity > 0.05;
    this.root.visible = visible;
    if (!visible) return;
    this.material.opacity = Math.min(0.55, intensity * 0.6);
    const length = 1 + intensity * 5;
    for (const m of this.lines) {
      m.scale.z = length;
      if (m.position.z < playerZ - BEHIND) this.place(m, playerZ, AHEAD * (0.6 + Math.random() * 0.4));
    }
  }
}

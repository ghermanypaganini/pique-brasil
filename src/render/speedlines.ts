import * as THREE from 'three';
import { BALANCE } from '../data/balance';

// Linhas de velocidade: riscos brancos parados no mundo, nas laterais da pista.
// Como o jogador passa por eles, parecem voar em direção à câmera; ficam mais visíveis
// e mais compridos conforme a velocidade sobe.

const COUNT = 36;
const AHEAD = 60; // metros à frente do jogador onde os riscos aparecem
const BEHIND = 8; // reciclados quando ficam atrás da câmera
// Sempre fora da pista (3 faixas + meio metro), para não atravessar o jogador nem os obstáculos.
const INNER = BALANCE.track.laneWidth * 1.5 + 0.5;

export class SpeedLines {
  readonly root = new THREE.Group();
  private lines: THREE.Mesh[] = [];
  private material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });

  constructor() {
    const geo = new THREE.BoxGeometry(0.035, 0.035, 1);
    for (let i = 0; i < COUNT; i++) {
      const m = new THREE.Mesh(geo, this.material);
      this.lines.push(m);
      this.root.add(m);
    }
    this.reset(0);
  }

  private place(m: THREE.Mesh, z: number): void {
    const side = Math.random() < 0.5 ? -1 : 1;
    m.position.set(side * (INNER + Math.random() * 4.5), 0.6 + Math.random() * 5, z);
  }

  /** Espalha todos os riscos à frente da posição dada (início de cada partida). */
  reset(playerZ: number): void {
    for (const m of this.lines) this.place(m, playerZ + Math.random() * AHEAD);
  }

  /** `intensity` 0..1 (0 = parado/lento, 1 = velocidade máxima). */
  update(playerZ: number, intensity: number): void {
    // Recicla mesmo com o efeito escondido, para não reaparecerem todos juntos depois.
    for (const m of this.lines) {
      if (m.position.z < playerZ - BEHIND) this.place(m, playerZ + AHEAD * (0.5 + Math.random() * 0.5));
    }
    const visible = intensity > 0.05;
    this.root.visible = visible;
    if (!visible) return;
    this.material.opacity = Math.min(0.55, intensity * 0.6);
    const length = 1 + intensity * 5;
    for (const m of this.lines) m.scale.z = length;
  }
}

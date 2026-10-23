import * as THREE from 'three';
import { BALANCE } from '../data/balance';

// Linhas de velocidade: riscos brancos parados no mundo, nas laterais da pista.
// Como o jogador passa por eles, parecem voar em direção à câmera; ficam mais visíveis
// e mais compridos conforme a velocidade sobe. Desenhados em lote (uma chamada para todos).

const COUNT = 36;
const AHEAD = 60; // metros à frente do jogador onde os riscos aparecem
const BEHIND = 8; // reciclados quando ficam atrás da câmera
// Sempre fora da pista (3 faixas + meio metro), para não atravessar o jogador nem os obstáculos.
const INNER = BALANCE.track.laneWidth * 1.5 + 0.5;

export class SpeedLines {
  readonly root: THREE.InstancedMesh;
  /** Posições dos riscos (x, y, z), para testes e para reciclar. */
  readonly positions: THREE.Vector3[] = [];
  private material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
  private matrix = new THREE.Matrix4();
  private scale = new THREE.Vector3(1, 1, 1);
  private quat = new THREE.Quaternion();

  constructor() {
    this.root = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 0.035, 1), this.material, COUNT);
    this.root.frustumCulled = false; // os riscos acompanham o jogador; a caixa fixa não serviria
    for (let i = 0; i < COUNT; i++) this.positions.push(new THREE.Vector3());
    this.reset(0);
  }

  private place(v: THREE.Vector3, z: number): void {
    const side = Math.random() < 0.5 ? -1 : 1;
    v.set(side * (INNER + Math.random() * 4.5), 0.6 + Math.random() * 5, z);
  }

  /** Espalha todos os riscos à frente da posição dada (início de cada partida). */
  reset(playerZ: number): void {
    for (const v of this.positions) this.place(v, playerZ + Math.random() * AHEAD);
  }

  /** `intensity` 0..1 (0 = parado/lento, 1 = velocidade máxima). */
  update(playerZ: number, intensity: number): void {
    // Recicla mesmo com o efeito escondido, para não reaparecerem todos juntos depois.
    for (const v of this.positions) {
      if (v.z < playerZ - BEHIND) this.place(v, playerZ + AHEAD * (0.5 + Math.random() * 0.5));
    }
    const visible = intensity > 0.05;
    this.root.visible = visible;
    if (!visible) return;
    this.material.opacity = Math.min(0.55, intensity * 0.6);
    this.scale.z = 1 + intensity * 5;
    this.positions.forEach((v, i) => this.root.setMatrixAt(i, this.matrix.compose(v, this.quat, this.scale)));
    this.root.instanceMatrix.needsUpdate = true;
  }
}

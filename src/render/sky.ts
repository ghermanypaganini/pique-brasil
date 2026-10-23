import * as THREE from 'three';
import { bakeRig } from './materials';

// Céu em degradê (cúpula que acompanha a câmera) com nuvens cartoon ao longe.
// As cores mudam com o cenário: azul forte no Rio, fim de tarde alaranjado em Brasília.

export interface SkyColors {
  top: THREE.Color;
  horizon: THREE.Color;
}

export const SKY_RIO: SkyColors = { top: new THREE.Color(0x3d9df5), horizon: new THREE.Color(0xc4ecff) };
export const SKY_BRASILIA: SkyColors = { top: new THREE.Color(0x6b6fd6), horizon: new THREE.Color(0xffc48a) };

export class Sky {
  readonly root = new THREE.Group();
  /** Cor do horizonte atual (a neblina usa a mesma, para os prédios sumirem no céu). */
  readonly horizon = new THREE.Color();
  private uniforms = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } };
  private clouds = new THREE.Group();

  constructor() {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(390, 24, 12),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform vec3 top;
          uniform vec3 horizon;
          varying vec3 vDir;
          void main() {
            float t = clamp(vDir.y * 2.2, 0.0, 1.0);
            gl_FragColor = vec4(mix(horizon, top, pow(t, 0.7)), 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    );
    dome.renderOrder = -1;
    this.root.add(dome);

    // Nuvens: bolas brancas fundidas, espalhadas ao longe nos dois lados.
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    const ball = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < 9; i++) {
      const cloud = new THREE.Group();
      const n = 4 + (i % 3);
      for (let k = 0; k < n; k++) {
        const puff = new THREE.Mesh(ball, white);
        const s = 3 + ((i * 7 + k * 3) % 4);
        puff.scale.set(s * 1.3, s, s);
        puff.position.set((k - n / 2) * 4.5, Math.sin(k * 1.7) * 1.5, Math.cos(k * 2.3) * 2);
        cloud.add(puff);
      }
      const side = i % 2 ? 1 : -1;
      cloud.position.set(side * (60 + ((i * 37) % 140)), 32 + ((i * 13) % 22), 260 + ((i * 53) % 100));
      this.clouds.add(cloud);
    }
    bakeRig([this.clouds], 0, undefined, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
    this.root.add(this.clouds);
  }

  /** `t`: 0 = Rio, 1 = Brasília. */
  update(camera: THREE.Camera, t: number, time: number): void {
    this.root.position.copy(camera.position);
    this.uniforms.top.value.copy(SKY_RIO.top).lerp(SKY_BRASILIA.top, t);
    this.uniforms.horizon.value.copy(SKY_RIO.horizon).lerp(SKY_BRASILIA.horizon, t);
    this.horizon.copy(this.uniforms.horizon.value);
    this.clouds.position.x = Math.sin(time * 0.02) * 10; // deriva lenta
    this.clouds.position.y = -this.root.position.y; // nuvens na altura do mundo, não da câmera
  }
}

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { toon } from './materials';

// Modelos 3D gerados com IA (Tripo, via Higgsfield) e otimizados com gltf-transform
// (texturas WebP 512 px, malha quantizada): ver public/models/LEIA-ME.md.
// São carregados durante a tela de carregamento; se falhar, o jogo usa os modelos feitos por código.

export type ModelName = 'onibus' | 'taxi' | 'banca' | 'boi' | 'alegorico' | 'quiosque' | 'palmeira';
const NAMES: ModelName[] = ['onibus', 'taxi', 'banca', 'boi', 'alegorico', 'quiosque', 'palmeira'];

/**
 * Giro para a frente do modelo olhar para o jogador (que vem de -z) ou para a pista.
 * Os modelos chegam com tamanho 1 no maior eixo, centralizados na origem.
 */
const FACING: Record<ModelName, number> = {
  onibus: Math.PI / 2, // comprimento em x, frente em +x → comprimento em z, frente em -z
  taxi: Math.PI, // frente em +z → vem de frente para o jogador
  banca: Math.PI, // vitrine para o jogador
  boi: Math.PI,
  alegorico: 0,
  quiosque: 0,
  palmeira: 0,
};

const templates = new Map<ModelName, { group: THREE.Group; size: THREE.Vector3 }>();
let version = 0;

/** Muda quando os modelos terminam de carregar (obstáculos montados antes são refeitos). */
export const modelsVersion = (): number => version;

/** Troca o material PBR pelo toon do jogo (mesmo acabamento dos outros objetos), mantendo a textura. */
function toToon(root: THREE.Object3D): void {
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const src = o.material as THREE.MeshStandardMaterial;
    const mat = toon(0xffffff).clone();
    mat.map = src.map;
    mat.userData.shared = true;
    o.material = mat;
    o.geometry.userData.shared = true; // as cópias compartilham a geometria do modelo
    src.dispose();
  });
}

export async function loadModels(base = './models/'): Promise<void> {
  const loader = new GLTFLoader();
  await Promise.all(
    NAMES.map(async (name) => {
      try {
        const gltf = await loader.loadAsync(`${base}${name}.glb`);
        const model = gltf.scene;
        toToon(model);
        // Gira, apoia no chão (y = 0) e centraliza em x/z.
        const holder = new THREE.Group();
        model.rotation.y = FACING[name];
        holder.add(model);
        const box = new THREE.Box3().setFromObject(holder);
        const center = box.getCenter(new THREE.Vector3());
        model.position.set(-center.x, -box.min.y, -center.z);
        templates.set(name, { group: holder, size: box.getSize(new THREE.Vector3()) });
      } catch {
        // Sem o modelo: quem pedir recebe null e desenha a versão por código.
      }
    }),
  );
  if (templates.size) version++;
}

/**
 * Cópia de um modelo com tamanho em metros [largura x, altura y, comprimento z]; `null` em um eixo
 * mantém a proporção pelo primeiro eixo dado. Retorna null se o modelo não carregou.
 */
export function model(name: ModelName, size: [number | null, number | null, number | null]): THREE.Group | null {
  const t = templates.get(name);
  if (!t) return null;
  const g = t.group.clone();
  g.userData.keep = true; // textura e malha quantizada: nunca entra na fusão de peças (bakeRig)
  const raw = [t.size.x, t.size.y, t.size.z];
  const ratios = size.map((s, i) => (s === null ? null : s / raw[i]));
  const uniform = ratios.find((r) => r !== null) ?? 1;
  g.scale.set(ratios[0] ?? uniform, ratios[1] ?? uniform, ratios[2] ?? uniform);
  return g;
}

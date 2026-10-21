import * as THREE from 'three';
import type { Character } from '../systems/types';
import { makeRunner } from './characters';
import { disposeTree } from './materials';

/**
 * Retratos da tela de seleção, renderizados a partir dos próprios modelos 3D
 * (consistentes com o jogo e sem depender de arte externa). Usa um renderer temporário.
 */
export function renderPortraits(size = 256): Record<Character, string> {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb08d6e, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(2, 4, 5);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0.9, 1.75, 4.2);
  camera.lookAt(0, 1.25, 0);

  const out = {} as Record<Character, string>;
  for (const c of ['lule', 'bolsonero'] as Character[]) {
    const rig = makeRunner(c);
    rig.root.rotation.y = 0.35;
    rig.armR.rotation.x = -2.6; // acenando
    rig.armR.rotation.z = 0.3;
    scene.add(rig.root);
    renderer.render(scene, camera);
    out[c] = canvas.toDataURL('image/png');
    scene.remove(rig.root);
    disposeTree(rig.root);
  }
  renderer.dispose();
  renderer.forceContextLoss();
  return out;
}

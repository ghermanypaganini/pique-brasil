import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { bakeRig, toon } from './materials';

describe('fusão de peças (bakeRig)', () => {
  it('junta as peças coloridas numa malha e deixa de fora as marcadas, texturizadas e animadas', () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), toon(0xff0000)));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.5), toon(0x00ff00)));
    const keep = new THREE.Group();
    keep.userData.keep = true;
    keep.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), toon(0x0000ff)));
    const named = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), toon(0x0000ff));
    named.name = 'cloth';
    g.add(keep, named);

    bakeRig([g], 0.03);
    const merged = g.children.filter((c) => c instanceof THREE.Mesh && !c.name) as THREE.Mesh[];
    expect(merged).toHaveLength(1);
    expect(merged[0].geometry.getAttribute('color')).toBeDefined();
    expect(keep.children).toHaveLength(1);
    expect(g.children).toContain(named);
  });

  it('contorno com normais suavizadas: as quinas da caixa não abrem', () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), toon(0xff0000)));
    bakeRig([g], 0.03);
    const mesh = g.children.find((c) => c instanceof THREE.Mesh) as THREE.Mesh;
    const pos = mesh.geometry.getAttribute('position');
    const on = mesh.geometry.getAttribute('outlineNormal');
    expect(on).toBeDefined();
    // Todos os vértices no mesmo canto empurram o contorno na mesma direção.
    const byCorner = new Map<string, string>();
    for (let i = 0; i < pos.count; i++) {
      const key = `${pos.getX(i)},${pos.getY(i)},${pos.getZ(i)}`;
      const dir = `${on.getX(i).toFixed(3)},${on.getY(i).toFixed(3)},${on.getZ(i).toFixed(3)}`;
      if (byCorner.has(key)) expect(byCorner.get(key)).toBe(dir);
      byCorner.set(key, dir);
    }
    expect(byCorner.size).toBe(8);
  });
});

import { BackSide, BufferAttribute, Color, Mesh, MeshBasicMaterial, type BufferGeometry } from 'three';
import type { OutlineSettings } from './settings';

/**
 * Outline as a back-face shell: a second copy of the mesh, drawn inside out and pushed outward.
 *
 * Two things make it hold up on generated meshes:
 * - Normals are averaged per position first, so the shell does not crack along texture seams.
 * - The shell is slid away from the camera by a bit more than its width. Generated meshes often
 *   carry a second inner skin; without the slide that skin stripes the walls.
 * Width is applied in view space, so it is a world length regardless of how the model is scaled.
 */
export class OutlineShellFactory {
  private readonly prepared = new WeakSet<BufferGeometry>();
  private readonly width: number;
  private readonly push: number;

  constructor(private readonly settings: OutlineSettings, characterHeight: number) {
    this.width = settings.width * characterHeight;
    this.push = this.width * settings.pushFactor;
  }

  /** One material per building, so each building can fade on its own. */
  createMaterial(): MeshBasicMaterial {
    const material = new MeshBasicMaterial({ color: new Color(this.settings.color), side: BackSide });
    const width = { value: this.width }, push = { value: this.push };
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uOutlineWidth = width;
      shader.uniforms.uOutlinePush = push;
      shader.vertexShader = 'attribute vec3 outlineNormal;\nuniform float uOutlineWidth;\nuniform float uOutlinePush;\n' +
        shader.vertexShader.replace('#include <project_vertex>', /* glsl */ `#include <project_vertex>
  vec3 outlineDir = normalize( normalMatrix * outlineNormal );
  vec3 outlineAway = isOrthographic ? vec3( 0.0, 0.0, -1.0 ) : normalize( mvPosition.xyz );
  mvPosition.xyz += outlineDir * uOutlineWidth + outlineAway * uOutlinePush;
  gl_Position = projectionMatrix * mvPosition;`);
    };
    material.customProgramCacheKey = () => 'nocturne-outline';
    return material;
  }

  createShell(mesh: Mesh, material: MeshBasicMaterial): Mesh {
    this.prepare(mesh.geometry);
    const shell = new Mesh(mesh.geometry, material);
    shell.name = 'cartoon-outline';
    shell.raycast = () => {};
    return shell;
  }

  private prepare(geometry: BufferGeometry): void {
    if (this.prepared.has(geometry)) return;
    this.prepared.add(geometry);
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    const pos = geometry.attributes.position, nor = geometry.attributes.normal, n = pos.count;
    const ids = new Uint32Array(n), seen = new Map<string, number>(), sum: number[] = [];
    for (let i = 0; i < n; i++) {
      const key = `${Math.round(pos.getX(i) * 2e4)}_${Math.round(pos.getY(i) * 2e4)}_${Math.round(pos.getZ(i) * 2e4)}`;
      let id = seen.get(key);
      if (id === undefined) { id = sum.length / 3; seen.set(key, id); sum.push(0, 0, 0); }
      ids[i] = id;
      sum[id * 3] += nor.getX(i); sum[id * 3 + 1] += nor.getY(i); sum[id * 3 + 2] += nor.getZ(i);
    }
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const k = ids[i] * 3, len = Math.hypot(sum[k], sum[k + 1], sum[k + 2]) || 1;
      out[i * 3] = sum[k] / len; out[i * 3 + 1] = sum[k + 1] / len; out[i * 3 + 2] = sum[k + 2] / len;
    }
    geometry.setAttribute('outlineNormal', new BufferAttribute(out, 3));
  }
}

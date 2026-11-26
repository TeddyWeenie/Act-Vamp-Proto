import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, type Texture } from 'three';
import type { LightSettings } from './settings';

export type ShadowShape = 'round' | 'box';

/**
 * Soft ground shadows drawn as flat textured quads: a round one under characters, a soft box
 * under buildings. They cost almost nothing and are what ties a painted sprite to a 3D floor.
 */
export class BlobShadowFactory {
  private readonly textures = new Map<ShadowShape, Texture>();
  private readonly geometry = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

  constructor(private readonly settings: LightSettings) {}

  /** A shadow lying on the ground plane (XZ), `width` across and `depth` deep in world units. */
  create(shape: ShadowShape, width: number, depth: number): Mesh {
    const material = new MeshBasicMaterial({ map: this.texture(shape), transparent: true, depthWrite: false });
    const shadow = new Mesh(this.geometry, material);
    shadow.name = 'cartoon-shadow';
    shadow.scale.set(width, 1, depth);
    shadow.renderOrder = 1;
    shadow.raycast = () => {};
    return shadow;
  }

  dispose(): void {
    for (const t of this.textures.values()) t.dispose();
    this.textures.clear();
    this.geometry.dispose();
  }

  private texture(shape: ShadowShape): Texture {
    let texture = this.textures.get(shape);
    if (!texture) {
      texture = new CanvasTexture(this.draw(shape));
      this.textures.set(shape, texture);
    }
    return texture;
  }

  private draw(shape: ShadowShape): HTMLCanvasElement {
    const size = 128, canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const c = this.settings.shadowColor, a = this.settings.shadowOpacity;
    const rgba = (alpha: number) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${alpha.toFixed(3)})`;
    if (shape === 'round') {
      const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0, rgba(a)); g.addColorStop(0.55, rgba(a * 0.68)); g.addColorStop(1, rgba(0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    } else {
      ctx.filter = 'blur(12px)';
      ctx.fillStyle = rgba(a * 0.8);
      ctx.fillRect(30, 30, size - 60, size - 60);
    }
    return canvas;
  }
}

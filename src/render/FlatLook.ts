import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  type Material,
  type Object3D,
  type Texture,
} from 'three';
import { BaseLook, ORDER, type BuildingSkin, type GroundArea } from './look';

const SHADOW_COLOR = '12,8,20';

/** 조명 없이 텍스처 색을 그대로 쓰는 건물의 겉모습. */
class FlatSkin implements BuildingSkin {
  constructor(private readonly materials: readonly Material[]) {}

  setOpacity(opacity: number): void {
    const faded = opacity < 1;
    for (const material of this.materials) {
      if (material.transparent !== faded) {
        material.transparent = faded;
        material.depthWrite = !faded;
        material.needsUpdate = true;
      }
      material.opacity = opacity;
    }
  }
}

/** 꾸밈 없는 화면: 조명과 후처리 없이 텍스처 색을 그대로 보여 준다. 비교와 저사양용. */
export class FlatLook extends BaseLook {
  // 그림자 그림과 평면은 처음 쓸 때 한 번만 만들어 모든 물체가 함께 쓴다.
  private readonly plane = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private blobTexture: Texture | null = null;
  private contactTexture: Texture | null = null;

  footShadow(characterHeight: number): Object3D {
    this.blobTexture ??= FlatLook.paint((ctx, size) => {
      const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, `rgba(${SHADOW_COLOR},0.9)`);
      gradient.addColorStop(0.55, `rgba(${SHADOW_COLOR},0.55)`);
      gradient.addColorStop(1, `rgba(${SHADOW_COLOR},0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    });
    const shadow = this.shadow(this.blobTexture, 0.6);
    shadow.scale.set(characterHeight * 0.62, 1, characterHeight * 0.62);
    shadow.position.y = 0.02;
    return shadow;
  }

  dress(model: Object3D): BuildingSkin {
    const materials: Material[] = [];
    model.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      const map = (node.material as { map?: Texture | null }).map ?? null;
      const material = new MeshBasicMaterial({ map, color: map ? 0xffffff : 0xb9ad9a });
      node.material = material;
      materials.push(material);
    });
    return new FlatSkin(materials);
  }

  groundShadow(area: GroundArea): Object3D {
    this.contactTexture ??= FlatLook.paint((ctx, size) => {
      const inset = size * 0.2;
      ctx.filter = `blur(${size * 0.07}px)`;
      ctx.fillStyle = `rgba(${SHADOW_COLOR},0.85)`;
      ctx.fillRect(inset, inset, size - inset * 2, size - inset * 2);
    });
    const shadow = this.shadow(this.contactTexture, 0.55);
    shadow.scale.set(area.width * 1.45, 1, area.depth * 1.45);
    shadow.position.set(area.x, 0.015, area.z);
    return shadow;
  }

  private shadow(map: Texture, opacity: number): Mesh {
    const material = new MeshBasicMaterial({ map, transparent: true, depthWrite: false, opacity });
    const mesh = new Mesh(this.plane, material);
    mesh.renderOrder = ORDER.shadow;
    return mesh;
  }

  private static paint(draw: (ctx: CanvasRenderingContext2D, size: number) => void, size = 128): Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    draw(canvas.getContext('2d')!, size);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }
}

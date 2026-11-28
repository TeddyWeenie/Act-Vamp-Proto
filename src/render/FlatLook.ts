import {
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  type Material,
  type Object3D,
  type Texture,
} from 'three';
import { castShadowOutline } from '../game/logic/shadow';
import { BaseLook, FadingSkin, ORDER, type BuildingSkin, type GroundArea } from './look';

/** 그림자 색. 캐릭터 그림의 선과 같은 어두운 자주색 계열이라 선과 그림자가 한 색으로 묶인다. */
const SHADOW_COLOR = '21,9,16';
const SHADOW_HEX = 0x150910;

/** 꾸밈 없는 화면: 조명과 후처리 없이 텍스처 색을 그대로 보여 준다. 비교와 저사양용. */
export class FlatLook extends BaseLook {
  // 그림자 그림과 평면은 처음 쓸 때 한 번만 만들어 모든 캐릭터가 함께 쓴다.
  private readonly plane = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private blobTexture: Texture | null = null;

  /** 가장자리가 또렷한 진한 타원. 평평한 색으로 그린 캐릭터를 땅에 붙여 준다. */
  footShadow(characterHeight: number): Object3D {
    this.blobTexture ??= FlatLook.paint((ctx, size) => {
      const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, `rgba(${SHADOW_COLOR},1)`);
      gradient.addColorStop(0.8, `rgba(${SHADOW_COLOR},1)`);
      gradient.addColorStop(0.92, `rgba(${SHADOW_COLOR},0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    });
    const shadow = new Mesh(this.plane, this.shadowMaterial(0.7, this.blobTexture));
    shadow.renderOrder = ORDER.shadow;
    shadow.scale.set(characterHeight * 0.5, 1, characterHeight * 0.36);
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
    return new FadingSkin(materials);
  }

  /** 건물이 땅에 드리우는 평평한 그림자. 빛 반대쪽으로 건물 높이만큼 뻗는다. */
  groundShadow(area: GroundArea): Object3D {
    const outline = castShadowOutline(area);
    const positions: number[] = [];
    // 볼록한 도형이라 첫 꼭짓점에서 부채꼴로 삼각형을 나누면 된다.
    for (let i = 1; i < outline.length - 1; i++) {
      for (const point of [outline[0]!, outline[i + 1]!, outline[i]!]) positions.push(point.x, 0, point.z);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const shadow = new Mesh(geometry, this.shadowMaterial(0.42));
    shadow.renderOrder = ORDER.shadow;
    shadow.position.y = 0.015;
    return shadow;
  }

  private shadowMaterial(opacity: number, map: Texture | null = null): MeshBasicMaterial {
    return new MeshBasicMaterial({
      map,
      color: map ? 0xffffff : SHADOW_HEX,
      transparent: true,
      depthWrite: false,
      opacity,
    });
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

import { Mesh, type Material, type Object3D, type Texture } from 'three';
import type { ColorLut } from './ColorLut';

/** 불러온 모델을 화면 느낌에 맞게 손보는 약속. 화면에 배치하기 전에 한 번 부른다. */
export interface ModelTreatment {
  apply(model: Object3D): void;
}

/** 모델을 그대로 둔다. */
export class NoTreatment implements ModelTreatment {
  apply(): void {}
}

/**
 * 모델의 텍스처 색을 표(ColorLut)대로 다시 칠한다. 형태와 무늬는 그대로 두고 색 계열만 옮긴다.
 * 같은 모델 파일의 복제본은 텍스처를 함께 쓰므로 한 번만 칠한다.
 */
export class TextureRepaint implements ModelTreatment {
  private readonly painted = new WeakSet<Texture>();

  constructor(private readonly lut: ColorLut) {}

  apply(model: Object3D): void {
    model.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      const materials: Material[] = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) {
        const map = (material as Material & { map?: Texture | null }).map;
        if (map && !this.painted.has(map)) this.paint(map);
      }
    });
  }

  private paint(map: Texture): void {
    this.painted.add(map);
    const image = map.image as CanvasImageSource & { width: number; height: number };
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    this.lut.repaint(pixels.data);
    context.putImageData(pixels, 0, 0);
    map.image = canvas;
    map.needsUpdate = true;
  }
}

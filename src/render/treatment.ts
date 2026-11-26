import type { Texture } from 'three';
import { CelColors, type CelTone } from './celPalette';
import { ColorLut } from './ColorLut';
import { samplePixels, softenPixels, type PixelGrid } from './pixelMath';

/** 텍스처 한 장의 화소를 그 자리에서 다시 칠하는 약속. */
export interface TexturePainter {
  paint(image: PixelGrid): void;
}

/** 표본으로 삼을 화소 수의 상한. 대표색을 고르는 데는 이 정도면 충분하다. */
const SAMPLE_LIMIT = 6000;

/**
 * 캐릭터 그림처럼 칠한다: 붓 자국을 펴고, 색을 몇 개의 평평한 색면으로 모으고, 밝기와 선명함을 캐릭터 그림에 맞춘다.
 * 대표색은 텍스처마다 그 텍스처에서 고르므로 건물이 달라져도 따로 손볼 것이 없다.
 */
export class CelPainter implements TexturePainter {
  constructor(
    private readonly tone: CelTone,
    /** 색을 모으기 전에 펴는 반지름(화소). 0이면 펴지 않는다. */
    private readonly soften = 1,
  ) {}

  paint(image: PixelGrid): void {
    softenPixels(image, this.soften);
    const colors = CelColors.fromSamples(samplePixels(image, SAMPLE_LIMIT), this.tone);
    new ColorLut(colors).repaint(image.data);
  }
}

/** 불러온 텍스처를 화면 느낌에 맞게 손보는 약속. 건물 텍스처든 바닥 텍스처든 같은 약속으로 다룬다. */
export interface TextureTreatment {
  apply(texture: Texture): void;
}

/** 텍스처를 그대로 둔다. */
export class NoTreatment implements TextureTreatment {
  apply(): void {}
}

/**
 * 텍스처를 캔버스로 옮겨 화가(TexturePainter)에게 다시 칠하게 한다.
 * 같은 모델 파일의 복제본은 텍스처를 함께 쓰므로 한 번 칠한 텍스처는 건너뛴다.
 */
export class CanvasRepaint implements TextureTreatment {
  private readonly painted = new WeakSet<Texture>();

  constructor(private readonly painter: TexturePainter) {}

  apply(texture: Texture): void {
    if (this.painted.has(texture)) return;
    this.painted.add(texture);
    const image = texture.image as CanvasImageSource & { width: number; height: number };
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    this.painter.paint(pixels);
    context.putImageData(pixels, 0, 0);
    texture.image = canvas;
    texture.needsUpdate = true;
  }
}

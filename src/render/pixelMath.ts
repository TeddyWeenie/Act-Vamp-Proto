import type { Srgb } from './colorMath';

/** 화소 격자(RGBA 8비트). 캔버스의 ImageData가 이 모양이다. */
export interface PixelGrid {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

/** 이보다 어두운 화소(R+G+B)는 텍스처의 빈 틈으로 본다. 색을 고르거나 고르게 펼 때 빼놓는다. */
const GAP_LEVEL = 30;

const isGap = (data: Uint8ClampedArray, at: number) => data[at] + data[at + 1] + data[at + 2] < GAP_LEVEL;

/**
 * 화소를 고르게 건너뛰며 표본 색을 뽑는다. 빈 틈은 뺀다.
 * 간격을 홀수로 잡아, 가로 길이가 짝수인 그림에서도 세로줄 하나만 뽑히는 일이 없게 한다.
 */
export function samplePixels(image: PixelGrid, limit: number): Srgb[] {
  const { data } = image;
  const count = data.length / 4;
  const stride = Math.max(1, Math.floor(count / limit)) | 1;
  const samples: Srgb[] = [];
  for (let i = 0; i < count; i += stride) {
    const at = i * 4;
    if (isGap(data, at)) continue;
    samples.push([data[at] / 255, data[at + 1] / 255, data[at + 2] / 255]);
  }
  return samples;
}

/**
 * 붓 자국과 얼룩을 편다: 각 화소를 둘레(반지름 radius) 화소의 평균으로 바꾼다.
 * 빈 틈의 검은색이 가장자리로 번지지 않도록 빈 틈은 평균에서 빼고, 빈 틈 자신은 그대로 둔다.
 */
export function softenPixels(image: PixelGrid, radius: number): void {
  if (radius < 1) return;
  const { data, width, height } = image;
  const source = new Uint8ClampedArray(data);
  const pass = (
    from: Uint8ClampedArray,
    to: Uint8ClampedArray,
    length: number,
    lines: number,
    step: number,
    lineStep: number,
  ) => {
    for (let line = 0; line < lines; line++) {
      const start = line * lineStep;
      for (let i = 0; i < length; i++) {
        const at = start + i * step;
        if (isGap(source, at)) continue;
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let k = Math.max(0, i - radius); k <= Math.min(length - 1, i + radius); k++) {
          const near = start + k * step;
          if (isGap(source, near)) continue;
          r += from[near];
          g += from[near + 1];
          b += from[near + 2];
          n++;
        }
        to[at] = r / n;
        to[at + 1] = g / n;
        to[at + 2] = b / n;
      }
    }
  };
  const across = new Uint8ClampedArray(data);
  pass(source, across, width, height, 4, width * 4);
  pass(across, data, height, width, width * 4, 4);
}

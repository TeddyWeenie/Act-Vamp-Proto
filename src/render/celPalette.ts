import { fromOklab, toOklab, type ColorMap, type Oklab, type Srgb } from './colorMath';

/** 캐릭터 그림의 채색 방식을 숫자로 적은 것. 건물 텍스처를 이 값에 맞춰 다시 칠한다. */
export interface CelTone {
  /** 텍스처 한 장에 쓸 색의 수. 색마다 평평한 면 하나가 된다. */
  readonly colors: number;
  /** 밝은 면이 닿아야 하는 밝기(Oklab L). 텍스처의 밝은 쪽(상위 10%)을 여기에 맞춘다. */
  readonly lightLevel: number;
  /** 어두운 텍스처를 밝힐 때의 한도(배). */
  readonly maxLightGain: number;
  /** 색의 선명함(채도)에 곱하는 값. */
  readonly chromaGain: number;
  /** 색을 묶을 때 밝기 차이를 얼마나 따질지(0~1). 낮추면 같은 색의 밝은 곳과 그늘이 한 색으로 묶인다. */
  readonly lightnessWeight: number;
}

const ROUNDS = 16;
const BRIGHTEST = 0.97;

function distance(a: Oklab, b: Oklab, lightnessWeight: number): number {
  const dl = (a[0] - b[0]) * lightnessWeight;
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return dl * dl + da * da + db * db;
}

function nearestIndex(color: Oklab, palette: readonly Oklab[], lightnessWeight: number): number {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const d = distance(color, palette[i], lightnessWeight);
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  }
  return best;
}

/**
 * 표본 색에서 대표색을 고른다(k-평균). 시작 색을 "지금까지 고른 색에서 가장 먼 색" 순서로 잡아
 * 같은 표본이면 언제나 같은 결과가 나오고, 좁은 면적의 색(창문 불빛, 꽃)도 빠지지 않는다.
 */
export function pickPalette(samples: readonly Oklab[], count: number, lightnessWeight: number): Oklab[] {
  if (samples.length === 0) return [];
  const palette: Oklab[] = [samples[0]];
  const farthest = samples.map((sample) => distance(sample, samples[0], lightnessWeight));
  while (palette.length < Math.min(count, samples.length)) {
    let pick = 0;
    for (let i = 1; i < samples.length; i++) if (farthest[i] > farthest[pick]) pick = i;
    if (farthest[pick] === 0) break;
    palette.push(samples[pick]);
    for (let i = 0; i < samples.length; i++) {
      farthest[i] = Math.min(farthest[i], distance(samples[i], samples[pick], lightnessWeight));
    }
  }

  for (let round = 0; round < ROUNDS; round++) {
    const sums = palette.map(() => [0, 0, 0, 0]);
    for (const sample of samples) {
      const sum = sums[nearestIndex(sample, palette, lightnessWeight)];
      sum[0] += sample[0];
      sum[1] += sample[1];
      sum[2] += sample[2];
      sum[3] += 1;
    }
    sums.forEach(([l, a, b, n], i) => {
      if (n > 0) palette[i] = [l / n, a / n, b / n];
    });
  }
  return palette;
}

/** 표본 밝기의 상위 10% 지점. */
function lightEnd(samples: readonly Oklab[]): number {
  const sorted = samples.map((sample) => sample[0]).sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))];
}

/**
 * 색을 몇 개의 평평한 색면으로 모은다. 가까운 대표색을 찾아, 그 대표색을 캐릭터 그림의 밝기와 선명함에 맞춘 색으로 바꾼다.
 * 색상은 텍스처의 것을 그대로 쓰므로 지붕은 지붕 색, 벽은 벽 색으로 남는다.
 */
export class CelColors implements ColorMap {
  private readonly painted: readonly Srgb[];

  constructor(
    private readonly palette: readonly Oklab[],
    private readonly tone: CelTone,
    lightGain: number,
  ) {
    this.painted = palette.map(([l, a, b]) =>
      fromOklab([Math.min(l * lightGain, BRIGHTEST), a * tone.chromaGain, b * tone.chromaGain]),
    );
  }

  /** 텍스처의 표본 색으로 대표색과 밝히는 정도를 정한다. */
  static fromSamples(samples: readonly Srgb[], tone: CelTone): CelColors {
    const labs = samples.map(toOklab);
    const palette = pickPalette(labs, tone.colors, tone.lightnessWeight);
    const gain = labs.length > 0 ? tone.lightLevel / Math.max(lightEnd(labs), 1e-3) : 1;
    return new CelColors(palette, tone, Math.min(Math.max(gain, 1), tone.maxLightGain));
  }

  /** 다시 칠할 때 쓰는 색들. */
  get colors(): readonly Srgb[] {
    return this.painted;
  }

  map(color: Srgb): Srgb {
    if (this.palette.length === 0) return color;
    return this.painted[nearestIndex(toOklab(color), this.palette, this.tone.lightnessWeight)];
  }
}

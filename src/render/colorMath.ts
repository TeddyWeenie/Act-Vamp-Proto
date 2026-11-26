/** sRGB 색 한 점. 각 값은 0~1. */
export type Srgb = readonly [number, number, number];
/** Oklab 색 한 점: [밝기, 초록↔빨강, 파랑↔노랑]. 눈에 보이는 색 차이와 숫자 차이가 비슷하다. */
export type Oklab = readonly [number, number, number];

/** 색 하나를 다른 색으로 옮기는 약속. 텍스처를 칠하는 쪽은 이 약속만 안다. */
export interface ColorMap {
  map(color: Srgb): Srgb;
}

export function hexToSrgb(hex: number): Srgb {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toDisplay = (c: number) => {
  const v = Math.min(1, Math.max(0, c));
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
};

export function toOklab([red, green, blue]: Srgb): Oklab {
  const r = toLinear(red);
  const g = toLinear(green);
  const b = toLinear(blue);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function fromOklab([lightness, a, b]: Oklab): Srgb {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    toDisplay(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toDisplay(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toDisplay(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/** 색 계열 하나를 옮기는 짝: from 근처의 색을 to 쪽으로 같은 만큼 민다. sRGB 16진수로 적는다. */
export interface ColorSwap {
  readonly from: number;
  readonly to: number;
}

export interface SwapOptions {
  /** from에서 이만큼(Oklab 거리) 떨어지면 영향이 약 60%로 줄어든다. 작을수록 딱 그 색만 옮긴다. */
  readonly reach: number;
  /** 밝기 차이를 얼마나 따질지(0~1). 낮추면 같은 색의 밝은 곳과 그늘이 함께 옮겨진다. */
  readonly lightnessWeight: number;
}

/** 여러 짝에 걸친 색에서 가까운 짝의 발언권을 키우는 지수. */
const SHARPNESS = 4;

interface Anchor {
  readonly from: Oklab;
  readonly shift: Oklab;
}

/**
 * 색 계열을 통째로 옮긴다. 각 색은 가장 가까운 짝의 이동량(to − from)을 가까운 만큼 받고,
 * 어느 짝과도 먼 색은 그대로 남는다. 색을 to로 덮어쓰지 않고 밀기만 하므로 텍스처의 무늬와 명암이 살아 있다.
 */
export class PaletteSwap implements ColorMap {
  private readonly anchors: readonly Anchor[];

  constructor(
    swaps: readonly ColorSwap[],
    private readonly options: SwapOptions,
  ) {
    this.anchors = swaps.map(({ from, to }) => {
      const start = toOklab(hexToSrgb(from));
      const end = toOklab(hexToSrgb(to));
      return { from: start, shift: [end[0] - start[0], end[1] - start[1], end[2] - start[2]] };
    });
  }

  map(color: Srgb): Srgb {
    const lab = toOklab(color);
    const { reach, lightnessWeight } = this.options;
    let nearest = 0;
    let total = 0;
    let lightness = 0;
    let a = 0;
    let b = 0;
    for (const { from, shift } of this.anchors) {
      const dl = (lab[0] - from[0]) * lightnessWeight;
      const da = lab[1] - from[1];
      const db = lab[2] - from[2];
      const closeness = Math.exp(-(dl * dl + da * da + db * db) / (2 * reach * reach));
      // 방향은 가장 가까운 짝이 거의 정하도록 가까움을 거듭제곱해 섞는다. 이웃한 계열의 색이 번지지 않는다.
      const say = closeness ** SHARPNESS;
      nearest = Math.max(nearest, closeness);
      total += say;
      lightness += say * shift[0];
      a += say * shift[1];
      b += say * shift[2];
    }
    if (total < 1e-12) return color;
    // 얼마나 밀지는 가장 가까운 짝과의 가까움이 정한다. 어느 짝과도 멀면 거의 그대로다.
    const amount = nearest / total;
    return fromOklab([lab[0] + lightness * amount, lab[1] + a * amount, lab[2] + b * amount]);
  }
}

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

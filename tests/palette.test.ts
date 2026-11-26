import { describe, expect, it } from 'vitest';
import { CelColors, pickPalette, type CelTone } from '../src/render/celPalette';
import { ColorLut } from '../src/render/ColorLut';
import { fromOklab, hexToSrgb, toOklab, type ColorMap, type Oklab, type Srgb } from '../src/render/colorMath';
import { samplePixels, softenPixels, type PixelGrid } from '../src/render/pixelMath';

const near = (actual: readonly number[], expected: readonly number[], digits = 2) =>
  actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i], digits));

const grid = (width: number, height: number, rgba: number[]): PixelGrid => ({
  data: new Uint8ClampedArray(rgba),
  width,
  height,
});

const PLAIN: CelTone = { colors: 2, lightLevel: 0.9, maxLightGain: 1, chromaGain: 1, lightnessWeight: 0.5 };
const CREAM = hexToSrgb(0xe6c9b0);
const CREAM_SHADE = hexToSrgb(0xdcbfa4);
const SLATE = hexToSrgb(0x434d5e);

describe('색 공간 변환', () => {
  it('Oklab으로 갔다 오면 같은 색이다', () => {
    for (const hex of [0x000000, 0xffffff, 0x902131, 0x4b576a, 0xf8b651]) {
      near(fromOklab(toOklab(hexToSrgb(hex))), hexToSrgb(hex), 4);
    }
  });

  it('흰색의 밝기는 1, 색 기운은 0이다', () => {
    near(toOklab([1, 1, 1]), [1, 0, 0], 3);
  });
});

describe('대표색 고르기', () => {
  const samples: Oklab[] = [CREAM, CREAM_SHADE, SLATE, SLATE, CREAM].map(toOklab);

  it('가까운 색끼리 묶어 계열마다 하나씩 고른다', () => {
    const palette = pickPalette(samples, 2, 0.5);
    expect(palette).toHaveLength(2);
    const lightness = palette.map((color) => color[0]).sort();
    expect(lightness[0]).toBeCloseTo(toOklab(SLATE)[0], 2);
    expect(lightness[1]).toBeGreaterThan(0.8);
  });

  it('같은 표본이면 언제나 같은 결과가 나온다', () => {
    expect(pickPalette(samples, 2, 0.5)).toEqual(pickPalette(samples, 2, 0.5));
  });

  it('표본의 색 종류보다 많이 달라고 해도 있는 만큼만 고른다', () => {
    expect(pickPalette([toOklab(SLATE), toOklab(SLATE)], 5, 0.5)).toHaveLength(1);
    expect(pickPalette([], 5, 0.5)).toHaveLength(0);
  });
});

describe('색면으로 모으기', () => {
  it('비슷한 색은 같은 한 색이 되고, 다른 계열의 색은 다른 색으로 남는다', () => {
    const colors = CelColors.fromSamples([CREAM, CREAM_SHADE, SLATE], PLAIN);
    expect(colors.map(CREAM)).toEqual(colors.map(CREAM_SHADE));
    expect(colors.map(SLATE)).not.toEqual(colors.map(CREAM));
    expect(colors.colors).toHaveLength(2);
  });

  it('어두운 텍스처는 밝은 면이 캐릭터 그림의 밝기에 닿도록 밝힌다', () => {
    const dark: Srgb[] = [hexToSrgb(0x807466), hexToSrgb(0x2d2217)];
    const brighten = { ...PLAIN, maxLightGain: 1.45 };
    const before = toOklab(CelColors.fromSamples(dark, PLAIN).map(dark[0]))[0];
    const after = toOklab(CelColors.fromSamples(dark, brighten).map(dark[0]))[0];
    expect(after / before).toBeCloseTo(1.45, 1);
  });

  it('이미 밝은 텍스처는 어둡게 만들지 않는다', () => {
    const colors = CelColors.fromSamples([[1, 1, 1]], { ...PLAIN, maxLightGain: 1.45 });
    expect(toOklab(colors.map([1, 1, 1]))[0]).toBeGreaterThan(0.96);
  });

  it('선명함을 올리면 색 기운이 그만큼 커진다', () => {
    const vivid = CelColors.fromSamples([SLATE], { ...PLAIN, chromaGain: 1.4 }).map(SLATE);
    const chroma = (color: Srgb) => Math.hypot(toOklab(color)[1], toOklab(color)[2]);
    expect(chroma(vivid) / chroma(SLATE)).toBeCloseTo(1.4, 1);
  });

  it('표본이 없으면 색을 그대로 둔다', () => {
    expect(CelColors.fromSamples([], PLAIN).map(SLATE)).toEqual(SLATE);
  });
});

describe('색 표', () => {
  it('색을 바꾸지 않는 표는 화소를 거의 그대로 두고 알파는 건드리지 않는다', () => {
    const same: ColorMap = { map: (color) => color };
    const data = new Uint8ClampedArray([13, 200, 77, 120, 255, 0, 3, 128]);
    new ColorLut(same).repaint(data);
    [13, 200, 77, 255, 0, 3].forEach((value, i) => {
      expect(Math.abs(data[i < 3 ? i : i + 1] - value)).toBeLessThanOrEqual(2);
    });
    expect(data[3]).toBe(120);
    expect(data[7]).toBe(128);
  });

  it('한 색으로 모으는 표는 모든 화소를 그 색으로 칠한다', () => {
    const flat: ColorMap = { map: () => [1, 0.5, 0] };
    const data = new Uint8ClampedArray([10, 20, 30, 255, 200, 100, 50, 255]);
    new ColorLut(flat).repaint(data);
    expect([...data]).toEqual([255, 128, 0, 255, 255, 128, 0, 255]);
  });
});

describe('화소 다루기', () => {
  it('빈 틈(검은 화소)은 표본에서 뺀다', () => {
    const image = grid(3, 1, [0, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255]);
    expect(samplePixels(image, 100)).toEqual([
      [1, 0, 0],
      [0, 0, 1],
    ]);
  });

  it('얼룩을 둘레의 평균으로 편다', () => {
    const image = grid(3, 1, [90, 90, 90, 255, 150, 150, 150, 255, 210, 210, 210, 255]);
    softenPixels(image, 1);
    expect([image.data[0], image.data[4], image.data[8]]).toEqual([120, 150, 180]);
  });

  it('빈 틈의 검은색은 옆 화소로 번지지 않고, 빈 틈도 그대로 남는다', () => {
    const image = grid(3, 1, [0, 0, 0, 255, 200, 200, 200, 255, 200, 200, 200, 255]);
    softenPixels(image, 1);
    expect([image.data[0], image.data[4], image.data[8]]).toEqual([0, 200, 200]);
  });
});

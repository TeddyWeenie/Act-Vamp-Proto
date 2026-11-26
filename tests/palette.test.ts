import { describe, expect, it } from 'vitest';
import { ColorLut } from '../src/render/ColorLut';
import {
  fromOklab,
  hexToSrgb,
  PaletteSwap,
  toOklab,
  type ColorMap,
  type Srgb,
} from '../src/render/colorMath';

const OPTIONS = { reach: 0.05, lightnessWeight: 0.35 };
const near = (actual: Srgb, expected: Srgb, digits = 2) =>
  actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i], digits));

describe('색 공간 변환', () => {
  it('Oklab으로 갔다 오면 같은 색이다', () => {
    for (const hex of [0x000000, 0xffffff, 0x902131, 0x4b576a, 0xf8b651]) {
      near(fromOklab(toOklab(hexToSrgb(hex))), hexToSrgb(hex), 4);
    }
  });

  it('흰색의 밝기는 1, 색 기운은 0이다', () => {
    const [lightness, a, b] = toOklab([1, 1, 1]);
    expect(lightness).toBeCloseTo(1, 3);
    expect(a).toBeCloseTo(0, 3);
    expect(b).toBeCloseTo(0, 3);
  });
});

describe('색 계열 옮기기', () => {
  const swap = new PaletteSwap([{ from: 0x684b33, to: 0x6b474a }], OPTIONS);

  it('짝의 from 색은 to 색이 된다', () => {
    near(swap.map(hexToSrgb(0x684b33)), hexToSrgb(0x6b474a));
  });

  it('같은 계열의 그늘진 색도 같은 쪽으로 옮겨진다', () => {
    const before = toOklab(hexToSrgb(0x4d3420));
    const after = toOklab(swap.map(hexToSrgb(0x4d3420)));
    // 노란 기(b)가 줄고 붉은 기(a)가 는다.
    expect(after[2]).toBeLessThan(before[2] - 0.01);
    expect(after[1]).toBeGreaterThan(before[1] + 0.005);
  });

  it('먼 색은 그대로 둔다', () => {
    // 기와의 청회색과 잎의 초록은 눈에 띄지 않을 만큼(5/255 미만)만 움직인다.
    for (const hex of [0x4b576a, 0x7f8c25]) {
      const moved = swap.map(hexToSrgb(hex));
      hexToSrgb(hex).forEach((value, i) => expect(Math.abs(moved[i] - value)).toBeLessThan(5 / 255));
    }
  });

  it('짝이 없으면 아무 색도 바뀌지 않는다', () => {
    near(new PaletteSwap([], OPTIONS).map([0.3, 0.6, 0.9]), [0.3, 0.6, 0.9], 4);
  });
});

describe('색 표', () => {
  const pixels = (...rgba: number[]) => new Uint8ClampedArray(rgba);

  it('색을 바꾸지 않는 표는 화소를 그대로 둔다', () => {
    const same: ColorMap = { map: (color) => color };
    const data = pixels(13, 200, 77, 255, 255, 0, 3, 128);
    new ColorLut(same).repaint(data);
    expect([...data]).toEqual([13, 200, 77, 255, 255, 0, 3, 128]);
  });

  it('표로 칠한 결과가 직접 계산한 색과 거의 같고 알파는 그대로다', () => {
    const swap = new PaletteSwap([{ from: 0x684b33, to: 0x6b474a }], OPTIONS);
    const data = pixels(0x6a, 0x4c, 0x31, 200);
    new ColorLut(swap).repaint(data);
    const direct = swap.map([0x6a / 255, 0x4c / 255, 0x31 / 255]).map((v) => v * 255);
    for (let c = 0; c < 3; c++) expect(Math.abs(data[c] - direct[c])).toBeLessThanOrEqual(3);
    expect(data[3]).toBe(200);
  });

  it('범위를 넘는 값은 0~255로 잘린다', () => {
    const brighter: ColorMap = { map: ([r, g, b]) => [r + 0.5, g + 0.5, b + 0.5] };
    const data = pixels(250, 250, 250, 255);
    new ColorLut(brighter).repaint(data);
    expect([...data]).toEqual([255, 255, 255, 255]);
  });
});

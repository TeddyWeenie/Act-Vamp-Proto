import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import type { PropPlacement } from '../src/data/town';
import type { StillImage } from '../src/game/capabilities';
import { Prop } from '../src/game/entities/Prop';
import { billboardCover } from '../src/game/logic/occlusion';
import { topView, towardCamera } from '../src/game/logic/view';
import type { GroundArea } from '../src/render/look';

class FakeImage implements StillImage {
  readonly root = new Object3D();
  readonly width = 3;
  readonly height = 6;
  opacity = 1;
  setOpacity(opacity: number): void {
    this.opacity = opacity;
  }
}

const angle = topView(50);
const camera = towardCamera(angle.elevation, angle.azimuth);
const walker = (x: number, z: number) => ({
  position: { x, z },
  occlusionHeights: [0.25, 1.1, 1.9],
  elevation: 0,
  halfWidth: 0.4,
});

const tree: PropPlacement = {
  image: 'tree.png',
  height: 6,
  x: 0,
  z: 0,
  block: { width: 0.8, depth: 0.5 },
  shadow: { width: 2.4, depth: 1.6, height: 4.5, round: true },
  cover: { bottom: 0.4, top: 1, width: 0.8 },
};

function build(placement: PropPlacement) {
  const image = new FakeImage();
  const shadows: GroundArea[] = [];
  const look = {
    fadeRate: 9,
    groundShadow(area: GroundArea) {
      shadows.push(area);
      return new Object3D();
    },
  };
  return { prop: new Prop(image, placement, look), image, shadows };
}

describe('billboardCover', () => {
  it('그림 크기에 견준 비율을 월드 상자로 바꾼다', () => {
    const box = billboardCover({ x: 2, z: -1 }, 3, 6, { bottom: 0.5, top: 1, width: 0.5 });
    expect(box.min.x).toBeCloseTo(1.25);
    expect(box.max.x).toBeCloseTo(2.75);
    expect(box.min.y).toBeCloseTo(3);
    expect(box.max.y).toBeCloseTo(6);
  });
});

describe('Prop', () => {
  it('줄기만큼만 길을 막고, 소품의 그림자라고 알리며 그림자를 깐다', () => {
    const { prop, shadows } = build(tree);
    expect(prop.footprint).toEqual({ minX: -0.4, maxX: 0.4, minZ: -0.25, maxZ: 0.25 });
    expect(shadows).toHaveLength(1);
    expect(shadows[0]).toMatchObject({ x: 0, z: 0, round: true, fromProp: true });
  });

  it('잎 뒤에 선 캐릭터는 가리고, 앞이나 옆에 선 캐릭터는 가리지 않는다', () => {
    const { prop } = build(tree);
    expect(prop.occludes(walker(0, -1.5), camera)).toBe(true);
    expect(prop.occludes(walker(0, 1.5), camera)).toBe(false);
    expect(prop.occludes(walker(3, -1.5), camera)).toBe(false);
  });

  it('가릴 부분을 적지 않은 소품은 발치만 가리고 옅어지지 않는다', () => {
    const { prop } = build({ ...tree, cover: undefined });
    expect(prop.occludes(walker(0, -0.5), camera)).toBe(false);
  });

  it('캐릭터를 가리면 옅어지고, 벗어나면 돌아온다', () => {
    const { prop, image } = build(tree);
    prop.setOccluding(true);
    for (let i = 0; i < 120; i++) prop.update(1 / 60);
    expect(image.opacity).toBeCloseTo(0.45);
    prop.setOccluding(false);
    for (let i = 0; i < 120; i++) prop.update(1 / 60);
    expect(image.opacity).toBe(1);
  });
});

import { Group, type Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import type { Obstacle, Occluder, OcclusionTarget, Raised } from '../src/game/capabilities';
import { Entity } from '../src/game/entities/Entity';
import type { Footprint } from '../src/game/logic/movement';
import { CollisionMap } from '../src/game/systems/CollisionMap';
import { OcclusionSystem } from '../src/game/systems/OcclusionSystem';
import { World } from '../src/game/World';

const BOUNDS = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
const CAMERA = { x: 0.5, y: Math.SQRT1_2, z: 0.5 };

class Prop extends Entity {
  updates = 0;
  constructor() {
    super(new Group());
  }
  override update(): void {
    this.updates++;
  }
}

/** x가 0보다 작은 대상을 가린다고 답하는 가짜 벽. */
class Wall extends Entity implements Obstacle, Occluder {
  readonly footprint: Footprint = { minX: 1, maxX: 2, minZ: -1, maxZ: 1 };
  occluding = false;
  checks = 0;
  constructor() {
    super(new Group());
  }
  occludes(target: OcclusionTarget): boolean {
    this.checks++;
    return target.position.x < 0;
  }
  setOccluding(occluding: boolean): void {
    this.occluding = occluding;
  }
}

function setup() {
  const staged: Object3D[] = [];
  const collisions = new CollisionMap(BOUNDS);
  const occlusion = new OcclusionSystem(CAMERA);
  const world = new World({ add: (object) => staged.push(object) }, collisions, occlusion);
  return { staged, collisions, occlusion, world };
}

describe('월드', () => {
  it('들어온 것을 무대에 올리고 매 프레임 진행시킨다', () => {
    const { staged, world } = setup();
    const prop = world.add(new Prop());
    world.update(0.1);
    world.update(0.1);
    expect(staged).toEqual([prop.root]);
    expect(prop.updates).toBe(2);
  });

  it('길을 막는 것은 충돌 지도에 저절로 등록된다', () => {
    const { collisions, world } = setup();
    world.add(new Wall());
    const stopped = collisions.move({ x: 0, z: 0 }, { x: 1, z: 0 }, 1.5, 0.4);
    expect(stopped.x).toBeCloseTo(0.6, 6);
  });

  it('가릴 수 있는 것은 가림 검사에 저절로 등록된다', () => {
    const { occlusion, world } = setup();
    const wall = world.add(new Wall());
    const target = { position: { x: -1, z: 0 }, occlusionHeights: [1], elevation: 0, halfWidth: 0 };
    occlusion.watch(target);
    world.update(0.1);
    expect(wall.occluding).toBe(true);
  });
});

describe('가림 검사', () => {
  it('대상이 움직이지 않으면 다시 검사하지 않는다', () => {
    const { occlusion, world } = setup();
    const wall = world.add(new Wall());
    const target = { position: { x: -1, z: 0 }, occlusionHeights: [1], elevation: 0, halfWidth: 0 };
    occlusion.watch(target);
    occlusion.update();
    occlusion.update();
    expect(wall.checks).toBe(1);

    target.position = { x: 3, z: 0 };
    occlusion.update();
    expect(wall.checks).toBe(2);
    expect(wall.occluding).toBe(false);
  });

  it('지켜볼 대상이 없으면 아무것도 가리지 않는다', () => {
    const { occlusion, world } = setup();
    const wall = world.add(new Wall());
    wall.occluding = true;
    occlusion.watch(null);
    occlusion.update();
    expect(wall.occluding).toBe(false);
  });
});

describe('충돌 지도', () => {
  it('맵 경계 밖으로 나가지 못한다', () => {
    const map = new CollisionMap(BOUNDS);
    expect(map.move({ x: 9, z: 0 }, { x: 1, z: 0 }, 5, 0.4).x).toBeCloseTo(9.6, 6);
    expect(map.clamp({ x: 50, z: -50 })).toEqual({ x: 10, z: -10 });
  });
});

/** x가 3에서 5 사이면 높이 0.6인 계단. */
class Steps extends Entity implements Raised {
  constructor() {
    super(new Group());
  }
  floorAt(point: { x: number; z: number }): number {
    return point.x >= 3 && point.x <= 5 ? 0.6 : 0;
  }
}

describe('바닥 높이', () => {
  it('딛고 올라설 것은 저절로 등록되어 그 위에서는 바닥이 높아진다', () => {
    const { collisions, world } = setup();
    expect(collisions.heightAt({ x: 4, z: 0 }, 0.4)).toBe(0);
    world.add(new Steps());
    expect(collisions.heightAt({ x: 4, z: 0 }, 0.4)).toBe(0.6);
    expect(collisions.heightAt({ x: 0, z: 0 }, 0.4)).toBe(0);
  });

  it('그림의 한쪽 끝만 계단에 걸쳐도 올라선다', () => {
    const { collisions, world } = setup();
    world.add(new Steps());
    // 가운데는 계단 밖이지만 좌우로 넓은 그림의 오른쪽 끝이 계단 위에 있다.
    expect(collisions.heightAt({ x: 2.8, z: 0 }, 0.4)).toBe(0.6);
    expect(collisions.heightAt({ x: 2.6, z: 0 }, 0.4)).toBe(0);
  });
});

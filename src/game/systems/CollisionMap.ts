import type { Obstacle, Raised, WalkableSpace } from '../capabilities';
import { overlapsFootprint, step, type Bounds, type Footprint } from '../logic/movement';
import type { Vec2 } from '../logic/view';

/**
 * 그림은 좌우로 넓은 판이라, 발밑 원의 가운데만 재면 판의 한쪽 끝이 계단 옆면에 파묻힌다.
 * 그래서 가운데와 좌우 이만큼 떨어진 곳(반지름에 견준 비율)을 함께 재서 가장 높은 곳에 세운다.
 */
const FOOT_SPREAD = 0.7;

/** 맵의 경계, 장애물, 딛고 올라설 것을 모아 두고, 걸음이 어디서 멈추고 발이 얼마나 높이 놓이는지 계산한다. */
export class CollisionMap implements WalkableSpace {
  private readonly footprints: Footprint[] = [];
  private readonly raised: Raised[] = [];

  constructor(private readonly bounds: Bounds) {}

  add(obstacle: Obstacle): void {
    this.footprints.push(obstacle.footprint);
  }

  raise(raised: Raised): void {
    this.raised.push(raised);
  }

  heightAt(point: Readonly<Vec2>, radius: number): number {
    const reach = radius * FOOT_SPREAD;
    let height = 0;
    for (const raised of this.raised) {
      for (const x of [point.x, point.x - reach, point.x + reach]) {
        height = Math.max(height, raised.floorAt({ x, z: point.z }));
      }
    }
    return height;
  }

  move(from: Readonly<Vec2>, dir: Readonly<Vec2>, distance: number, radius: number): Vec2 {
    return step(from, dir, distance, radius, this.footprints, this.bounds);
  }

  /**
   * 반지름 radius인 발밑 원이 그 자리에 설 수 있는지: 맵 안이고, 건물이나 소품과 겹치지 않고, 계단 위가 아니어야 한다.
   * 전투 대형의 자리를 고를 때 써서, 캐릭터가 벽이나 계단에 파묻힌 채 서지 않게 한다.
   */
  isClear(point: Readonly<Vec2>, radius: number): boolean {
    const { minX, maxX, minZ, maxZ } = this.bounds;
    if (point.x - radius < minX || point.x + radius > maxX) return false;
    if (point.z - radius < minZ || point.z + radius > maxZ) return false;
    if (this.heightAt(point, radius) > 0) return false;
    return this.footprints.every((box) => !overlapsFootprint(point, radius, box));
  }

  clamp(point: Readonly<Vec2>): Vec2 {
    return {
      x: Math.max(this.bounds.minX, Math.min(point.x, this.bounds.maxX)),
      z: Math.max(this.bounds.minZ, Math.min(point.z, this.bounds.maxZ)),
    };
  }
}

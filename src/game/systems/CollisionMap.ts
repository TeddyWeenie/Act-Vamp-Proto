import type { Obstacle, Raised, WalkableSpace } from '../capabilities';
import { step, type Bounds, type Footprint } from '../logic/movement';
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

  clamp(point: Readonly<Vec2>): Vec2 {
    return {
      x: Math.max(this.bounds.minX, Math.min(point.x, this.bounds.maxX)),
      z: Math.max(this.bounds.minZ, Math.min(point.z, this.bounds.maxZ)),
    };
  }
}

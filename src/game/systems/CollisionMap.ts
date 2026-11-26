import type { CollisionSpace, Obstacle } from '../capabilities';
import { step, type Bounds, type Footprint } from '../logic/movement';
import type { Vec2 } from '../logic/view';

/** 맵의 경계와 장애물을 모아 두고, 걸음이 어디서 멈추는지 계산한다. */
export class CollisionMap implements CollisionSpace {
  private readonly footprints: Footprint[] = [];

  constructor(private readonly bounds: Bounds) {}

  add(obstacle: Obstacle): void {
    this.footprints.push(obstacle.footprint);
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

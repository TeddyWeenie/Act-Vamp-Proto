import type { Vec2 } from '../logic/view';
import type { MoveIntent, MoveSource } from './controller';

/** 이 거리 안으로 들어오면 도착한 것으로 본다. */
const ARRIVE_DISTANCE = 0.06;

/** 정해 준 자리까지 곧장 걸어간다. 도착하거나 길이 막히면 끝난다. */
export class GoTo implements MoveSource {
  private done = false;

  constructor(private readonly target: Readonly<Vec2>) {}

  /** 도착했거나 더 갈 수 없어서 멈췄는지. */
  get arrived(): boolean {
    return this.done;
  }

  moveIntent(from: Readonly<Vec2>): MoveIntent | null {
    if (this.done) return null;
    const dx = this.target.x - from.x;
    const dz = this.target.z - from.z;
    const remaining = Math.hypot(dx, dz);
    if (remaining < ARRIVE_DISTANCE) {
      this.done = true;
      return null;
    }
    return { dir: { x: dx / remaining, z: dz / remaining }, maxDistance: remaining };
  }

  stop(): void {
    this.done = true;
  }
}

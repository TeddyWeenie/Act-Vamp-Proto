import type { CollisionSpace, DestinationProvider, GroundPicker } from '../capabilities';
import type { PointerInput } from '../input';
import type { Vec2 } from '../logic/view';
import type { MoveIntent, MoveSource } from './controller';

/** 이 거리 안으로 들어오면 도착한 것으로 본다. */
const ARRIVE_DISTANCE = 0.06;

/** 바닥을 클릭하면 그곳까지 곧장 걸어간다. */
export class PointerMove implements MoveSource, DestinationProvider {
  private target: Vec2 | null = null;

  constructor(
    private readonly input: PointerInput,
    private readonly picker: GroundPicker,
    private readonly space: CollisionSpace,
  ) {}

  get destination(): Readonly<Vec2> | null {
    return this.target;
  }

  moveIntent(from: Readonly<Vec2>): MoveIntent | null {
    const click = this.input.takePointer();
    if (click) {
      const picked = this.picker.pickGround(click.ndcX, click.ndcY);
      if (picked) this.target = this.space.clamp(picked);
    }
    if (!this.target) return null;

    const dx = this.target.x - from.x;
    const dz = this.target.z - from.z;
    const remaining = Math.hypot(dx, dz);
    if (remaining < ARRIVE_DISTANCE) {
      this.target = null;
      return null;
    }
    return { dir: { x: dx / remaining, z: dz / remaining }, maxDistance: remaining };
  }

  stop(): void {
    this.target = null;
  }
}

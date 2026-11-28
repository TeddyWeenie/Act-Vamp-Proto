import type { Updatable } from '../capabilities';
import type { Vec2 } from '../logic/view';
import type { MoveIntent, MoveSource } from './controller';

/** 이만큼 움직일 때마다 발자국을 하나 남긴다. */
const CRUMB_DISTANCE = 0.25;
const MAX_CRUMBS = 96;
/** 목표에 이만큼 가까우면 서 있는다. 조금씩 떨리며 걷지 않게 한다. */
const REST_DISTANCE = 0.2;

/** 앞장선 사람이 지나온 길. 뒤따르는 사람들이 이 길을 그대로 밟는다. */
export class Trail implements Updatable {
  private readonly crumbs: Vec2[] = [];

  constructor(private readonly leader: { readonly position: Readonly<Vec2> }) {
    this.reset();
  }

  /** 앞장선 사람이 지금 있는 자리. */
  get head(): Readonly<Vec2> {
    return this.leader.position;
  }

  /** 지나온 길을 지우고 지금 자리에서 다시 시작한다. */
  reset(): void {
    this.crumbs.length = 0;
    this.crumbs.push({ ...this.leader.position });
  }

  update(_dt: number): void {
    const head = this.crumbs[0]!;
    const { x, z } = this.leader.position;
    if (Math.hypot(x - head.x, z - head.z) < CRUMB_DISTANCE) return;
    this.crumbs.unshift({ x, z });
    if (this.crumbs.length > MAX_CRUMBS) this.crumbs.pop();
  }

  /** 앞장선 사람에게서 길을 따라 distance만큼 뒤처진 자리. */
  pointBehind(distance: number): Vec2 {
    let previous: Readonly<Vec2> = this.leader.position;
    let left = distance;
    for (const crumb of this.crumbs) {
      const span = Math.hypot(crumb.x - previous.x, crumb.z - previous.z);
      if (span >= left && span > 0) {
        const t = left / span;
        return { x: previous.x + (crumb.x - previous.x) * t, z: previous.z + (crumb.z - previous.z) * t };
      }
      left -= span;
      previous = crumb;
    }
    return { x: previous.x, z: previous.z };
  }
}

/** 앞사람과 이 비율(뒤처질 거리에 견준 값)보다 가까우면 더 다가가지 않는다. 멈춰 선 앞사람에게 겹쳐 서지 않게 한다. */
const KEEP_RATIO = 0.8;

/** 앞사람이 지나온 길을 일정한 거리를 두고 따라 걷는다. */
export class TrailFollow implements MoveSource {
  constructor(
    private readonly trail: Trail,
    private readonly lag: number,
  ) {}

  moveIntent(from: Readonly<Vec2>): MoveIntent | null {
    const head = this.trail.head;
    if (Math.hypot(head.x - from.x, head.z - from.z) < this.lag * KEEP_RATIO) return null;
    const target = this.trail.pointBehind(this.lag);
    const dx = target.x - from.x;
    const dz = target.z - from.z;
    const remaining = Math.hypot(dx, dz);
    if (remaining < REST_DISTANCE) return null;
    return { dir: { x: dx / remaining, z: dz / remaining }, maxDistance: remaining };
  }

  stop(): void {}
}

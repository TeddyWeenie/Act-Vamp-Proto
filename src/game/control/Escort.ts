import type { Updatable } from '../capabilities';
import type { Vec2 } from '../logic/view';
import type { ScriptedController } from './ScriptedController';
import { TrailFollow, type Trail } from './TrailFollow';

/** 일행 한 사람: 몸, 그 몸을 움직이는 조종자, 앞사람에게서 뒤처지는 거리. */
export interface Follower {
  readonly body: { readonly position: Readonly<Vec2>; placeAt(point: Readonly<Vec2>): void };
  readonly lead: ScriptedController;
  readonly lag: number;
}

/** 이보다 멀리 떨어지면 길을 잃은 것으로 보고 앞사람이 지나온 길 위로 바로 데려온다. */
const LOST_DISTANCE = 9;

/**
 * 주인공을 뒤따르는 일행. 따라 걷기를 시작하고 멈추는 일, 길을 잃은 동료를 데려오는 일을 맡는다.
 * 대화나 전투 연출이 동료를 직접 움직일 때는 연출이 조종자에 다른 이동 수단을 끼우고, 끝나면 follow로 되돌린다.
 */
export class Escort implements Updatable {
  private following = false;

  constructor(
    private readonly trail: Trail,
    private readonly followers: readonly Follower[],
  ) {}

  /** 주인공을 따라 걷기 시작한다. */
  follow(): void {
    this.following = true;
    for (const follower of this.followers) follower.lead.travel(new TrailFollow(this.trail, follower.lag));
  }

  /** 제자리에 선다. */
  halt(): void {
    this.following = false;
    for (const follower of this.followers) follower.lead.travel(null);
  }

  update(dt: number): void {
    this.trail.update(dt);
    if (!this.following) return;
    const head = this.trail.head;
    for (const follower of this.followers) {
      const { x, z } = follower.body.position;
      if (Math.hypot(head.x - x, head.z - z) > LOST_DISTANCE) {
        follower.body.placeAt(this.trail.pointBehind(follower.lag));
      }
    }
  }
}

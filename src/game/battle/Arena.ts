import type { BattleGround } from '../entities/BattleGround';
import type { FormationPlan } from '../logic/formation';
import type { CameraFocus } from '../systems/CameraFocus';

/** 전투가 벌어지는 자리를 꾸미는 것. 전투 장면은 싸움터가 어떻게 연출되는지 모른다. */
export interface Arena {
  open(plan: FormationPlan): void;
  close(): void;
}

/** 화면을 당겨 보는 것. */
export interface CloseUpLens {
  closeUp(ratio: number): void;
}

/** 대형 둘레에 두는 여유. 캐릭터의 몸 너비와 발밑 타원의 번짐만큼이다. */
const MARGIN_X = 3.6;
const MARGIN_Z = 3.4;
/** 전투 중 화면을 당기는 배율. */
const CLOSE_UP = 0.86;
/** 화면 아래의 명령 메뉴에 가리지 않도록 대형을 화면 위쪽으로 올려 보이게 하는 거리. */
const LOOK_SOUTH = 1.7;

/**
 * 걷던 자리를 그대로 싸움터로 쓴다. 화면을 바꾸지 않고, 대형이 선 곳의 바닥을 가라앉히고 카메라를 그 자리에 모은다.
 * "따로 마련한 무대 같지만 싸우는 곳은 지금 있는 곳"이라는 느낌을 내는 역할이다.
 */
export class FieldArena implements Arena {
  constructor(
    private readonly focus: CameraFocus,
    private readonly lens: CloseUpLens,
    private readonly ground: BattleGround,
  ) {}

  open(plan: FormationPlan): void {
    const slots = [...plan.party, ...plan.enemies];
    const xs = slots.map((slot) => slot.x);
    const zs = slots.map((slot) => slot.z);
    const width = Math.max(...xs) - Math.min(...xs) + MARGIN_X;
    const depth = Math.max(...zs) - Math.min(...zs) + MARGIN_Z;
    this.ground.appear(plan.centre, width, depth);
    this.focus.hold({ x: plan.centre.x, z: plan.centre.z + LOOK_SOUTH });
    this.lens.closeUp(CLOSE_UP);
  }

  close(): void {
    this.ground.vanish();
    this.focus.release();
    this.lens.closeUp(1);
  }
}

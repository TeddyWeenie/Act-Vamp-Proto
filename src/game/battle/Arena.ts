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

/** 싸움터를 화면에 어떻게 담을지 정하는 데 필요한 카메라 사정. */
export interface ArenaView {
  /** 카메라가 지면에서 올라간 각도(라디안). */
  readonly elevation: number;
  /** 보통 때 화면 세로에 들어오는 월드 길이. */
  readonly viewHeight: number;
}

/** 대형 둘레에 두는 여유. 캐릭터의 몸 너비와 발밑 타원의 번짐만큼이다. */
const MARGIN_X = 3.6;
const MARGIN_Z = 3.4;
/** 위쪽 띠와 아래쪽 명령 메뉴 사이, 대형이 보여야 하는 구역이 화면 세로에서 차지하는 비율과 그 가운데의 위치(위에서부터). */
const BAND = 0.5;
const BAND_CENTRE = 0.36;
/** 가장 큰 캐릭터의 키. 대형의 맨 뒷줄 머리까지 화면에 담으려고 쓴다. */
const HEADROOM = 3;
/** 카메라가 바라보는 점의 높이(QuarterCamera가 지면 위 1을 본다). */
const LOOK_HEIGHT = 1;
/** 전투 중 화면을 당기거나 미는 배율의 한계. 1보다 작으면 당겨 본다. */
const CLOSEST = 0.86;
const FARTHEST = 1.2;

/**
 * 걷던 자리를 그대로 싸움터로 쓴다. 화면을 바꾸지 않고, 대형이 선 곳의 바닥을 가라앉히고 카메라를 그 자리에 모은다.
 * "따로 마련한 무대 같지만 싸우는 곳은 지금 있는 곳"이라는 느낌을 내는 역할이다.
 * 대형이 가로로 서든 세로로 서든, 명령 메뉴에 가리지 않고 모두 보이도록 카메라의 거리와 위치를 대형 크기에 맞춘다.
 */
export class FieldArena implements Arena {
  constructor(
    private readonly focus: CameraFocus,
    private readonly lens: CloseUpLens,
    private readonly ground: BattleGround,
    private readonly view: ArenaView,
  ) {}

  open(plan: FormationPlan): void {
    const slots = [...plan.party, ...plan.enemies];
    const xs = slots.map((slot) => slot.x);
    const zs = slots.map((slot) => slot.z);
    const near = Math.max(...zs);
    const far = Math.min(...zs);
    this.ground.appear(
      { x: (Math.max(...xs) + Math.min(...xs)) / 2, z: (near + far) / 2 },
      Math.max(...xs) - Math.min(...xs) + MARGIN_X,
      near - far + MARGIN_Z,
    );

    // 화면에서 세로로 차지하는 길이: 지면의 깊이는 비스듬히 눌려 보이고, 서 있는 몸은 그만큼 덜 눌린다.
    const sin = Math.sin(this.view.elevation);
    const head = HEADROOM * Math.cos(this.view.elevation);
    const needed = (near - far) * sin + head;
    const ratio = Math.max(CLOSEST, Math.min(FARTHEST, needed / (BAND * this.view.viewHeight)));
    // 대형의 가운데(머리까지 친 높이의 가운데)가 보이는 구역의 가운데에 오도록 카메라가 볼 곳을 남쪽으로 옮긴다.
    const rise =
      (0.5 - BAND_CENTRE) * this.view.viewHeight * ratio -
      head / 2 +
      LOOK_HEIGHT * Math.cos(this.view.elevation);
    this.focus.hold({ x: plan.centre.x, z: (near + far) / 2 + rise / sin });
    this.lens.closeUp(ratio);
  }

  close(): void {
    this.ground.vanish();
    this.focus.release();
    this.lens.closeUp(1);
  }
}

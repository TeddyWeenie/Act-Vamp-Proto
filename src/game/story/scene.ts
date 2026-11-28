import type { Updatable } from '../capabilities';
import type { Vec2 } from '../logic/view';

/**
 * 이야기의 한 장면(대화, 전투, 결과 화면). 장면이 도는 동안 플레이어는 주인공을 직접 움직이지 못한다.
 * 새 종류의 장면은 이 약속을 지키는 클래스를 더하면 되고, 장면을 돌리는 쪽(StoryDirector)은 고치지 않는다.
 */
export interface StoryScene extends Updatable {
  readonly finished: boolean;
  /** 장면이 시작될 때 한 번 부른다. */
  begin(): void;
  /** 끝난 뒤 이어질 장면. 없으면 탐색으로 돌아간다. */
  next(): StoryScene | null;
}

/** 걸어 다니다가 장면이 시작되는 자리(말을 걸 수 있는 사람, 다가가면 싸움이 붙는 적). */
export interface Hotspot {
  /** 가까이 갔을 때 보여 줄 안내. null이면 다가가는 것만으로 장면이 시작된다. */
  readonly prompt: string | null;
  /** 지금 이 자리에서 장면을 시작할 수 있는지. */
  inReach(point: Readonly<Vec2>): boolean;
  open(): StoryScene;
}

export interface CircleSpotOptions {
  readonly centre: Readonly<Vec2>;
  readonly radius: number;
  readonly prompt: string | null;
  /** 지금 이야기 진행에서 쓸 수 있는 자리인지. 주지 않으면 늘 쓸 수 있다. */
  readonly when?: () => boolean;
  readonly open: () => StoryScene;
}

/** 한 점에서 일정 거리 안에 들어오면 닿는 자리. */
export class CircleSpot implements Hotspot {
  constructor(private readonly options: CircleSpotOptions) {}

  get prompt(): string | null {
    return this.options.prompt;
  }

  inReach(point: Readonly<Vec2>): boolean {
    const { centre, radius, when } = this.options;
    if (when && !when()) return false;
    return Math.hypot(point.x - centre.x, point.z - centre.z) <= radius;
  }

  open(): StoryScene {
    return this.options.open();
  }
}

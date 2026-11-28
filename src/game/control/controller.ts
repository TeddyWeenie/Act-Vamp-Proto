import type { Vec2 } from '../logic/view';

/** 이번 프레임에 가고 싶은 방향과, 그 방향으로 갈 수 있는 최대 거리. */
export interface MoveIntent {
  readonly dir: Readonly<Vec2>;
  readonly maxDistance: number;
}

/** 이동 의사를 내놓는 것. 키보드, 클릭, 나중에는 길 찾기나 AI가 여기에 맞춰 들어온다. */
export interface MoveSource {
  moveIntent(from: Readonly<Vec2>): MoveIntent | null;
  /** 진행 중인 이동 계획을 버린다. */
  stop(): void;
}

/** 캐릭터를 조종하는 것. 캐릭터는 조종자가 사람인지 AI인지 모른다. */
export interface CharacterController extends MoveSource {
  /** 공격 요청이 있었으면 true를 돌려주고 요청을 비운다. */
  takeAttack(): boolean;
}

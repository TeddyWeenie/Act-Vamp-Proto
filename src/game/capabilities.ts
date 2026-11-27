import type { Object3D } from 'three';
import type { Footprint } from './logic/movement';
import type { Vec2, Vec3 } from './logic/view';

/**
 * 객체들이 서로에게 요구하는 "할 수 있는 일"을 작은 인터페이스로 나눠 둔다.
 * 클래스는 구체적인 상대 대신 이 인터페이스에만 기대므로, 구현을 바꾸거나 새로 더해도 쓰는 쪽은 그대로다.
 */

/** 매 프레임 시간이 흐르는 것. */
export interface Updatable {
  update(dt: number): void;
}

/** 지면을 차지해서 캐릭터가 지나갈 수 없는 것. */
export interface Obstacle {
  readonly footprint: Footprint;
}

/** 건물 뒤에 숨었는지 살펴볼 대상. */
export interface OcclusionTarget {
  readonly position: Readonly<Vec2>;
  /** 가림 검사에 쓰는 높이들(발목, 허리, 머리). */
  readonly occlusionHeights: readonly number[];
}

/** 캐릭터를 가릴 수 있고, 가리면 스스로 옅어지는 것. */
export interface Occluder {
  occludes(target: OcclusionTarget, towardCamera: Vec3): boolean;
  setOccluding(occluding: boolean): void;
}

/** 걸어 다닐 수 있는 공간. 장애물과 맵 경계를 안다. */
export interface CollisionSpace {
  /** from에서 dir로 distance만큼 걸었을 때 실제로 도착하는 위치. */
  move(from: Readonly<Vec2>, dir: Readonly<Vec2>, distance: number, radius: number): Vec2;
  /** 맵 안쪽으로 당긴 위치. */
  clamp(point: Readonly<Vec2>): Vec2;
}

/** 화면 좌표(-1~1)가 가리키는 지면 위치를 알려 주는 것. */
export interface GroundPicker {
  pickGround(ndcX: number, ndcY: number): Vec2 | null;
}

/** 클릭 이동의 목적지를 알려 주는 것. */
export interface DestinationProvider {
  readonly destination: Readonly<Vec2> | null;
}

/** 장면에 세울 수 있는 동작 그림. 캐릭터는 이것이 스프라이트인지 다른 무엇인지 알 필요가 없다. */
export interface SpriteAnimator<Clip extends string> extends Updatable {
  readonly root: Object3D;
  readonly clip: Clip;
  /** 반복하지 않는 동작이 끝났는지. */
  readonly finished: boolean;
  play(clip: Clip, restart?: boolean): void;
  /** 화면 왼쪽을 보게 할지 오른쪽을 보게 할지. 그림을 뒤집을지는 구현이 그림의 원래 방향을 보고 정한다. */
  faceLeft(left: boolean): void;
  setPosition(x: number, z: number): void;
}

/** 장면에 세운 움직이지 않는 그림. 소품은 이것이 어떻게 그려지는지 알 필요가 없다. */
export interface StillImage {
  readonly root: Object3D;
  /** 세운 그림의 월드 너비와 높이. */
  readonly width: number;
  readonly height: number;
  setOpacity(opacity: number): void;
}

/** 3D 물체를 올려놓을 수 있는 무대. three의 Scene이 여기에 맞는다. */
export interface Stage {
  add(object: Object3D): unknown;
}

export function isObstacle(value: object): value is Obstacle {
  return 'footprint' in value;
}

export function isOccluder(value: object): value is Occluder {
  return 'occludes' in value && 'setOccluding' in value;
}

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
  /** 가림 검사에 쓰는 높이들(발목, 허리, 머리). 발밑에서 잰 값이다. */
  readonly occlusionHeights: readonly number[];
  /** 발이 놓인 높이. 계단 위에 서 있으면 0보다 크다. */
  readonly elevation: number;
  /** 화면에서 보이는 몸의 절반 폭. 몸 한쪽만 가려져도 알아채는 데 쓴다. */
  readonly halfWidth: number;
  /** 장면에서 감춰져 있는지. 감춰진 대상은 가려져도 상관없으므로 살피지 않는다. */
  readonly hidden?: boolean;
}

/** 가려지지 않게 지켜볼 대상을 받아 주는 것. */
export interface OcclusionWatch {
  include(target: OcclusionTarget): void;
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

/** 딛고 올라설 수 있는 것(계단, 단). 캐릭터가 그 안에 파묻히지 않고 위에 서게 한다. */
export interface Raised {
  /** 그 자리에서 발이 닿는 윗면의 높이. 디딜 것이 없으면 0. */
  floorAt(point: Readonly<Vec2>): number;
}

/** 발 디딜 바닥의 높이를 아는 것. */
export interface Terrain {
  /** 반지름 radius인 발밑 원이 그 자리에 섰을 때 디디는 바닥의 높이. */
  heightAt(point: Readonly<Vec2>, radius: number): number;
}

/** 캐릭터가 걷는 공간: 어디서 막히는지와 바닥이 얼마나 높은지를 함께 안다. */
export interface WalkableSpace extends CollisionSpace, Terrain {}

/** 화면 좌표(-1~1)가 가리키는 지면 위치를 알려 주는 것. */
export interface GroundPicker {
  pickGround(ndcX: number, ndcY: number): Vec2 | null;
}

/** 화면 안의 한 점. 왼쪽 위가 (0, 0), 오른쪽 아래가 (1, 1)이다. */
export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

/** 장면 속 위치가 화면의 어디에 보이는지 알려 주는 것. 머리 위 숫자나 표시를 띄울 때 쓴다. */
export interface ScreenProjector {
  toScreen(point: Readonly<Vec3>): ScreenPoint;
}

/** 빈자리인지 알려 주는 것. */
export interface ClearanceMap {
  isClear(point: Readonly<Vec2>, radius: number): boolean;
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
  /** height는 발이 놓이는 높이다. 계단 위에 서면 0보다 크다. */
  setPosition(x: number, z: number, height: number): void;
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

export function isRaised(value: object): value is Raised {
  return 'floorAt' in value;
}

export function isOccluder(value: object): value is Occluder {
  return 'occludes' in value && 'setOccluding' in value;
}

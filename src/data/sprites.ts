import type { Clip } from '../game/logic/animation';

/** 아틀라스 한 칸의 크기(px). tools/slice.py가 이 규격으로 잘라 낸다. */
export const CELL = 512;
/** 칸 아래에서 발 기준선까지의 여백(px). */
export const FOOT_MARGIN = 24;
/** 칸 안에서 캐릭터가 차지하는 최대 높이(px). */
export const FIGURE_HEIGHT = CELL - FOOT_MARGIN * 2;

export interface SpriteClip extends Clip {
  url: string;
  /**
   * 그림 속 캐릭터가 원래 바라보는 화면 방향. 반대쪽을 볼 때만 좌우를 뒤집는다.
   * 정면이나 뒷면처럼 좌우가 없는 그림은 'center'로 적고 뒤집지 않는다.
   */
  faces: 'left' | 'right' | 'center';
  /** 띠마다 그려진 크기가 조금씩 달라, 머리 크기를 기준으로 맞추는 보정값. */
  scale: number;
  /** 칸의 가로 ÷ 세로. 몸이 크게 움직이는 동작은 칸을 넓게 자른다. 적지 않으면 정사각형(1). */
  cellAspect?: number;
  /** 칸 아래에서 발 기준선까지의 여백(px). 칼이 발보다 아래로 내려오는 그림은 넓게 자른다. 적지 않으면 FOOT_MARGIN. */
  footMargin?: number;
}

export interface SpriteSheet<Name extends string> {
  /** 캐릭터의 월드 높이. 건물과 같은 단위다. */
  height: number;
  clips: Record<Name, SpriteClip>;
}

export type HeroClip = 'idle' | 'walk' | 'attack' | 'backIdle' | 'backWalk' | 'backAttack';

const lucien = (file: string) => `/assets/sprites/lucien/${file}.png`;

export const LUCIEN: SpriteSheet<HeroClip> = {
  height: 2.0,
  clips: {
    // 앞모습은 모두 왼쪽 아래를, 뒷모습은 모두 오른쪽 위를 보고 그려져 있다.
    // 공격 그림은 얼굴, 몸, 칼이 같은 쪽을 향해야 한다(얼굴이 화면 정면을 보면 딴 곳을 보는 것처럼 보인다).
    idle: { url: lucien('idle'), faces: 'left', frames: 4, fps: 4.5, loop: true, scale: 1 },
    walk: { url: lucien('walk'), faces: 'left', frames: 6, fps: 9, loop: true, scale: 1 },
    attack: {
      url: lucien('attack'),
      faces: 'left',
      frames: 6,
      fps: 12,
      loop: false,
      scale: 0.9,
      cellAspect: 640 / CELL,
    },
    backIdle: { url: lucien('back-idle'), faces: 'right', frames: 4, fps: 4.5, loop: true, scale: 1.06 },
    backWalk: { url: lucien('back-walk'), faces: 'right', frames: 6, fps: 9, loop: true, scale: 1.06 },
    backAttack: {
      url: lucien('back-attack'),
      faces: 'right',
      frames: 6,
      fps: 12,
      loop: false,
      scale: 1.19,
      cellAspect: 680 / CELL,
    },
  },
};

/**
 * 비스듬한 탑뷰용 이름: 앞, 뒤, 왼쪽, 오른쪽 네 방향에 자세 세 가지.
 * 한 손에 무기를 든 캐릭터는 옆모습을 뒤집으면 무기 든 손이 바뀌므로 왼쪽과 오른쪽을 따로 둔다.
 */
export type CardinalClip =
  | 'frontIdle'
  | 'frontWalk'
  | 'frontAttack'
  | 'backIdle'
  | 'backWalk'
  | 'backAttack'
  | 'leftIdle'
  | 'leftWalk'
  | 'leftAttack'
  | 'rightIdle'
  | 'rightWalk'
  | 'rightAttack';

const lucienTop = (file: string) => `/assets/sprites/lucien-top/${file}.png`;

const walkLoop = { frames: 6, fps: 9, loop: true } as const;
const thrust = { frames: 6, fps: 12, loop: false } as const;
const breath = { frames: 4, fps: 4.5, loop: true } as const;

/**
 * 탑뷰용 리시엔(종이 오리기 화풍). 어느 방향에서나 칼은 오른손에 든다. 그래서 어떤 그림도 뒤집지 않는다.
 * 왼쪽을 볼 때는 칼 든 손이 몸 건너편에, 오른쪽을 볼 때는 화면 앞쪽에 온다.
 * scale은 방향과 자세가 바뀌어도 머리 크기와 키가 튀지 않도록 맞춘 값이다.
 */
export const LUCIEN_CARDINAL: SpriteSheet<CardinalClip> = {
  height: 2.0,
  clips: {
    frontIdle: { url: lucienTop('front-idle'), faces: 'center', ...breath, scale: 1 },
    frontWalk: { url: lucienTop('front-walk'), faces: 'center', ...walkLoop, scale: 1.08 },
    frontAttack: {
      url: lucienTop('front-attack'),
      faces: 'center',
      ...thrust,
      scale: 1.23,
      footMargin: 120,
    },
    backIdle: { url: lucienTop('back-idle'), faces: 'center', ...breath, scale: 1 },
    backWalk: { url: lucienTop('back-walk'), faces: 'center', ...walkLoop, scale: 1.03 },
    backAttack: { url: lucienTop('back-attack'), faces: 'center', ...thrust, scale: 1.02 },
    leftIdle: { url: lucienTop('left-idle'), faces: 'left', ...breath, scale: 1 },
    leftWalk: { url: lucienTop('left-walk'), faces: 'left', ...walkLoop, scale: 0.96 },
    leftAttack: {
      url: lucienTop('left-attack'),
      faces: 'left',
      ...thrust,
      scale: 0.91,
      cellAspect: 680 / CELL,
    },
    rightIdle: { url: lucienTop('right-idle'), faces: 'right', ...breath, scale: 1 },
    rightWalk: { url: lucienTop('right-walk'), faces: 'right', ...walkLoop, scale: 1 },
    rightAttack: {
      url: lucienTop('right-attack'),
      faces: 'right',
      ...thrust,
      scale: 1,
      cellAspect: 680 / CELL,
    },
  },
};

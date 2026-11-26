import type { Clip } from '../game/logic/animation';

/** 아틀라스 한 칸의 크기(px). tools/slice.py가 이 규격으로 잘라 낸다. */
export const CELL = 512;
/** 칸 아래에서 발 기준선까지의 여백(px). */
export const FOOT_MARGIN = 24;
/** 칸 안에서 캐릭터가 차지하는 최대 높이(px). */
export const FIGURE_HEIGHT = CELL - FOOT_MARGIN * 2;

export interface SpriteClip extends Clip {
  url: string;
  /** 그림 속 캐릭터가 원래 바라보는 화면 방향. 반대쪽을 볼 때만 좌우를 뒤집는다. */
  faces: 'left' | 'right';
  /** 띠마다 그려진 크기가 조금씩 달라, 머리 크기를 기준으로 맞추는 보정값. */
  scale: number;
  /** 칸의 가로 ÷ 세로. 몸이 크게 움직이는 동작은 칸을 넓게 자른다. 적지 않으면 정사각형(1). */
  cellAspect?: number;
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
    // 앞모습 대기와 걷기는 왼쪽 아래를, 공격과 뒷모습은 오른쪽을 보고 그려져 있다.
    idle: { url: lucien('idle'), faces: 'left', frames: 4, fps: 4.5, loop: true, scale: 1 },
    walk: { url: lucien('walk'), faces: 'left', frames: 6, fps: 9, loop: true, scale: 1 },
    attack: { url: lucien('attack'), faces: 'right', frames: 6, fps: 12, loop: false, scale: 0.94 },
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

import type { Clip } from '../game/logic/animation';

/** 아틀라스 한 칸의 크기(px). tools/slice.py가 이 규격으로 잘라 낸다. */
export const CELL = 512;
/** 칸 아래에서 발 기준선까지의 여백(px). */
export const FOOT_MARGIN = 24;
/** 칸 안에서 캐릭터가 차지하는 최대 높이(px). */
export const FIGURE_HEIGHT = CELL - FOOT_MARGIN * 2;

export interface SpriteClip extends Clip {
  url: string;
  /** 띠마다 그려진 크기가 조금씩 달라, 머리 크기를 기준으로 맞추는 보정값. */
  scale: number;
}

export interface SpriteSheet<Name extends string> {
  /** 캐릭터의 월드 높이. 건물과 같은 단위다. */
  height: number;
  clips: Record<Name, SpriteClip>;
}

export type HeroClip = 'idle' | 'walk' | 'attack' | 'backIdle' | 'backWalk';

const lucien = (file: string) => `/assets/sprites/lucien/${file}.png`;

export const LUCIEN: SpriteSheet<HeroClip> = {
  height: 2.0,
  clips: {
    idle: { url: lucien('idle'), frames: 4, fps: 4.5, loop: true, scale: 1 },
    walk: { url: lucien('walk'), frames: 6, fps: 9, loop: true, scale: 1 },
    attack: { url: lucien('attack'), frames: 6, fps: 12, loop: false, scale: 1 },
    backIdle: { url: lucien('back-idle'), frames: 4, fps: 4.5, loop: true, scale: 1.06 },
    backWalk: { url: lucien('back-walk'), frames: 6, fps: 9, loop: true, scale: 1.06 },
  },
};

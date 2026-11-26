import { describe, expect, it } from 'vitest';
import { frameAt, isFinished } from '../src/game/logic/animation';
import { CELL, FIGURE_HEIGHT, FOOT_MARGIN, LUCIEN } from '../src/data/sprites';

describe('프레임 계산', () => {
  const walk = { frames: 6, fps: 10, loop: true };
  const attack = { frames: 6, fps: 12, loop: false };

  it('반복 동작은 처음으로 돌아간다', () => {
    expect(frameAt(walk, 0)).toBe(0);
    expect(frameAt(walk, 0.55)).toBe(5);
    expect(frameAt(walk, 0.6)).toBe(0);
    expect(isFinished(walk, 100)).toBe(false);
  });

  it('한 번만 재생하는 동작은 마지막 프레임에서 멈춘다', () => {
    expect(frameAt(attack, 10)).toBe(5);
    expect(isFinished(attack, 0.49)).toBe(false);
    expect(isFinished(attack, 0.5)).toBe(true);
  });
});

describe('리시엔 스프라이트 규격', () => {
  it('칸 규격이 자르기 도구와 같다', () => {
    expect(CELL).toBe(512);
    expect(FOOT_MARGIN).toBe(24);
    expect(FIGURE_HEIGHT).toBe(464);
  });

  it('앞뒤 대기와 걷기가 같은 프레임 수와 속도를 쓴다', () => {
    const { idle, walk, backIdle, backWalk } = LUCIEN.clips;
    expect(backIdle.frames).toBe(idle.frames);
    expect(backWalk.frames).toBe(walk.frames);
    expect(backWalk.fps).toBe(walk.fps);
  });
});

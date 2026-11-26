import { describe, expect, it } from 'vitest';
import { LUCIEN, type HeroClip } from '../src/data/sprites';

describe('리시엔 스프라이트 표', () => {
  it('앞모습과 뒷모습 자세가 짝을 이룬다', () => {
    const pairs: [HeroClip, HeroClip][] = [
      ['idle', 'backIdle'],
      ['walk', 'backWalk'],
      ['attack', 'backAttack'],
    ];
    for (const [front, back] of pairs) {
      expect(LUCIEN.clips[back].frames).toBe(LUCIEN.clips[front].frames);
      expect(LUCIEN.clips[back].fps).toBe(LUCIEN.clips[front].fps);
      expect(LUCIEN.clips[back].loop).toBe(LUCIEN.clips[front].loop);
    }
  });

  it('모든 그림에 원래 바라보는 방향이 적혀 있다', () => {
    for (const clip of Object.values(LUCIEN.clips)) expect(['left', 'right']).toContain(clip.faces);
  });
});

import { Group } from 'three';
import { describe, expect, it } from 'vitest';
import type { CollisionSpace, SpriteAnimator } from '../src/game/capabilities';
import type { CharacterController, MoveIntent } from '../src/game/control/controller';
import { Hero } from '../src/game/entities/Hero';
import type { Vec2 } from '../src/game/logic/view';
import type { HeroClip } from '../src/data/sprites';

/** 그림 없이 동작 이름만 기억하는 가짜 스프라이트. */
class FakeSprite implements SpriteAnimator<HeroClip> {
  readonly root = new Group();
  clip: HeroClip = 'idle';
  finished = false;
  flip = false;
  restarts = 0;
  play(clip: HeroClip, restart = false): void {
    this.clip = clip;
    if (restart) this.restarts++;
  }
  setFlip(flip: boolean): void {
    this.flip = flip;
  }
  setPosition(x: number, z: number): void {
    this.root.position.set(x, 0, z);
  }
  update(): void {}
}

/** 시키는 대로만 움직이는 가짜 조종자. */
class ScriptedController implements CharacterController {
  intent: MoveIntent | null = null;
  attack = false;
  stops = 0;
  moveIntent(): MoveIntent | null {
    return this.intent;
  }
  takeAttack(): boolean {
    const queued = this.attack;
    this.attack = false;
    return queued;
  }
  stop(): void {
    this.stops++;
  }
}

const openField: CollisionSpace = {
  move: (from, dir, distance) => ({ x: from.x + dir.x * distance, z: from.z + dir.z * distance }),
  clamp: (point) => ({ ...point }),
};
const wall: CollisionSpace = { move: (from) => ({ ...from }), clamp: (point) => ({ ...point }) };

const BODY = { speed: 4, radius: 0.4, height: 2 };
const START: Vec2 = { x: 0, z: 0 };
const TOWARD_CAMERA: MoveIntent = { dir: { x: Math.SQRT1_2, z: Math.SQRT1_2 }, maxDistance: Infinity };
const AWAY_FROM_CAMERA: MoveIntent = { dir: { x: -Math.SQRT1_2, z: -Math.SQRT1_2 }, maxDistance: Infinity };

function setup(space: CollisionSpace = openField) {
  const sprite = new FakeSprite();
  const controller = new ScriptedController();
  const hero = new Hero(sprite, BODY, space, controller, START);
  const tick = (frames = 1) => {
    for (let i = 0; i < frames; i++) hero.update(0.1);
  };
  return { sprite, controller, hero, tick };
}

describe('주인공의 행동 상태', () => {
  it('가만히 있으면 대기 동작을 유지한다', () => {
    const { sprite, hero, tick } = setup();
    tick(3);
    expect(sprite.clip).toBe('idle');
    expect(hero.position).toEqual(START);
  });

  it('이동 의사가 생기면 걷고, 사라지면 다시 선다', () => {
    const { sprite, controller, hero, tick } = setup();
    controller.intent = TOWARD_CAMERA;
    tick(3);
    expect(sprite.clip).toBe('walk');
    expect(hero.position.x).toBeGreaterThan(0);
    controller.intent = null;
    tick();
    expect(sprite.clip).toBe('idle');
  });

  it('카메라에서 멀어지는 쪽으로 걸으면 뒷모습 그림을 쓴다', () => {
    const { sprite, controller, tick } = setup();
    controller.intent = AWAY_FROM_CAMERA;
    tick(3);
    expect(sprite.clip).toBe('backWalk');
    controller.intent = null;
    tick();
    expect(sprite.clip).toBe('backIdle');
  });

  it('남은 거리보다 멀리 가지 않는다', () => {
    const { controller, hero, tick } = setup();
    controller.intent = { dir: { x: 1, z: 0 }, maxDistance: 0.1 };
    tick(2);
    expect(hero.position.x).toBeCloseTo(0.1, 6);
  });

  it('벽에 막히면 제자리걸음을 하지 않고 이동 계획을 버린다', () => {
    const { sprite, controller, hero, tick } = setup(wall);
    controller.intent = TOWARD_CAMERA;
    tick(3);
    expect(sprite.clip).toBe('idle');
    expect(hero.position).toEqual(START);
    expect(controller.stops).toBeGreaterThan(0);
  });

  it('공격하면 이동을 멈추고, 동작이 끝난 뒤에야 대기로 돌아온다', () => {
    const { sprite, controller, hero, tick } = setup();
    controller.intent = TOWARD_CAMERA;
    tick(2);
    const before = { ...hero.position };
    controller.attack = true;
    tick(3);
    expect(sprite.clip).toBe('attack');
    expect(sprite.restarts).toBe(1);
    expect(hero.position).toEqual(before);

    sprite.finished = true;
    controller.intent = null;
    tick();
    expect(sprite.clip).toBe('idle');
  });

  it('바로 옮기면 진행 중인 이동 계획도 버린다', () => {
    const { controller, hero } = setup();
    hero.placeAt({ x: 3, z: -2 });
    expect(hero.position).toEqual({ x: 3, z: -2 });
    expect(controller.stops).toBe(1);
  });
});

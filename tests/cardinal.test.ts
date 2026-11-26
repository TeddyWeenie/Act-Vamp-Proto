import { Group } from 'three';
import { describe, expect, it } from 'vitest';
import { LUCIEN_CARDINAL, type CardinalClip } from '../src/data/sprites';
import type { CollisionSpace, SpriteAnimator } from '../src/game/capabilities';
import type { CharacterController, MoveIntent } from '../src/game/control/controller';
import { CardinalHero } from '../src/game/entities/CardinalHero';
import { CardinalFacing } from '../src/game/logic/facing';
import { cardinalFacingFromMove, type Facing } from '../src/game/logic/movement';
import { groundToScreen, inputToGround, topView, towardCamera } from '../src/game/logic/view';

const TOP = topView();
const FRONT: Facing = { back: false, left: true, side: false };
const move = (ix: number, iy: number) => inputToGround(ix, iy, TOP.azimuth);
const facing = (ix: number, iy: number, previous = FRONT) =>
  cardinalFacingFromMove(move(ix, iy), previous, TOP.azimuth);

describe('비스듬한 탑뷰의 방향 계산', () => {
  it('화면의 위아래좌우가 지면의 축과 나란하다', () => {
    expect(move(1, 0).x).toBeCloseTo(1, 6);
    expect(move(1, 0).z).toBeCloseTo(0, 6);
    expect(move(0, 1).x).toBeCloseTo(0, 6);
    expect(move(0, 1).z).toBeCloseTo(-1, 6);
    expect(groundToScreen({ x: 0, z: 1 }, TOP.azimuth).up).toBeCloseTo(-1, 6);
  });

  it('카메라는 돌아가지 않고 남쪽 위에서 내려다본다', () => {
    const cam = towardCamera(TOP.elevation, TOP.azimuth);
    expect(cam.x).toBeCloseTo(0, 6);
    expect(cam.z).toBeGreaterThan(0);
    expect(cam.y).toBeGreaterThan(0);
  });
});

describe('4방향 고르기', () => {
  it('아래로 걸으면 앞모습, 위로 걸으면 뒷모습이다', () => {
    expect(facing(0, -1)).toMatchObject({ back: false, side: false });
    expect(facing(0, 1)).toMatchObject({ back: true, side: false });
  });

  it('옆으로 걸으면 옆모습이고 걷는 쪽을 본다', () => {
    expect(facing(1, 0)).toMatchObject({ side: true, left: false });
    expect(facing(-1, 0)).toMatchObject({ side: true, left: true });
  });

  it('대각선으로 걸으면 보던 축을 유지해서 그림이 떨리지 않는다', () => {
    expect(facing(1, 1, FRONT)).toMatchObject({ side: false, back: true });
    const side: Facing = { back: false, left: false, side: true };
    expect(facing(1, 1, side)).toMatchObject({ side: true, left: false });
    expect(facing(-1, -1, side)).toMatchObject({ side: true, left: true });
  });

  it('멈춰 있으면 방향이 바뀌지 않는다', () => {
    const side: Facing = { back: true, left: true, side: true };
    expect(cardinalFacingFromMove({ x: 0, z: 0 }, side, TOP.azimuth)).toBe(side);
  });
});

class FakeSprite implements SpriteAnimator<CardinalClip> {
  readonly root = new Group();
  clip: CardinalClip = 'frontIdle';
  finished = false;
  left = false;
  play(clip: CardinalClip): void {
    this.clip = clip;
  }
  faceLeft(left: boolean): void {
    this.left = left;
  }
  setPosition(): void {}
  update(): void {}
}

class ScriptedController implements CharacterController {
  intent: MoveIntent | null = null;
  attack = false;
  moveIntent(): MoveIntent | null {
    return this.intent;
  }
  takeAttack(): boolean {
    const queued = this.attack;
    this.attack = false;
    return queued;
  }
  stop(): void {}
}

const openField: CollisionSpace = {
  move: (from, dir, distance) => ({ x: from.x + dir.x * distance, z: from.z + dir.z * distance }),
  clamp: (point) => ({ ...point }),
};

function setup() {
  const sprite = new FakeSprite();
  const controller = new ScriptedController();
  const hero = new CardinalHero(
    sprite,
    { speed: 4, radius: 0.4, height: 2 },
    openField,
    controller,
    { x: 0, z: 0 },
    new CardinalFacing(TOP.azimuth),
  );
  const walk = (ix: number, iy: number) => {
    controller.intent = { dir: move(ix, iy), maxDistance: Infinity };
    hero.update(0.1);
    hero.update(0.1);
  };
  const stop = () => {
    controller.intent = null;
    hero.update(0.1);
  };
  const attack = () => {
    controller.attack = true;
    hero.update(0.1);
    hero.update(0.1);
  };
  return { sprite, walk, stop, attack };
}

describe('4방향 주인공', () => {
  it('걷는 방향마다 그 방향의 걷기 그림을 쓴다', () => {
    const { sprite, walk } = setup();
    walk(0, -1);
    expect(sprite.clip).toBe('frontWalk');
    walk(0, 1);
    expect(sprite.clip).toBe('backWalk');
    walk(1, 0);
    expect(sprite.clip).toBe('rightWalk');
    expect(sprite.left).toBe(false);
    walk(-1, 0);
    expect(sprite.clip).toBe('leftWalk');
    expect(sprite.left).toBe(true);
  });

  it('멈추거나 공격해도 보던 방향의 그림을 쓴다', () => {
    const { sprite, walk, stop, attack } = setup();
    walk(-1, 0);
    stop();
    expect(sprite.clip).toBe('leftIdle');
    attack();
    expect(sprite.clip).toBe('leftAttack');
    expect(sprite.left).toBe(true);

    const right = setup();
    right.walk(1, 0);
    right.stop();
    expect(right.sprite.clip).toBe('rightIdle');
    right.attack();
    expect(right.sprite.clip).toBe('rightAttack');
    expect(right.sprite.left).toBe(false);

    const second = setup();
    second.walk(0, 1);
    second.attack();
    expect(second.sprite.clip).toBe('backAttack');
  });
});

describe('탑뷰 시안 스프라이트 표', () => {
  const VIEWS = ['front', 'back', 'left', 'right'] as const;

  it('네 방향의 같은 자세는 길이와 빠르기가 같다', () => {
    for (const pose of ['Idle', 'Walk', 'Attack'] as const) {
      const [front, ...others] = VIEWS.map((view) => LUCIEN_CARDINAL.clips[`${view}${pose}`]);
      for (const clip of others) {
        expect(clip.frames).toBe(front.frames);
        expect(clip.fps).toBe(front.fps);
        expect(clip.loop).toBe(front.loop);
      }
    }
  });

  it('칼 든 손이 바뀌지 않도록 어떤 그림도 뒤집지 않는다', () => {
    for (const [name, clip] of Object.entries(LUCIEN_CARDINAL.clips)) {
      const expected = name.startsWith('left') ? 'left' : name.startsWith('right') ? 'right' : 'center';
      expect(clip.faces).toBe(expected);
    }
  });

  it('왼쪽과 오른쪽은 서로 다른 그림 파일을 쓴다', () => {
    for (const pose of ['Idle', 'Walk', 'Attack'] as const) {
      expect(LUCIEN_CARDINAL.clips[`left${pose}`].url).not.toBe(LUCIEN_CARDINAL.clips[`right${pose}`].url);
    }
  });
});

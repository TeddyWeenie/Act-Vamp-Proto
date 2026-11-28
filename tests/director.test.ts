import { describe, expect, it } from 'vitest';
import { Escort } from '../src/game/control/Escort';
import { ScriptedController } from '../src/game/control/ScriptedController';
import { SwitchController } from '../src/game/control/SwitchController';
import { Trail } from '../src/game/control/TrailFollow';
import type { Vec2 } from '../src/game/logic/view';
import { ResultScene } from '../src/game/story/ResultScene';
import { StoryDirector } from '../src/game/story/StoryDirector';
import { TalkScene } from '../src/game/story/TalkScene';
import { CircleSpot, type StoryScene } from '../src/game/story/scene';
import type { DialogueScreen, ResultScreen } from '../src/game/story/screens';
import { CameraFocus } from '../src/game/systems/CameraFocus';
import { CollisionMap } from '../src/game/systems/CollisionMap';
import { INTRO, REACTOR_FIRST } from '../src/data/chapter1';
import type { Conversation } from '../src/story/Conversation';

/** 닫는 시점을 테스트가 정하는 가짜 장면. */
class FakeScene implements StoryScene {
  finished = false;
  began = 0;
  constructor(private readonly following: StoryScene | null = null) {}
  begin(): void {
    this.began++;
  }
  update(): void {}
  next(): StoryScene | null {
    return this.following;
  }
}

function setup() {
  const hero = { position: { x: 0, z: 0 } as Vec2 };
  const player = new ScriptedController();
  const scripted = new ScriptedController();
  const control = new SwitchController(player);
  const input = { pressed: false, takeInteract: () => input.pressed };
  const prompts: (string | null)[] = [];
  const prompt = { show: (text: string | null) => prompts.push(text) };
  let explored = 0;
  const listener = { exploring: () => explored++ };
  const second = new FakeScene();
  const first = new FakeScene(second);
  let unlocked = false;
  const hotspots = [
    new CircleSpot({ centre: { x: 3, z: 0 }, radius: 1.5, prompt: '말 걸기', open: () => first }),
    new CircleSpot({
      centre: { x: -5, z: 0 },
      radius: 2,
      prompt: null,
      when: () => unlocked,
      open: () => new FakeScene(),
    }),
  ];
  const director = new StoryDirector({ hero, control, player, scripted }, hotspots, input, prompt, listener);
  return {
    hero,
    player,
    scripted,
    control,
    input,
    prompts,
    first,
    second,
    director,
    explored: () => explored,
    unlock: () => (unlocked = true),
  };
}

describe('탐색과 장면 사이를 오가는 진행', () => {
  it('가까이 가면 안내를 띄우고, 누르기 전에는 장면을 열지 않는다', () => {
    const { hero, prompts, director, first } = setup();
    director.update(0.1);
    expect(prompts.at(-1)).toBeNull();
    hero.position = { x: 2, z: 0 };
    director.update(0.1);
    expect(prompts.at(-1)).toBe('말 걸기');
    expect(first.began).toBe(0);
    expect(director.busy).toBe(false);
  });

  it('장면이 도는 동안에는 연출이 주인공을 조종하고, 끝나면 플레이어에게 돌려준다', () => {
    const { hero, player, scripted, control, input, director, first, second, explored } = setup();
    hero.position = { x: 2, z: 0 };
    input.pressed = true;
    director.update(0.1);
    input.pressed = false;
    expect(first.began).toBe(1);
    expect(explored()).toBe(1);

    // 장면 중에는 플레이어의 공격 입력이 주인공에게 닿지 않는다.
    player.attack();
    scripted.attack();
    expect(control.takeAttack()).toBe(true);
    expect(control.takeAttack()).toBe(false);

    // 첫 장면이 끝나면 이어지는 장면으로 넘어간다.
    first.finished = true;
    director.update(0.1);
    expect(second.began).toBe(1);
    expect(explored()).toBe(1);

    second.finished = true;
    director.update(0.1);
    expect(director.busy).toBe(false);
    expect(explored()).toBe(2);
    // 장면 중에 쌓인 플레이어 입력은 버려진다.
    expect(control.takeAttack()).toBe(false);
  });

  it('조건이 붙은 자리는 조건이 맞을 때만, 다가가는 것만으로 열린다', () => {
    const { hero, director, unlock } = setup();
    hero.position = { x: -5, z: 0.5 };
    director.update(0.1);
    expect(director.busy).toBe(false);
    unlock();
    director.update(0.1);
    expect(director.busy).toBe(true);
  });
});

describe('대화 장면과 결과 장면', () => {
  it('대화를 끝까지 넘기면 고른 선택을 넘겨 다음 장면을 정한다', () => {
    let shown: Conversation | null = null;
    let close = () => {};
    const screen: DialogueScreen = {
      present: (talk, onClose) => {
        shown = talk;
        close = onClose;
      },
    };
    const picked: (string | null)[] = [];
    const scene = new TalkScene(screen, INTRO, (choice) => {
      picked.push(choice?.id ?? null);
      return null;
    });
    scene.begin();
    const talk = shown!;
    for (let i = 0; i < 3; i++) talk.advance();
    talk.choose('vampire');
    expect(scene.finished).toBe(false);
    close();
    expect(scene.finished).toBe(true);
    scene.next();
    expect(picked).toEqual(['vampire']);
  });

  it('선택지가 없는 대화와 결과 화면은 닫으면 끝난다', () => {
    let close = () => {};
    const dialogue: DialogueScreen = { present: (_talk, onClose) => (close = onClose) };
    const talk = new TalkScene(dialogue, REACTOR_FIRST);
    talk.begin();
    close();
    expect(talk.finished).toBe(true);
    expect(talk.next()).toBeNull();

    const result: ResultScreen = { present: (_content, onClose) => (close = onClose) };
    const after = new FakeScene();
    const scene = new ResultScene(
      result,
      { title: 't', heading: 'h', body: 'b', button: '계속' },
      () => after,
    );
    scene.begin();
    expect(scene.finished).toBe(false);
    close();
    expect(scene.finished).toBe(true);
    expect(scene.next()).toBe(after);
  });
});

describe('따라오는 일행', () => {
  it('멈춰 선 앞사람에게 겹쳐 서지 않고, 멀어지면 다시 따라간다', () => {
    const leader = { position: { x: 0, z: 0 } as Vec2 };
    const body = {
      position: { x: -1, z: 0 } as Vec2,
      placeAt: (point: Readonly<Vec2>) => (body.position = { ...point }),
    };
    const lead = new ScriptedController();
    const escort = new Escort(new Trail(leader), [{ body, lead, lag: 1.5 }]);
    expect(lead.moveIntent(body.position)).toBeNull();
    escort.follow();
    // 이미 가까이 있으면 더 다가가지 않는다.
    expect(lead.moveIntent(body.position)).toBeNull();
    for (let x = 0.25; x <= 4; x += 0.25) {
      leader.position = { x, z: 0 };
      escort.update(0.1);
    }
    expect(lead.moveIntent(body.position)?.dir.x).toBeCloseTo(1);
    escort.halt();
    expect(lead.moveIntent(body.position)).toBeNull();
  });

  it('길을 잃고 멀리 떨어지면 앞사람이 지나온 길 위로 데려온다', () => {
    const leader = { position: { x: 0, z: 0 } as Vec2 };
    const body = {
      position: { x: -1, z: 0 } as Vec2,
      placeAt: (point: Readonly<Vec2>) => (body.position = { ...point }),
    };
    const escort = new Escort(new Trail(leader), [{ body, lead: new ScriptedController(), lag: 1.5 }]);
    escort.follow();
    for (let x = 0.25; x <= 12; x += 0.25) {
      leader.position = { x, z: 0 };
      escort.update(0.1);
    }
    expect(body.position.x).toBeGreaterThan(5);
    expect(body.position.x).toBeLessThan(leader.position.x);
  });
});

describe('빈자리 확인과 카메라 초점', () => {
  it('건물, 맵 가장자리, 계단 위는 빈자리가 아니다', () => {
    const map = new CollisionMap({ minX: -10, maxX: 10, minZ: -10, maxZ: 10 });
    map.add({ footprint: { minX: 2, maxX: 4, minZ: -1, maxZ: 1 } });
    map.raise({ floorAt: (point) => (point.z > 6 ? 0.4 : 0) });
    expect(map.isClear({ x: 0, z: 0 }, 0.5)).toBe(true);
    expect(map.isClear({ x: 1.7, z: 0 }, 0.5)).toBe(false);
    expect(map.isClear({ x: 3, z: 0 }, 0.5)).toBe(false);
    expect(map.isClear({ x: 9.8, z: 0 }, 0.5)).toBe(false);
    expect(map.isClear({ x: 0, z: 7 }, 0.5)).toBe(false);
  });

  it('초점은 주인공을 따라가다가, 붙잡으면 그 자리에 머문다', () => {
    const hero = { position: { x: 1, z: 2 } as Vec2 };
    const focus = new CameraFocus(hero);
    expect(focus.position).toEqual({ x: 1, z: 2 });
    focus.hold({ x: 5, z: 5 });
    hero.position = { x: 9, z: 9 };
    expect(focus.position).toEqual({ x: 5, z: 5 });
    focus.release();
    expect(focus.position).toEqual({ x: 9, z: 9 });
  });
});

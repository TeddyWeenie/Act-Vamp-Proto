import { describe, expect, it } from 'vitest';
import { INTRO, REACTOR_FIRST } from '../src/data/chapter1';
import { GoTo } from '../src/game/control/GoTo';
import { ScriptedController } from '../src/game/control/ScriptedController';
import { SwitchController } from '../src/game/control/SwitchController';
import { Trail, TrailFollow } from '../src/game/control/TrailFollow';
import { Conversation } from '../src/story/Conversation';

describe('대화 진행', () => {
  it('대사를 차례로 넘기고 마지막에서 끝난다', () => {
    const talk = new Conversation(REACTOR_FIRST);
    expect(talk.line.name).toBe('에다');
    expect(talk.advance()).toBe(true);
    expect(talk.line.name).toBe('볼프');
    expect(talk.finished).toBe(false);
    expect(talk.advance()).toBe(true);
    expect(talk.finished).toBe(true);
    expect(talk.advance()).toBe(false);
  });

  it('선택지가 있는 대사는 고르기 전에는 넘어가지 않는다', () => {
    const talk = new Conversation(INTRO);
    for (let i = 0; i < 3; i++) talk.advance();
    expect(talk.choices).toHaveLength(3);
    expect(talk.advance()).toBe(false);
    expect(talk.choose('wolf')).toBe(true);
    expect(talk.choice?.id).toBe('wolf');
    expect(talk.finished).toBe(true);
    expect(talk.choose('human')).toBe(false);
  });
});

describe('연출용 조종', () => {
  it('자리로 가기는 도착하면 끝난다', () => {
    const go = new GoTo({ x: 3, z: 0 });
    expect(go.moveIntent({ x: 0, z: 0 })).toEqual({ dir: { x: 1, z: 0 }, maxDistance: 3 });
    expect(go.arrived).toBe(false);
    expect(go.moveIntent({ x: 2.99, z: 0 })).toBeNull();
    expect(go.arrived).toBe(true);
  });

  it('연출 조종자는 공격을 한 번만 내보내고, 이동 수단을 갈아 끼운다', () => {
    const lead = new ScriptedController();
    expect(lead.moveIntent({ x: 0, z: 0 })).toBeNull();
    lead.travel(new GoTo({ x: 0, z: 2 }));
    expect(lead.moveIntent({ x: 0, z: 0 })?.dir).toEqual({ x: 0, z: 1 });
    lead.attack();
    expect(lead.takeAttack()).toBe(true);
    expect(lead.takeAttack()).toBe(false);
  });

  it('조종자를 바꾸면 밀려 있던 공격 입력을 버린다', () => {
    const player = new ScriptedController();
    const scripted = new ScriptedController();
    const control = new SwitchController(player);
    player.attack();
    control.use(scripted);
    expect(control.takeAttack()).toBe(false);
    control.use(player);
    expect(control.takeAttack()).toBe(false);
  });

  it('뒤따르는 사람은 앞사람이 지나온 길을 거리를 두고 밟는다', () => {
    const leader = { position: { x: 0, z: 0 } };
    const trail = new Trail(leader);
    const follow = new TrailFollow(trail, 1.5);
    // 가까이 있으면 서 있는다.
    expect(follow.moveIntent({ x: 0.1, z: 0 })).toBeNull();
    // 앞사람이 동쪽으로 갔다가 남쪽으로 꺾는다.
    for (let x = 0.25; x <= 3; x += 0.25) {
      leader.position = { x, z: 0 };
      trail.update(0);
    }
    for (let z = 0.25; z <= 1; z += 0.25) {
      leader.position = { x: 3, z };
      trail.update(0);
    }
    const behind = trail.pointBehind(1.5);
    expect(behind.x).toBeCloseTo(2.5);
    expect(behind.z).toBeCloseTo(0);
    const intent = follow.moveIntent({ x: 0, z: 0 });
    expect(intent?.dir.x).toBeCloseTo(1);
    expect(intent?.maxDistance).toBeCloseTo(2.5);
  });
});

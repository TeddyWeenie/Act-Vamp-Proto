// @ts-nocheck 옛 규칙(rules.js)과 나란히 돌려 비교하는 검사라 타입 검사를 끈다.
import { describe, expect, it } from 'vitest';
import * as rules from '../src/core/rules.js';
import { Enemy } from '../src/battle/Enemy';
import { ENCOUNTERS } from '../src/data/encounters';
import { HERO_SPECS, START_SUPPLIES } from '../src/data/party';
import { Campaign } from '../src/story/Campaign';

const ORDER = ['attack', 'skill', 'support', 'guard', 'potion', 'skill', 'attack'];

/** 같은 명령 순서로 옛 규칙과 새 클래스를 함께 돌리며, 매 걸음 수치가 같은지 본다. */
function runSideBySide(choice, battleNumber, encounter, steps = 4000) {
  const old = rules.newGame();
  const campaign = new Campaign(HERO_SPECS, START_SUPPLIES);
  rules.choose(old, choice);
  campaign.choose(choice);
  if (battleNumber === 2) old.chapter = 2;
  rules.startBattle(old, battleNumber);
  const battle = campaign.engage(encounter);

  const same = () => {
    old.party.forEach((h, i) => {
      const m = battle.party[i];
      expect([m.hp, m.bp, m.mp, m.ap, m.guarding]).toEqual([h.hp, h.bp, h.mp, h.ap, h.guard]);
    });
    old.enemies.forEach((e, i) => {
      const m = battle.enemies[i];
      expect([m.hp, m.bp, m.ap]).toEqual([e.hp, e.bp, e.ap]);
    });
    expect(campaign.supplies.potions).toBe(old.potions);
  };

  same();
  let turn = 0;
  for (let i = 0; i < steps && old.phase === 'battle'; i++) {
    if (old.active === null) {
      rules.tick(old, 0.1);
      battle.tick(0.1);
    } else {
      const id = ORDER[turn++ % ORDER.length];
      // 번갈아 다른 적을 겨눈다.
      const aim = turn % 2;
      old.target = aim;
      battle.aim(battle.enemies[aim]);
      const a = rules.action(old, id);
      const b = battle.act(id);
      expect(b.ok).toBe(a.ok);
      if (!a.ok) {
        rules.action(old, 'attack');
        battle.act('attack');
      }
    }
    same();
  }
  expect(battle.phase).toBe(old.phase === 'battle' ? 'running' : old.phase);
  return { old, campaign, battle };
}

describe('전투 규칙을 클래스로 옮긴 결과', () => {
  it.each(['wolf', 'human', 'vampire'])('첫 전투가 옛 규칙과 걸음마다 같다(선택: %s)', (choice) => {
    const { old, campaign, battle } = runSideBySide(choice, 1, ENCOUNTERS.sentinels);
    expect(old.phase).toBe('victory');
    rules.reward(old);
    expect(campaign.claim(battle, ENCOUNTERS.sentinels)).toBe(true);
    old.party.forEach((h, i) => {
      const m = campaign.party[i];
      expect([m.level, m.xp, m.hp, m.maxHp, m.bp, m.maxBp, m.mp, m.maxMp, m.def]).toEqual([
        h.level,
        h.xp,
        h.hp,
        h.maxHp,
        h.bp,
        rules.totalBp(h),
        h.mp,
        h.maxMp,
        h.def,
      ]);
      expect([m.attackPower, m.speed, m.mag]).toEqual([rules.totalAtk(h), rules.totalSpd(h), h.mag]);
    });
    expect(campaign.supplies.save()).toEqual({ gold: old.gold, shards: old.shards, potions: old.potions });
    expect(campaign.stage).toBe(old.chapter);
  });

  it('보스전도 옛 규칙과 걸음마다 같다', () => {
    const { old } = runSideBySide('human', 2, ENCOUNTERS.bellkeeper);
    expect(['victory', 'defeat']).toContain(old.phase);
  });

  it('피해 계산: 배리어 흡수, 관통, 파쇄, 방어', () => {
    const dummy = () =>
      new Enemy({ id: 'd', name: '허수아비', hp: 80, bp: 20, atk: 0, def: 0, spd: 0, startAp: 70 });
    let t = dummy();
    expect(t.takeDamage(30)).toEqual({ hp: 10, bp: 20, broken: true });
    expect([t.hp, t.bp, t.ap]).toEqual([70, 0, 42]);
    t = dummy();
    t.takeDamage(30, 'pierce');
    expect([t.hp, t.bp]).toEqual([50, 20]);
    t = dummy();
    t.takeDamage(5, 'breaker');
    expect([t.hp, t.bp]).toEqual([80, 7]);
    t = dummy();
    t.brace();
    t.takeDamage(30, 'pierce');
    expect(t.hp).toBe(65);
    expect(t.guarding).toBe(false);
  });

  it('명령을 고르는 동안에는 시간이 멈추고, 쓸 수 없는 명령은 차례를 쓰지 않는다', () => {
    const campaign = new Campaign(HERO_SPECS, { gold: 0, shards: 0, potions: 0 });
    const battle = campaign.engage(ENCOUNTERS.sentinels);
    while (!battle.active) battle.tick(0.1);
    const actor = battle.active;
    const clock = battle.clock;
    battle.tick(5);
    expect(battle.clock).toBe(clock);
    expect(battle.act('potion')).toEqual({ ok: false, reason: '회복약이 없습니다.' });
    actor.spendMp(actor.mp);
    expect(battle.act('skill')).toEqual({ ok: false, reason: '마력이 부족합니다.' });
    expect(battle.active).toBe(actor);
    expect(battle.act('attack').ok).toBe(true);
    expect(battle.active).toBeNull();
  });

  it('선택은 한 번만 할 수 있고, 진 전투는 시작 전 상태로 되돌릴 수 있다', () => {
    const campaign = new Campaign(HERO_SPECS, START_SUPPLIES);
    expect(campaign.choose('wolf')).toBe(true);
    expect(campaign.party[0].maxBp).toBe(48);
    expect(campaign.choose('human')).toBe(false);
    const before = campaign.save();
    const battle = campaign.engage(ENCOUNTERS.sentinels);
    while (!battle.active) battle.tick(0.1);
    battle.act('potion');
    for (let i = 0; i < 50 && !battle.active; i++) battle.tick(0.1);
    expect(campaign.save()).not.toEqual(before);
    campaign.load(before);
    expect(campaign.save()).toEqual(before);
  });
});

import { describe, expect, it } from 'vitest';
import type { Enemy } from '../src/battle/Enemy';
import type { CommandId } from '../src/battle/commands';
import { ENCOUNTERS, type EncounterSpec } from '../src/data/encounters';
import { HERO_SPECS, START_SUPPLIES } from '../src/data/party';
import type { BattleOrders } from '../src/game/story/screens';
import { Campaign } from '../src/story/Campaign';
import { CommandPicker } from '../src/ui/battle/CommandPicker';

/** 적이 하나뿐인 전투. 겨눌 것이 없을 때를 확인한다. */
const LONE: EncounterSpec = {
  enemies: [ENCOUNTERS.sentinels.enemies[0]],
  reward: { gold: 0, shards: 0, potions: 0, xp: 0 },
  nextStage: 2,
};

/** 첫 아군의 차례가 올 때까지 전투를 돌리고, 그 아군의 명령 고르기를 시작한다. */
function stage(encounter: EncounterSpec = ENCOUNTERS.sentinels) {
  const campaign = new Campaign(HERO_SPECS, START_SUPPLIES);
  campaign.choose('wolf');
  const battle = campaign.engage(encounter);
  while (!battle.active) battle.tick(0.1);
  const sent: CommandId[] = [];
  const orders: BattleOrders = {
    command: (id) => sent.push(id),
    aim: (enemy: Enemy) => battle.aim(enemy),
  };
  const picker = new CommandPicker(battle, campaign.supplies, orders);
  const member = battle.active!;
  picker.offer(member);
  const indexOf = (id: CommandId) => member.commands.findIndex((command) => command.id === id);
  return { campaign, battle, picker, member, sent, indexOf };
}

describe('명령을 고르고 대상을 정하는 흐름', () => {
  it('위아래로 옮기면 끝에서 반대쪽 끝으로 넘어간다', () => {
    const { picker, member } = stage();
    expect(picker.index).toBe(0);
    picker.move(-1);
    expect(picker.index).toBe(member.commands.length - 1);
    picker.move(1);
    expect(picker.index).toBe(0);
    picker.point(2);
    expect(picker.index).toBe(2);
  });

  it('대상이 필요 없는 명령은 고르는 즉시 전한다', () => {
    const { picker, sent, indexOf } = stage();
    picker.choose(indexOf('guard'));
    expect(picker.pending).toBeNull();
    expect(sent).toEqual(['guard']);
  });

  it('적 하나를 향하는 명령은 적이 여럿이면 대상을 확인받는다', () => {
    const { picker, battle, sent, indexOf } = stage();
    picker.choose(indexOf('attack'));
    expect(picker.pending?.id).toBe('attack');
    expect(sent).toEqual([]);
    // 겨누는 동안에는 다른 명령으로 바꿀 수 없다.
    picker.choose(indexOf('guard'));
    picker.move(1);
    expect(picker.index).toBe(indexOf('attack'));
    expect(sent).toEqual([]);

    const first = battle.target;
    picker.cycleTarget(1);
    expect(battle.target).not.toBe(first);
    picker.cycleTarget(1);
    expect(battle.target).toBe(first);
    picker.cycleTarget(-1);
    const aimed = battle.target;

    picker.confirm();
    expect(sent).toEqual(['attack']);
    expect(battle.target).toBe(aimed);
    expect(picker.pending).toBeNull();
  });

  it('겨누다 취소하면 아무것도 전하지 않고 명령 고르기로 돌아간다', () => {
    const { picker, sent, indexOf } = stage();
    picker.choose(indexOf('skill'));
    expect(picker.pending).not.toBeNull();
    picker.cancel();
    expect(picker.pending).toBeNull();
    expect(sent).toEqual([]);
    picker.move(1);
    expect(picker.index).toBe(indexOf('skill') + 1);
  });

  it('겨누는 중에 적을 직접 누르면 그 적으로 정하고 전한다', () => {
    const { picker, battle, sent, indexOf } = stage();
    const other = battle.enemies[1]!;
    // 겨누기 전에는 적을 눌러도 아무 일이 없다.
    picker.aimAt(other);
    expect(sent).toEqual([]);
    picker.choose(indexOf('attack'));
    picker.aimAt(other);
    expect(battle.target).toBe(other);
    expect(sent).toEqual(['attack']);
  });

  it('살아 있는 적이 하나뿐이면 확인 없이 바로 전한다', () => {
    const { picker, sent, indexOf } = stage(LONE);
    picker.choose(indexOf('attack'));
    expect(picker.pending).toBeNull();
    expect(sent).toEqual(['attack']);
  });

  it('쓸 수 없는 명령은 흐리게 표시하되, 고르면 전투가 이유를 알려 주도록 그대로 전한다', () => {
    const { picker, campaign, member, sent, indexOf } = stage();
    campaign.supplies.add({ potions: -campaign.supplies.potions });
    const potion = member.commands[indexOf('potion')]!;
    expect(picker.isBlocked(potion)).toBe(true);
    expect(picker.isBlocked(member.commands[indexOf('attack')]!)).toBe(false);
    picker.choose(indexOf('potion'));
    expect(sent).toEqual(['potion']);
  });

  it('차례가 끝나면 고르던 것을 모두 잊는다', () => {
    const { picker, member, indexOf } = stage();
    picker.choose(indexOf('attack'));
    picker.offer(null);
    expect(picker.member).toBeNull();
    expect(picker.pending).toBeNull();
    picker.offer(member);
    expect(picker.index).toBe(0);
  });
});

describe('행동 순서 내다보기', () => {
  it('명령을 기다리는 아군이 맨 앞이고, 달라는 만큼만 돌려준다', () => {
    const { battle, member } = stage();
    const order = battle.upcoming(5);
    expect(order).toHaveLength(5);
    expect(order[0]).toBe(member);
  });

  it('내다본 첫 사람이 실제로 가장 먼저 행동한다', () => {
    const campaign = new Campaign(HERO_SPECS, START_SUPPLIES);
    campaign.choose('wolf');
    const battle = campaign.engage(ENCOUNTERS.sentinels);
    for (let turn = 0; turn < 12 && battle.phase === 'running'; turn++) {
      const expected = battle.upcoming(1)[0]!;
      let actor: string | null = null;
      while (!actor && battle.phase === 'running') {
        const hit = battle.tick(0.02).find((event) => event.type === 'ready' || event.type === 'hit');
        if (hit && 'actor' in hit) actor = hit.actor;
      }
      expect(actor).toBe(expected.id);
      if (battle.active) battle.act('guard');
    }
  });

  it('시간 막대는 행동 게이지가 찬 비율을 0~1로 읽는다', () => {
    const { battle, member } = stage();
    expect(battle.readiness(member)).toBe(1);
    for (const who of [...battle.party, ...battle.enemies]) {
      expect(battle.readiness(who)).toBeGreaterThanOrEqual(0);
      expect(battle.readiness(who)).toBeLessThanOrEqual(1);
    }
    battle.act('guard');
    expect(battle.readiness(member)).toBe(0);
  });

  it('쓰러진 사람은 순서에서 빠진다', () => {
    const { battle } = stage();
    const fallen = battle.enemies[0]!;
    fallen.takeDamage(99999);
    fallen.takeDamage(99999);
    expect(fallen.alive).toBe(false);
    expect(battle.upcoming(8)).not.toContain(fallen);
  });
});

describe('명령이 누구를 향하는지', () => {
  it('공격과 단일 기술은 적 하나, 룬 과부하는 적 전체, 나머지는 대상이 없다', () => {
    const aims = new Map<string, string>();
    for (const hero of HERO_SPECS) for (const command of hero.commands) aims.set(command.name, command.aim);
    expect(aims.get('기본 공격')).toBe('enemy');
    expect(aims.get('혈월 찌르기')).toBe('enemy');
    expect(aims.get('강철 파쇄')).toBe('enemy');
    expect(aims.get('룬 과부하')).toBe('enemies');
    expect(aims.get('방어')).toBe('none');
    expect(aims.get('회복약')).toBe('none');
  });
});

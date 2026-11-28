import type { DamageKind, DamageResult } from './Combatant';
import type { Enemy } from './Enemy';
import type { PartyMember } from './PartyMember';
import type { Supplies } from './Supplies';
import type { BattleEvent } from './events';

/** 숫자 1~5에 놓이는 명령의 자리. */
export type CommandId = 'attack' | 'skill' | 'support' | 'guard' | 'potion';

/** 명령이 실행될 때 볼 수 있는 전투의 모습. */
export interface CommandContext {
  readonly actor: PartyMember;
  readonly party: readonly PartyMember[];
  readonly enemies: readonly Enemy[];
  /** 플레이어가 고른 대상. 쓰러졌으면 살아 있는 다른 적이 들어온다. */
  readonly target: Enemy;
  readonly supplies: Supplies;
  readonly events: BattleEvent[];
}

/**
 * 차례가 온 아군이 고를 수 있는 행동 하나. 행동마다 perform을 다르게 구현한다.
 * 새 기술은 이 클래스를 이어받아 더하고, 전투 진행(Battle)은 고치지 않는다.
 */
export abstract class Command {
  constructor(
    readonly id: CommandId,
    readonly name: string,
    readonly cost: number,
    readonly tip: string,
  ) {}

  /** 지금 쓸 수 없으면 그 이유를 돌려준다. 마력 부족은 전투가 따로 살핀다. */
  blockedReason(_context: Pick<CommandContext, 'supplies'>): string | null {
    return null;
  }

  abstract perform(context: CommandContext): void;

  protected hit(
    context: CommandContext,
    target: Enemy,
    raw: number,
    kind: DamageKind = 'normal',
  ): DamageResult {
    const result = target.takeDamage(raw, kind);
    context.events.push({ type: 'hit', actor: context.actor.id, target: target.id, ...result });
    return result;
  }
}

/** 생명력 비율이 가장 낮은 동료. 쓰러진 동료가 가장 먼저 뽑힌다. */
function mostHurt(party: readonly PartyMember[]): PartyMember {
  return party.reduce((worst, member) =>
    member.hp / member.maxHp < worst.hp / worst.maxHp ? member : worst,
  );
}

/** 기본 공격: 배리어부터 깎고, 마력을 조금 되찾는다. */
export class BasicAttack extends Command {
  constructor(private readonly mpGain = 3) {
    super('attack', '기본 공격', 0, `배리어부터 피해 · MP ${mpGain} 회복`);
  }

  perform(context: CommandContext): void {
    const { actor, target } = context;
    this.hit(context, target, actor.attackPower - target.def);
    actor.restoreMp(this.mpGain);
  }
}

/** 배리어를 무시하고 생명력을 찌르며, 준 피해의 일부를 흡수한다(혈월 찌르기). */
export class PiercingDrain extends Command {
  constructor(
    name: string,
    cost: number,
    tip: string,
    private readonly attackRatio = 0.6,
    private readonly drainRatio = 0.4,
  ) {
    super('skill', name, cost, tip);
  }

  perform(context: CommandContext): void {
    const { actor, target } = context;
    const dealt = this.hit(context, target, actor.mag + actor.attackPower * this.attackRatio, 'pierce');
    actor.heal(Math.round(dealt.hp * this.drainRatio));
  }
}

/** 배리어만 크게 깎는다. 깨지면 대상의 행동이 늦어진다(강철 파쇄). */
export class BarrierBreak extends Command {
  constructor(
    name: string,
    cost: number,
    tip: string,
    private readonly bonus = 8,
  ) {
    super('skill', name, cost, tip);
  }

  perform(context: CommandContext): void {
    this.hit(context, context.target, context.actor.attackPower + this.bonus, 'breaker');
  }
}

/** 살아 있는 적 전체에 마법 피해를 주고 행동 게이지를 민다(룬 과부하). */
export class Overload extends Command {
  constructor(
    name: string,
    cost: number,
    tip: string,
    private readonly magicRatio = 1.25,
    private readonly weaponBonus = 3,
    private readonly gaugeDelay = 15,
  ) {
    super('skill', name, cost, tip);
  }

  perform(context: CommandContext): void {
    const { actor } = context;
    for (const enemy of context.enemies) {
      if (!enemy.alive) continue;
      this.hit(context, enemy, actor.mag * this.magicRatio + actor.weaponLevel * this.weaponBonus);
      enemy.delay(this.gaugeDelay);
    }
  }
}

/** 살아 있는 아군 전체의 배리어를 채운다. 필요하면 쓴 사람이 방어 자세도 잡는다(붉은 서약, 군단의 포효). */
export class RallyBarrier extends Command {
  constructor(
    name: string,
    cost: number,
    tip: string,
    private readonly amount: number,
    private readonly selfGuard = false,
  ) {
    super('support', name, cost, tip);
  }

  perform(context: CommandContext): void {
    for (const member of context.party) {
      if (!member.alive) continue;
      member.shield(this.amount);
      context.events.push({ type: 'heal', target: member.id, text: '배리어 회복' });
    }
    if (this.selfGuard) context.actor.brace();
  }
}

/** 가장 위급한 동료의 생명력을 회복한다. 쓰러진 동료도 일으킨다(수복 술식). */
export class Mend extends Command {
  constructor(
    name: string,
    cost: number,
    tip: string,
    private readonly amount: number,
  ) {
    super('support', name, cost, tip);
  }

  perform(context: CommandContext): void {
    const target = mostHurt(context.party);
    target.heal(this.amount);
    context.events.push({ type: 'heal', target: target.id, text: `+${this.amount} HP` });
  }
}

/** 방어: 다음 피격을 절반으로 줄이고 배리어를 조금 채운다. */
export class Guard extends Command {
  constructor(private readonly barrier = 15) {
    super('guard', '방어', 0, `다음 피격 피해 50% 감소 · BP ${barrier} 회복`);
  }

  perform(context: CommandContext): void {
    context.actor.brace();
    context.actor.shield(this.barrier);
    context.events.push({ type: 'heal', target: context.actor.id, text: '방어' });
  }
}

/** 회복약: 일행의 물자를 하나 써서 가장 위급한 동료를 회복한다. */
export class Potion extends Command {
  constructor(private readonly amount = 45) {
    super('potion', '회복약', 0, `가장 위급한 동료 HP ${amount} 회복 · 소생 가능`);
  }

  override blockedReason(context: Pick<CommandContext, 'supplies'>): string | null {
    return context.supplies.potions < 1 ? '회복약이 없습니다.' : null;
  }

  perform(context: CommandContext): void {
    context.supplies.usePotion();
    const target = mostHurt(context.party);
    target.heal(this.amount);
    context.events.push({ type: 'heal', target: target.id, text: `+${this.amount} HP` });
  }
}

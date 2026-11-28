import type { Enemy } from './Enemy';
import type { PartyMember } from './PartyMember';
import type { Supplies } from './Supplies';
import type { Command, CommandId } from './commands';
import type { BattleEvent } from './events';

export type BattlePhase = 'running' | 'victory' | 'defeat';

export type ActResult =
  | { readonly ok: false; readonly reason: string }
  | { readonly ok: true; readonly command: Command; readonly events: readonly BattleEvent[] };

/** 행동 게이지가 차는 빠르기: 초당 민첩 × 이 값. 100이 되면 행동한다. */
const GAUGE_RATE = 1.5;
const GAUGE_FULL = 100;
/** 아군 배리어가 초당 저절로 차는 양. */
const BARRIER_REGEN = 0.7;
/** 아군이 전투를 시작할 때의 게이지: 첫 사람이 이만큼, 뒤로 갈수록 줄어든다. */
const PARTY_START_AP = 55;
const PARTY_START_STEP = 12;

/**
 * 액티브 턴 전투 한 판의 진행. 시간이 흐르면 민첩에 따라 행동 게이지가 차고,
 * 아군의 게이지가 다 차면 명령을 고를 때까지 시간이 멈춘다. 적은 게이지가 차는 대로 바로 공격한다.
 * 누가 어떤 기술을 가졌는지는 모르고, 차례가 온 아군이 가진 명령을 실행할 뿐이다.
 */
export class Battle {
  private clockValue = 0;
  private activeIndex: number | null = null;
  private targetIndex = 0;
  private phaseValue: BattlePhase = 'running';

  constructor(
    readonly party: readonly PartyMember[],
    readonly enemies: readonly Enemy[],
    private readonly supplies: Supplies,
  ) {
    party.forEach((member, i) => member.enterBattle(PARTY_START_AP - i * PARTY_START_STEP));
  }

  get phase(): BattlePhase {
    return this.phaseValue;
  }

  get clock(): number {
    return this.clockValue;
  }

  /** 명령을 기다리는 아군. 없으면 시간이 흐르는 중이다. */
  get active(): PartyMember | null {
    return this.activeIndex === null ? null : this.party[this.activeIndex]!;
  }

  /** 지금 겨누고 있는 적. 쓰러졌으면 살아 있는 다른 적이다. */
  get target(): Enemy | null {
    const chosen = this.enemies[this.targetIndex];
    if (chosen?.alive) return chosen;
    return this.enemies.find((enemy) => enemy.alive) ?? null;
  }

  /** 겨눌 적을 바꾼다. 쓰러진 적은 고를 수 없다. */
  aim(enemy: Enemy): boolean {
    const index = this.enemies.indexOf(enemy);
    if (index < 0 || !enemy.alive) return false;
    this.targetIndex = index;
    return true;
  }

  /** 시간을 dt초 흘린다. 명령을 기다리는 동안에는 아무 일도 일어나지 않는다. */
  tick(dt: number): BattleEvent[] {
    if (this.phaseValue !== 'running' || this.activeIndex !== null) return [];
    const events: BattleEvent[] = [];
    this.clockValue += dt;

    for (const member of this.party) {
      if (!member.alive) continue;
      member.charge(member.speed * dt * GAUGE_RATE, GAUGE_FULL);
      member.shield(dt * BARRIER_REGEN);
    }
    const ready = this.party.findIndex((member) => member.alive && member.ap >= GAUGE_FULL);
    if (ready >= 0) {
      this.activeIndex = ready;
      return [{ type: 'ready', actor: this.party[ready]!.id }];
    }

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.charge(enemy.spd * dt * GAUGE_RATE);
      if (enemy.ap < GAUGE_FULL) continue;
      enemy.spendTurn();
      const standing = this.party.filter((member) => member.alive);
      if (!standing.length) break;
      const victim = this.pickVictim(enemy, standing);
      const result = victim.takeDamage(enemy.atk - victim.def);
      events.push({ type: 'hit', actor: enemy.id, target: victim.id, ...result });
    }

    if (this.party.every((member) => !member.alive)) {
      this.phaseValue = 'defeat';
      events.push({ type: 'defeat' });
    }
    return events;
  }

  /** 차례가 온 아군에게 명령을 내린다. 쓸 수 없는 명령이면 차례와 자원을 쓰지 않는다. */
  act(id: CommandId): ActResult {
    const actor = this.active;
    if (this.phaseValue !== 'running' || !actor) {
      return { ok: false, reason: '행동 게이지가 찬 동료를 기다려 주세요.' };
    }
    const command = actor.commands.find((candidate) => candidate.id === id);
    if (!command) return { ok: false, reason: '알 수 없는 행동입니다.' };
    if (actor.mp < command.cost) return { ok: false, reason: '마력이 부족합니다.' };
    const blocked = command.blockedReason({ supplies: this.supplies });
    if (blocked) return { ok: false, reason: blocked };
    const target = this.target;
    if (!target) return { ok: false, reason: '공격할 적이 없습니다.' };

    const events: BattleEvent[] = [];
    actor.spendMp(command.cost);
    command.perform({
      actor,
      party: this.party,
      enemies: this.enemies,
      target,
      supplies: this.supplies,
      events,
    });
    actor.spendTurn();
    this.activeIndex = null;

    if (this.enemies.every((enemy) => !enemy.alive)) {
      this.phaseValue = 'victory';
      events.push({ type: 'victory' });
    }
    return { ok: true, command, events };
  }

  /** 적이 때릴 아군을 고른다. 전투 시각과 공격력으로 정해져서 같은 상황에서는 늘 같은 대상을 고른다. */
  private pickVictim(enemy: Enemy, standing: readonly PartyMember[]): PartyMember {
    return standing[Math.floor(this.clockValue * 7 + enemy.atk) % standing.length]!;
  }
}

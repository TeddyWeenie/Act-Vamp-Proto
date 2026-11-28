import type { Battle } from '../../battle/Battle';
import type { Enemy } from '../../battle/Enemy';
import type { PartyMember } from '../../battle/PartyMember';
import type { Supplies } from '../../battle/Supplies';
import type { Command } from '../../battle/commands';
import type { BattleOrders } from '../../game/story/screens';

/**
 * 플레이어가 명령을 고르고 대상을 정하는 과정.
 * 화면이 어떻게 생겼는지는 모르고, 지금 무엇이 골라져 있는지만 안다. 그래서 화면 없이도 검사할 수 있다.
 * 흐름: 명령 고르기 → (적 하나를 향하는 명령이고 살아 있는 적이 여럿이면) 대상 겨누기 → 명령 전달.
 */
export class CommandPicker {
  private memberValue: PartyMember | null = null;
  private indexValue = 0;
  private pendingValue: Command | null = null;

  constructor(
    private readonly battle: Battle,
    private readonly supplies: Supplies,
    private readonly orders: BattleOrders,
  ) {}

  /** 명령을 고르고 있는 아군. null이면 고를 차례가 아니다. */
  get member(): PartyMember | null {
    return this.memberValue;
  }

  /** 지금 가리키고 있는 명령의 순번. */
  get index(): number {
    return this.indexValue;
  }

  /** 대상을 기다리는 명령. null이면 아직 명령을 고르는 중이다. */
  get pending(): Command | null {
    return this.pendingValue;
  }

  /** 겨눌 수 있는 적들. */
  get targets(): Enemy[] {
    return this.battle.enemies.filter((enemy) => enemy.alive);
  }

  /** 차례가 온 아군의 명령을 고르기 시작한다. null이면 그만둔다. */
  offer(member: PartyMember | null): void {
    this.memberValue = member;
    this.indexValue = 0;
    this.pendingValue = null;
  }

  /** 마력이나 물자가 모자라 지금 쓸 수 없는 명령인지. */
  isBlocked(command: Command): boolean {
    const member = this.memberValue;
    if (!member) return true;
    return member.mp < command.cost || command.blockedReason({ supplies: this.supplies }) !== null;
  }

  /** 가리키는 명령을 위아래로 옮긴다. 끝에서 넘어가면 반대쪽 끝으로 간다. */
  move(step: number): void {
    const count = this.memberValue?.commands.length ?? 0;
    if (count === 0 || this.pendingValue) return;
    this.indexValue = (this.indexValue + step + count) % count;
  }

  /** 가리키는 명령만 바꾼다(마우스를 올렸을 때). */
  point(index: number): void {
    if (this.pendingValue || !this.memberValue?.commands[index]) return;
    this.indexValue = index;
  }

  /**
   * 명령을 정한다. 적 하나를 향하는 명령이고 적이 여럿이면 대상을 겨누는 단계로 넘어가고, 아니면 바로 전한다.
   * 쓸 수 없는 명령도 그대로 전해서, 왜 안 되는지를 전투가 알려 주게 한다.
   */
  choose(index = this.indexValue): void {
    const command = this.memberValue?.commands[index];
    if (!command || this.pendingValue) return;
    this.indexValue = index;
    if (!this.isBlocked(command) && command.aim === 'enemy' && this.targets.length > 1) {
      this.pendingValue = command;
      return;
    }
    this.orders.command(command.id);
  }

  /** 겨누는 중에 다음 적으로 옮긴다. */
  cycleTarget(step: number): void {
    const targets = this.targets;
    const current = this.battle.target;
    if (!this.pendingValue || targets.length < 2 || !current) return;
    const at = targets.indexOf(current);
    this.orders.aim(targets[(at + step + targets.length) % targets.length]!);
  }

  /** 겨누는 중에 그 적으로 정하고 명령을 전한다(적을 직접 눌렀을 때). */
  aimAt(enemy: Enemy): void {
    if (!this.pendingValue || !enemy.alive) return;
    this.orders.aim(enemy);
    this.fire();
  }

  /** 결정 키: 겨누는 중이면 그 대상으로 명령을 전하고, 아니면 가리키는 명령을 정한다. */
  confirm(): void {
    if (this.pendingValue) this.fire();
    else this.choose();
  }

  /** 겨누기를 그만두고 명령 고르기로 돌아간다. */
  cancel(): void {
    this.pendingValue = null;
  }

  private fire(): void {
    const command = this.pendingValue;
    this.pendingValue = null;
    if (command) this.orders.command(command.id);
  }
}

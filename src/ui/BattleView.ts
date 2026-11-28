import type { Battle } from '../battle/Battle';
import type { Combatant } from '../battle/Combatant';
import type { Enemy } from '../battle/Enemy';
import type { PartyMember } from '../battle/PartyMember';
import type { Supplies } from '../battle/Supplies';
import type { Command } from '../battle/commands';
import type { ScreenPoint } from '../game/capabilities';
import type { BattleOrders, BattleScreen, FloatKind, MarkKind } from '../game/story/screens';
import { digitIndex, el } from './dom';

/** 행동 게이지가 다 찼을 때의 값. */
const GAUGE_FULL = 100;

/** 이름이 붙은 막대 하나(HP, BP, MP, 행동 게이지). 값이 바뀔 때만 화면을 고친다. */
class Gauge {
  readonly root: HTMLElement;
  private readonly fill = el('i');
  private readonly value = el('b');
  private shown = '';

  constructor(kind: string, label: string) {
    this.root = el('div', `gauge gauge-${kind}`);
    const track = el('span', 'gauge-track');
    track.append(this.fill);
    this.root.append(el('em', '', label), track, this.value);
  }

  set(current: number, max: number, showNumber = true): void {
    const whole = Math.max(0, Math.round(current));
    const key = `${whole}/${max}`;
    if (key === this.shown) return;
    this.shown = key;
    this.fill.style.width = `${max > 0 ? Math.min(100, (Math.max(0, current) / max) * 100) : 0}%`;
    this.value.textContent = showNumber ? String(whole) : '';
  }
}

/** 전투원 한 명의 이름표와 막대들. 아군과 적이 보여 줄 막대만 다르다. */
abstract class Plate<T extends Combatant> {
  readonly root: HTMLElement;
  protected readonly hp = new Gauge('hp', 'HP');
  protected readonly bp = new Gauge('bp', 'BP');
  protected readonly ap = new Gauge('ap', '행동');

  protected constructor(
    readonly who: T,
    tag: 'div' | 'button',
    className: string,
  ) {
    this.root = el(tag, `plate ${className}`);
  }

  refresh(): void {
    const { who } = this;
    this.hp.set(who.hp, who.maxHp);
    this.bp.set(who.bp, who.maxBp);
    this.ap.set(Math.min(who.ap, GAUGE_FULL), GAUGE_FULL, false);
    this.root.classList.toggle('down', !who.alive);
  }

  highlight(on: boolean): void {
    this.root.classList.toggle('on', on);
  }
}

class AllyPlate extends Plate<PartyMember> {
  private readonly mp = new Gauge('mp', 'MP');

  constructor(member: PartyMember) {
    super(member, 'div', 'plate-ally');
    const name = el('p', 'plate-name', member.name);
    name.append(el('small', '', member.role));
    this.root.append(name, this.hp.root, this.bp.root, this.mp.root, this.ap.root);
  }

  override refresh(): void {
    super.refresh();
    this.mp.set(this.who.mp, this.who.maxMp);
  }
}

class FoePlate extends Plate<Enemy> {
  constructor(enemy: Enemy, onPick: (enemy: Enemy) => void) {
    super(enemy, 'button', 'plate-foe');
    (this.root as HTMLButtonElement).type = 'button';
    this.root.append(el('p', 'plate-name', enemy.name), this.hp.root, this.bp.root, this.ap.root);
    this.root.addEventListener('click', () => onPick(enemy));
  }
}

/**
 * 전투 화면: 위에 적의 이름표, 아래에 아군의 이름표와 명령 메뉴, 장면 위에 떠오르는 숫자.
 * 수치는 넘겨받은 Battle에서 읽기만 하고, 플레이어가 고른 것은 BattleOrders로 전한다.
 * 숫자 1~5로 명령을 고르고, Tab이나 좌우 화살표 또는 적 이름표 클릭으로 겨눌 적을 바꾼다.
 */
export class BattleView implements BattleScreen {
  private readonly layer = el('div', 'battle layer');
  private readonly message = el('p', 'battle-message panel');
  private readonly foeRow = el('div', 'battle-foes');
  private readonly allyRow = el('div', 'battle-party');
  private readonly menu = el('div', 'battle-menu panel');
  private readonly floats = el('div', 'battle-floats');
  private readonly marks: Readonly<Record<MarkKind, HTMLElement>> = {
    target: el('div', 'battle-mark battle-mark-target', '▼'),
    active: el('div', 'battle-mark battle-mark-active', '▼'),
  };
  private allies: AllyPlate[] = [];
  private foes: FoePlate[] = [];
  private battle: Battle | null = null;
  private supplies: Supplies | null = null;
  private orders: BattleOrders | null = null;
  private offered: PartyMember | null = null;

  constructor(parent: HTMLElement) {
    const bottom = el('div', 'battle-bottom');
    bottom.append(this.menu, this.allyRow);
    this.layer.append(this.message, this.foeRow, bottom, this.floats, this.marks.target, this.marks.active);
    this.layer.hidden = true;
    this.menu.hidden = true;
    parent.append(this.layer);
    window.addEventListener('keydown', this.onKey);
  }

  open(battle: Battle, supplies: Supplies, orders: BattleOrders): void {
    this.battle = battle;
    this.supplies = supplies;
    this.orders = orders;
    this.allies = battle.party.map((member) => new AllyPlate(member));
    this.foes = battle.enemies.map((enemy) => new FoePlate(enemy, (picked) => orders.aim(picked)));
    this.allyRow.replaceChildren(...this.allies.map((plate) => plate.root));
    this.foeRow.replaceChildren(...this.foes.map((plate) => plate.root));
    this.floats.replaceChildren();
    this.offer(null);
    this.refresh();
    this.layer.hidden = false;
    document.body.classList.add('in-battle');
  }

  offer(member: PartyMember | null): void {
    this.offered = member;
    this.menu.hidden = !member;
    if (!member) return;
    const title = el('p', 'battle-menu-title', `${member.name}의 차례`);
    title.append(el('small', '', '숫자 키로 명령 · Tab으로 대상 바꾸기'));
    this.menu.replaceChildren(
      title,
      ...member.commands.map((command, i) => this.commandButton(command, i, member)),
    );
  }

  say(text: string): void {
    this.message.textContent = text;
  }

  float(text: string, kind: FloatKind, at: ScreenPoint): void {
    const node = el('span', `battle-float battle-float-${kind}`, text);
    node.style.left = `${at.x * 100}%`;
    node.style.top = `${at.y * 100}%`;
    node.addEventListener('animationend', () => node.remove());
    this.floats.append(node);
  }

  mark(kind: MarkKind, at: ScreenPoint | null): void {
    const node = this.marks[kind];
    node.hidden = !at;
    if (!at) return;
    node.style.left = `${at.x * 100}%`;
    node.style.top = `${at.y * 100}%`;
  }

  refresh(): void {
    const battle = this.battle;
    if (!battle) return;
    for (const plate of this.allies) {
      plate.refresh();
      plate.highlight(plate.who === battle.active);
    }
    for (const plate of this.foes) {
      plate.refresh();
      plate.highlight(plate.who === battle.target);
    }
  }

  close(): void {
    this.battle = null;
    this.orders = null;
    this.supplies = null;
    this.offered = null;
    this.layer.hidden = true;
    document.body.classList.remove('in-battle');
  }

  private commandButton(command: Command, index: number, member: PartyMember): HTMLButtonElement {
    const button = el('button', 'battle-command');
    button.type = 'button';
    const cost =
      command.id === 'potion'
        ? `${this.supplies?.potions ?? 0}개 남음`
        : command.cost > 0
          ? `MP ${command.cost}`
          : '';
    const blocked =
      member.mp < command.cost ||
      (this.supplies !== null && command.blockedReason({ supplies: this.supplies }) !== null);
    button.classList.toggle('blocked', blocked);
    const head = el('span', 'battle-command-head');
    head.append(el('kbd', '', String(index + 1)), el('strong', '', command.name), el('em', '', cost));
    button.append(head, el('small', '', command.tip));
    button.addEventListener('click', () => this.orders?.command(command.id));
    return button;
  }

  private readonly onKey = (event: KeyboardEvent): void => {
    if (!this.battle || !this.orders || event.repeat) return;
    if (event.code === 'Tab' || event.code === 'ArrowRight' || event.code === 'ArrowLeft') {
      event.preventDefault();
      this.cycleTarget(event.code === 'ArrowLeft' ? -1 : 1);
      return;
    }
    const command = this.offered?.commands[digitIndex(event.code)];
    if (command) this.orders.command(command.id);
  };

  /** 살아 있는 적 가운데 다음 적을 겨눈다. */
  private cycleTarget(step: number): void {
    const battle = this.battle;
    if (!battle || !this.orders) return;
    const standing = battle.enemies.filter((enemy) => enemy.alive);
    if (standing.length < 2 || !battle.target) return;
    const at = standing.indexOf(battle.target);
    this.orders.aim(standing[(at + step + standing.length) % standing.length]!);
  }
}

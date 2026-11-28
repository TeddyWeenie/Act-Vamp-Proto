import type { Battle } from '../battle/Battle';
import type { Combatant } from '../battle/Combatant';
import type { Enemy } from '../battle/Enemy';
import type { PartyMember } from '../battle/PartyMember';
import type { Supplies } from '../battle/Supplies';
import type { Command } from '../battle/commands';
import type { ScreenPoint } from '../game/capabilities';
import type { BattleOrders, BattleScreen, FloatKind, Standing } from '../game/story/screens';
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

/** 화면 위의 한 점(픽셀). */
interface Spot {
  readonly x: number;
  readonly y: number;
}

/** 이름표를 몸 가운데에서 옆으로 얼마나 띄울지. 몸이 화면에서 차지하는 키에 대한 비율이다. */
const BESIDE = 0.4;

/**
 * 전투원 한 명의 이름표와 막대들. 캐릭터 바로 옆을 따라다닌다.
 * 어느 쪽 옆에 붙을지와 어떤 막대를 보여 줄지만 아군과 적이 다르다.
 */
abstract class Plate<T extends Combatant> {
  readonly root: HTMLElement;
  protected readonly hp = new Gauge('hp', 'HP');
  protected readonly bp = new Gauge('bp', 'BP');
  protected readonly ap = new Gauge('ap', '행동');
  private headSpot: Spot = { x: 0, y: 0 };
  private bodySpot: Spot = { x: 0, y: 0 };

  protected constructor(
    readonly who: T,
    tag: 'div' | 'button',
    className: string,
  ) {
    this.root = el(tag, `plate ${className}`);
  }

  /** 이름표가 몸의 어느 쪽에 붙는지. 싸움터 바깥쪽이라 가운데의 명령 메뉴와 겹치지 않는다. */
  protected abstract readonly side: -1 | 1;

  /** 머리 위. 표시를 띄울 자리다. */
  get head(): Spot {
    return this.headSpot;
  }

  /** 몸 가운데. 명령 메뉴의 높이를 맞출 자리다. */
  get body(): Spot {
    return this.bodySpot;
  }

  /** 캐릭터가 선 자리에 맞춰 이름표를 옮긴다. width와 height는 화면의 크기(픽셀). */
  follow(standing: Standing, width: number, height: number): void {
    const { feet, head } = standing;
    const tall = (feet.y - head.y) * height;
    this.headSpot = { x: head.x * width, y: head.y * height };
    this.bodySpot = { x: feet.x * width, y: ((feet.y + head.y) / 2) * height };
    this.root.style.setProperty('--x', `${Math.round(this.bodySpot.x + this.side * tall * BESIDE)}px`);
    this.root.style.setProperty('--y', `${Math.round(this.bodySpot.y)}px`);
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

/** 아군의 이름표: 몸 왼쪽에 붙고 MP까지 보여 준다. 쓰러져도 남아 있다. */
class AllyPlate extends Plate<PartyMember> {
  protected readonly side = -1;
  private readonly mp = new Gauge('mp', 'MP');

  constructor(member: PartyMember) {
    super(member, 'div', 'plate-ally');
    this.root.append(
      el('p', 'plate-name', member.name),
      this.hp.root,
      this.bp.root,
      this.mp.root,
      this.ap.root,
    );
  }

  override refresh(): void {
    super.refresh();
    this.mp.set(this.who.mp, this.who.maxMp);
  }
}

/** 적의 이름표: 몸 오른쪽에 붙고, 누르면 그 적을 겨눈다. 쓰러지면 몸과 함께 사라진다. */
class FoePlate extends Plate<Enemy> {
  protected readonly side = 1;

  constructor(enemy: Enemy, onPick: (enemy: Enemy) => void) {
    super(enemy, 'button', 'plate-foe');
    (this.root as HTMLButtonElement).type = 'button';
    this.root.append(el('p', 'plate-name', enemy.name), this.hp.root, this.bp.root, this.ap.root);
    this.root.addEventListener('click', () => onPick(enemy));
  }

  override refresh(): void {
    super.refresh();
    this.root.hidden = !this.who.alive;
  }
}

/** 머리 위에 띄우는 작은 화살표(차례가 온 아군, 겨눈 적). */
class Mark {
  readonly root: HTMLElement;

  constructor(kind: 'active' | 'target') {
    this.root = el('div', `battle-mark battle-mark-${kind}`, '▼');
    this.root.hidden = true;
  }

  /** at이 null이면 감춘다. */
  point(at: Spot | null): void {
    this.root.hidden = !at;
    if (!at) return;
    this.root.style.left = `${Math.round(at.x)}px`;
    this.root.style.top = `${Math.round(at.y)}px`;
  }
}

/** 명령 메뉴의 가운데가 화면 세로에서 벗어나지 않는 범위(위에서부터의 비율). 위아래 띠와 메뉴 높이의 절반만큼 띄운다. */
const MENU_TOP = 0.28;
const MENU_BOTTOM = 0.72;

/**
 * 전투 화면: 캐릭터마다 바로 옆에 붙는 작은 이름표, 싸움터 한가운데에 뜨는 명령 메뉴, 머리 위에 떠오르는 숫자.
 * 눈이 캐릭터에서 떠나지 않아도 누가 얼마나 버티는지, 지금 누구 차례인지 알 수 있게 하려는 배치다.
 * 수치는 넘겨받은 Battle에서 읽기만 하고, 플레이어가 고른 것은 BattleOrders로 전한다.
 * 숫자 1~5로 명령을 고르고, Tab이나 좌우 화살표 또는 적 이름표 클릭으로 겨눌 적을 바꾼다.
 */
export class BattleView implements BattleScreen {
  private readonly layer = el('div', 'battle layer');
  private readonly message = el('p', 'battle-message panel');
  private readonly plateLayer = el('div', 'battle-plates');
  private readonly menu = el('div', 'battle-menu panel');
  private readonly floats = el('div', 'battle-floats');
  private readonly activeMark = new Mark('active');
  private readonly targetMark = new Mark('target');
  private allies: AllyPlate[] = [];
  private foes: FoePlate[] = [];
  private readonly plates = new Map<string, Plate<Combatant>>();
  private battle: Battle | null = null;
  private supplies: Supplies | null = null;
  private orders: BattleOrders | null = null;
  private offered: PartyMember | null = null;

  constructor(parent: HTMLElement) {
    this.layer.append(
      this.message,
      this.plateLayer,
      this.targetMark.root,
      this.activeMark.root,
      this.menu,
      this.floats,
    );
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
    this.plates.clear();
    for (const plate of [...this.allies, ...this.foes]) this.plates.set(plate.who.id, plate);
    this.plateLayer.replaceChildren(...[...this.allies, ...this.foes].map((plate) => plate.root));
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
    title.append(el('small', '', 'Tab 대상 바꾸기'));
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

  arrange(standings: readonly Standing[]): void {
    const width = this.layer.clientWidth;
    const height = this.layer.clientHeight;
    for (const standing of standings) this.plates.get(standing.who.id)?.follow(standing, width, height);
    this.placeMenu(height);
  }

  refresh(): void {
    const battle = this.battle;
    if (!battle) return;
    // 표시는 플레이어가 고르는 동안에만 띄운다. 적의 차례에는 눈을 끌 것이 없어야 한다.
    const choosing = this.offered !== null;
    let acting: Plate<Combatant> | null = null;
    let aimed: Plate<Combatant> | null = null;
    for (const plate of this.allies) {
      plate.refresh();
      const on = choosing && plate.who === this.offered;
      plate.highlight(on);
      if (on) acting = plate;
    }
    for (const plate of this.foes) {
      plate.refresh();
      const on = choosing && plate.who === battle.target;
      plate.highlight(on);
      if (on) aimed = plate;
    }
    this.activeMark.point(acting?.head ?? null);
    this.targetMark.point(aimed?.head ?? null);
  }

  close(): void {
    this.battle = null;
    this.orders = null;
    this.supplies = null;
    this.offered = null;
    this.layer.hidden = true;
    document.body.classList.remove('in-battle');
  }

  /**
   * 명령 메뉴를 아군과 적 사이의 빈 가운데에, 차례가 온 캐릭터의 높이에 맞춰 놓는다.
   * 화면 위아래로 벗어나지 않게 높이를 누르고, 그만큼 어긋난 것은 메뉴 옆의 화살촉이 캐릭터를 가리켜 메운다.
   */
  private placeMenu(height: number): void {
    const acting = this.offered ? this.plates.get(this.offered.id) : undefined;
    if (!acting) return;
    const front = Math.max(...this.allies.map((plate) => plate.body.x));
    const standing = this.foes.filter((plate) => plate.who.alive);
    const facing = Math.min(...(standing.length > 0 ? standing : this.foes).map((plate) => plate.body.x));
    const y = Math.max(height * MENU_TOP, Math.min(height * MENU_BOTTOM, acting.body.y));
    this.menu.style.left = `${Math.round((front + facing) / 2)}px`;
    this.menu.style.top = `${Math.round(y)}px`;
    this.menu.style.setProperty('--notch', `${Math.round(acting.body.y - y)}px`);
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
    button.append(
      el('kbd', '', String(index + 1)),
      el('strong', '', command.name),
      el('em', '', cost),
      el('small', '', command.tip),
    );
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

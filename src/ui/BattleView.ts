import type { Battle } from '../battle/Battle';
import type { Combatant } from '../battle/Combatant';
import type { PartyMember } from '../battle/PartyMember';
import type { Supplies } from '../battle/Supplies';
import type { Command } from '../battle/commands';
import type { ScreenPoint } from '../game/capabilities';
import type { BattleOrders, BattleScreen, FloatKind, Standing } from '../game/story/screens';
import { ArcMenu, type ArcEntry, type Band } from './battle/ArcMenu';
import { CommandPicker } from './battle/CommandPicker';
import { AllyPlate, FoePlate, type Spot, type StatusPlate } from './battle/StatusPlate';
import { TurnTimeline } from './battle/TurnTimeline';
import { digitIndex, el } from './dom';

/** 명령 메뉴가 벗어나지 않는 화면 세로 범위(위에서부터의 비율). 위는 시간 막대, 아래는 검은 띠를 피한다. */
const MENU_TOP = 0.17;
const MENU_BOTTOM = 0.94;

/** 동료가 이만큼(몸의 키에 대한 비율)보다 더 뒤에 서 있으면 메뉴에 가려질 일이 없다고 본다. */
const BEHIND = 0.2;
/** 발밑 막대가 차지하는 높이(몸의 키에 대한 비율). */
const UNDERFOOT = 0.18;

/** 화면 위의 한 점에 띄우는 작은 표시(차례가 온 아군 머리 위의 화살표, 겨누는 동안의 조작 안내). */
class Marker {
  readonly root: HTMLElement;

  constructor(className: string, text: string) {
    this.root = el('div', className, text);
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

/** 키보드의 키가 명령 고르기에서 뜻하는 것. */
type Press = 'up' | 'down' | 'confirm' | 'cancel';

const PRESSES: Readonly<Record<string, Press>> = {
  ArrowUp: 'up',
  ArrowLeft: 'up',
  ArrowDown: 'down',
  ArrowRight: 'down',
  Tab: 'down',
  Enter: 'confirm',
  NumpadEnter: 'confirm',
  Space: 'confirm',
  Escape: 'cancel',
  Backspace: 'cancel',
};

/**
 * 전투 화면. 눈이 캐릭터에서 떠나지 않아도 싸움을 읽을 수 있게, 모든 정보를 캐릭터 곁에 둔다.
 *  - 정보창: 평소에는 발밑의 막대 두 줄, 차례가 오거나 겨눠지거나 마우스를 올리거나 Shift를 누르면 이름표로 펼쳐진다.
 *  - 명령 메뉴: 차례가 온 캐릭터 앞에 부채꼴로 펼쳐진다. ↑↓와 Enter, 또는 숫자 1~5로 고른다.
 *  - 대상 확인: 적 하나를 향하는 명령은 적 둘레에 표적이 뜨고, ↑↓로 바꾼 뒤 Enter로 정한다. Esc로 돌아간다.
 *  - 시간 막대: 위쪽에 모두의 행동 게이지가 한 줄의 시간 위를 달린다. 시간이 흐르는지 멈췄는지도 보여 준다.
 * 이 클래스는 부품들을 놓고 잇기만 한다. 고르는 흐름은 CommandPicker가, 그리기는 각 부품이 맡는다.
 * 수치는 넘겨받은 Battle에서 읽기만 하고, 플레이어가 고른 것은 BattleOrders로 전한다.
 */
export class BattleView implements BattleScreen {
  private readonly layer = el('div', 'battle layer');
  private readonly message = el('p', 'battle-message panel');
  private readonly timeline = new TurnTimeline();
  private readonly plateLayer = el('div', 'battle-plates');
  private readonly floats = el('div', 'battle-floats');
  private readonly activeMark = new Marker('battle-mark', '▼');
  private readonly aimHint = new Marker('battle-aim-hint', '↑ ↓ 대상 바꾸기 · Enter 결정 · Esc 뒤로');
  private readonly arc: ArcMenu;
  private allies: AllyPlate[] = [];
  private foes: FoePlate[] = [];
  private readonly plates = new Map<string, StatusPlate<Combatant>>();
  private party: ReadonlySet<Combatant> = new Set();
  private battle: Battle | null = null;
  private supplies: Supplies | null = null;
  private picker: CommandPicker | null = null;
  private showAll = false;

  constructor(parent: HTMLElement) {
    this.arc = new ArcMenu(
      (index) => this.picker?.point(index),
      (index) => this.picker?.choose(index),
    );
    this.layer.append(
      this.message,
      this.timeline.root,
      this.plateLayer,
      this.activeMark.root,
      this.arc.root,
      this.aimHint.root,
      this.floats,
    );
    this.layer.hidden = true;
    parent.append(this.layer);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => (this.showAll = false));
  }

  open(battle: Battle, supplies: Supplies, orders: BattleOrders): void {
    this.battle = battle;
    this.supplies = supplies;
    const picker = new CommandPicker(battle, supplies, orders);
    this.picker = picker;
    this.party = new Set(battle.party);
    this.allies = battle.party.map((member) => new AllyPlate(member));
    this.foes = battle.enemies.map((enemy) => new FoePlate(enemy, (picked) => picker.aimAt(picked)));
    this.plates.clear();
    for (const plate of [...this.allies, ...this.foes]) this.plates.set(plate.who.id, plate);
    this.plateLayer.replaceChildren(...[...this.allies, ...this.foes].map((plate) => plate.root));
    this.timeline.open([...battle.party, ...battle.enemies], this.party);
    this.floats.replaceChildren();
    this.showAll = false;
    this.offer(null);
    this.refresh();
    this.layer.hidden = false;
    document.body.classList.add('in-battle');
  }

  offer(member: PartyMember | null): void {
    const picker = this.picker;
    if (!picker) return;
    picker.offer(member);
    if (!member) {
      this.arc.close();
      return;
    }
    this.arc.open(member.commands.map((command) => this.entry(command, picker)));
    this.arc.highlight(picker.index, false);
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
    const acting = this.actingPlate;
    if (acting) this.arc.place(acting.body, acting.tall, this.arcRoom(acting, height));
  }

  refresh(): void {
    const { battle, picker } = this;
    if (!battle || !picker) return;
    const aiming = picker.pending !== null;
    this.timeline.update(battle);
    for (const plate of this.allies) {
      plate.spotlight(plate.who === picker.member);
      plate.refresh(this.showAll);
    }
    let aimed: FoePlate | null = null;
    for (const plate of this.foes) {
      const on = aiming && plate.who === battle.target;
      plate.aim(on ? 'aimed' : aiming ? 'candidate' : 'none');
      plate.refresh(this.showAll);
      if (on) aimed = plate;
    }
    this.arc.highlight(picker.index, aiming);
    // 표시는 플레이어가 고르는 동안에만 띄운다. 적의 차례에는 눈을 끌 것이 없어야 한다.
    this.activeMark.point(this.actingPlate?.head ?? null);
    this.aimHint.point(aimed?.head ?? null);
  }

  close(): void {
    this.battle = null;
    this.supplies = null;
    this.picker = null;
    this.arc.close();
    this.layer.hidden = true;
    document.body.classList.remove('in-battle');
  }

  /** 명령을 고르고 있는 아군의 정보창. 고를 차례가 아니면 없다. */
  private get actingPlate(): StatusPlate<Combatant> | undefined {
    const member = this.picker?.member;
    return member ? this.plates.get(member.id) : undefined;
  }

  /**
   * 부채꼴 메뉴가 펼쳐질 수 있는 세로 범위. 화면 위아래의 띠를 피하고,
   * 메뉴가 펼쳐지는 쪽(앞)에 선 동료가 있으면 그 동료의 몸과 발밑 막대를 가리지 않게 그 위나 아래로 좁힌다.
   */
  private arcRoom(acting: StatusPlate<Combatant>, height: number): Band {
    let top = height * MENU_TOP;
    let bottom = height * MENU_BOTTOM;
    for (const other of this.allies) {
      if (other === acting || other.body.x < acting.body.x - acting.tall * BEHIND) continue;
      const half = other.tall / 2;
      if (other.body.y > acting.body.y) bottom = Math.min(bottom, other.body.y - half);
      else top = Math.max(top, other.body.y + half + other.tall * UNDERFOOT);
    }
    return { top, bottom };
  }

  /** 명령 하나를 부채꼴에 어떻게 적을지 정한다. */
  private entry(command: Command, picker: CommandPicker): ArcEntry {
    const cost =
      command.id === 'potion'
        ? `${this.supplies?.potions ?? 0}개 남음`
        : command.cost > 0
          ? `MP ${command.cost}`
          : '';
    return { command, cost, blocked: picker.isBlocked(command) };
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const picker = this.picker;
    if (!picker) return;
    if (event.key === 'Shift') {
      this.showAll = true;
      return;
    }
    if (!picker.member || event.repeat) return;
    const press = PRESSES[event.code];
    if (press) {
      event.preventDefault();
      this.handle(press, picker);
      return;
    }
    const index = digitIndex(event.code);
    if (index >= 0 && !picker.pending) picker.choose(index);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (event.key === 'Shift') this.showAll = false;
  };

  /** 겨누는 중이면 위아래가 대상을, 아니면 명령을 옮긴다. */
  private handle(press: Press, picker: CommandPicker): void {
    if (press === 'confirm') picker.confirm();
    else if (press === 'cancel') picker.cancel();
    else if (picker.pending) picker.cycleTarget(press === 'up' ? -1 : 1);
    else picker.move(press === 'up' ? -1 : 1);
  }
}

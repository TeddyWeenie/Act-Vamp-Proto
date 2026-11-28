import type { Combatant } from '../../battle/Combatant';
import type { Enemy } from '../../battle/Enemy';
import type { PartyMember } from '../../battle/PartyMember';
import type { Standing } from '../../game/story/screens';
import { el } from '../dom';
import { Gauge } from './Gauge';

/** 화면 위의 한 점(픽셀). */
export interface Spot {
  readonly x: number;
  readonly y: number;
}

/** 아군의 생명력이 이 비율 아래로 내려가면 줄인 정보창에도 숫자를 붙이고 깜빡인다. */
const DANGER_RATIO = 0.3;

/**
 * 전투원 한 명의 정보창. 평소에는 발밑의 막대 두 줄(HP, 배리어)만 보이고,
 * 차례가 오거나 겨눠지거나 마우스를 올리면 캐릭터 옆에 이름과 숫자가 적힌 이름표로 펼쳐진다.
 * 이름표가 몸의 어느 쪽에 붙는지와 무엇을 더 보여 주는지만 아군과 적이 다르다.
 */
export abstract class StatusPlate<T extends Combatant> {
  readonly root = el('div', 'status');
  /** 캐릭터 그림을 덮는 보이지 않는 칸. 마우스를 올리거나 누르는 것을 받는다. */
  protected readonly zone = el('div', 'status-zone');
  protected readonly card: HTMLElement;
  protected readonly hp = new Gauge('hp', 'HP');
  protected readonly bp = new Gauge('bp', 'BP');
  private readonly bars = el('div', 'status-bars');
  private readonly barHp = new Gauge('hp', 'HP');
  private readonly barBp = new Gauge('bp', 'BP');
  private headSpot: Spot = { x: 0, y: 0 };
  private bodySpot: Spot = { x: 0, y: 0 };
  private tallValue = 0;
  private hovered = false;
  private lit = false;

  protected constructor(
    readonly who: T,
    side: 'ally' | 'foe',
  ) {
    this.card = el('div', `plate plate-${side}`);
    this.card.append(el('p', 'plate-name', who.name), this.hp.root, this.bp.root);
    this.bars.append(this.barHp.root, this.barBp.root);
    this.root.append(this.zone, this.bars, this.card);
    this.zone.addEventListener('pointerenter', () => (this.hovered = true));
    this.zone.addEventListener('pointerleave', () => (this.hovered = false));
  }

  /** 머리 위. 표시를 띄울 자리다. */
  get head(): Spot {
    return this.headSpot;
  }

  /** 몸 가운데. 명령 메뉴가 펼쳐지는 자리다. */
  get body(): Spot {
    return this.bodySpot;
  }

  /** 몸이 화면에서 차지하는 키(픽셀). */
  get tall(): number {
    return this.tallValue;
  }

  /** 캐릭터가 선 자리에 맞춰 정보창을 옮긴다. width와 height는 화면의 크기(픽셀). */
  follow(standing: Standing, width: number, height: number): void {
    const { feet, head } = standing;
    this.tallValue = (feet.y - head.y) * height;
    this.headSpot = { x: head.x * width, y: head.y * height };
    this.bodySpot = { x: feet.x * width, y: ((feet.y + head.y) / 2) * height };
    const style = this.root.style;
    style.setProperty('--x', `${Math.round(this.bodySpot.x)}px`);
    style.setProperty('--head', `${Math.round(this.headSpot.y)}px`);
    style.setProperty('--feet', `${Math.round(feet.y * height)}px`);
    style.setProperty('--tall', `${Math.round(this.tallValue)}px`);
  }

  /** 차례가 왔거나 겨눠져서, 화면이 이 사람을 자세히 보여 주라고 한 상태. */
  spotlight(on: boolean): void {
    this.lit = on;
    this.card.classList.toggle('on', on);
  }

  /** 수치를 다시 읽고, 줄여 보일지 펼쳐 보일지 정한다. showAll이면 모두 펼친다. */
  refresh(showAll: boolean): void {
    const { who } = this;
    this.hp.set(who.hp, who.maxHp);
    this.bp.set(who.bp, who.maxBp);
    this.barHp.set(who.hp, who.maxHp);
    this.barBp.set(who.bp, who.maxBp);
    const detail = this.lit || this.hovered || showAll;
    this.zone.hidden = this.gone;
    this.card.hidden = this.gone || !detail;
    this.bars.hidden = this.gone || detail;
    this.bars.classList.toggle('danger', who.alive && who.hp / who.maxHp < DANGER_RATIO && this.warns);
    this.root.classList.toggle('down', !who.alive);
  }

  /** 장면에서 사라져 정보창도 감춰야 하는지. */
  protected get gone(): boolean {
    return false;
  }

  /** 위급할 때 줄인 정보창이 스스로 알리는지. */
  protected get warns(): boolean {
    return false;
  }
}

/** 아군의 정보창: 이름표가 몸 왼쪽에 붙고 MP까지 보여 준다. 쓰러져도 남아 있고, 위급하면 스스로 알린다. */
export class AllyPlate extends StatusPlate<PartyMember> {
  private readonly mp = new Gauge('mp', 'MP');

  constructor(member: PartyMember) {
    super(member, 'ally');
    this.card.append(this.mp.root);
  }

  override refresh(showAll: boolean): void {
    super.refresh(showAll);
    this.mp.set(this.who.mp, this.who.maxMp);
  }

  protected override get warns(): boolean {
    return true;
  }
}

/** 겨누는 동안 적 둘레에 그리는 표적의 상태. */
export type AimState = 'none' | 'candidate' | 'aimed';

/** 적의 정보창: 이름표가 몸 오른쪽에 붙는다. 겨누는 동안에는 표적이 둘러지고, 누르면 그 적으로 정한다. 쓰러지면 몸과 함께 사라진다. */
export class FoePlate extends StatusPlate<Enemy> {
  private readonly reticle = el('div', 'status-reticle');

  constructor(enemy: Enemy, onPick: (enemy: Enemy) => void) {
    super(enemy, 'foe');
    this.reticle.hidden = true;
    this.root.append(this.reticle);
    this.zone.addEventListener('click', () => onPick(enemy));
    this.card.addEventListener('click', () => onPick(enemy));
  }

  /** 겨누는 중인지에 따라 표적을 그린다. */
  aim(state: AimState): void {
    this.reticle.hidden = state === 'none' || !this.who.alive;
    this.reticle.classList.toggle('aimed', state === 'aimed');
    this.zone.classList.toggle('pickable', state !== 'none');
    this.spotlight(state === 'aimed');
  }

  protected override get gone(): boolean {
    return !this.who.alive;
  }
}

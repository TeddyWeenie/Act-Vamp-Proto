/** 피해가 들어가는 방식. 보통은 배리어부터, 관통은 생명력으로 바로, 파쇄는 배리어만 크게 깎는다. */
export type DamageKind = 'normal' | 'pierce' | 'breaker';

export interface DamageResult {
  /** 생명력이 깎인 양. */
  readonly hp: number;
  /** 배리어가 깎인 양. */
  readonly bp: number;
  /** 이번 피해로 배리어가 0이 되었는지. */
  readonly broken: boolean;
}

/** 전투원이 처음 가지고 들어오는 몸 상태. */
export interface Vitals {
  readonly hp: number;
  readonly bp: number;
  readonly def: number;
}

/** 방어 중 피해 감소율. */
const GUARD_RATIO = 0.5;
/** 파쇄가 배리어에 주는 배율. */
const BREAKER_RATIO = 2.6;
/** 배리어가 깨질 때 밀리는 행동 게이지. */
const BREAK_DELAY = 28;

/**
 * 전투에 서는 모든 것의 공통 뼈대: 생명력(HP), 배리어(BP), 행동 게이지(AP), 방어 자세.
 * 수치는 밖에서 직접 고치지 못하고, 피해·회복·게이지 같은 행동으로만 바뀐다.
 * 아군과 적은 이 클래스를 이어받아 자기 능력치와 배리어 한도만 더한다.
 */
export abstract class Combatant {
  private hpValue: number;
  private bpValue: number;
  private apValue = 0;
  private guardUp = false;

  protected constructor(
    readonly id: string,
    readonly name: string,
    private maxHpValue: number,
    private defValue: number,
    hp: number,
    bp: number,
  ) {
    this.hpValue = hp;
    this.bpValue = bp;
  }

  get hp(): number {
    return this.hpValue;
  }

  get bp(): number {
    return this.bpValue;
  }

  get ap(): number {
    return this.apValue;
  }

  get maxHp(): number {
    return this.maxHpValue;
  }

  get def(): number {
    return this.defValue;
  }

  get guarding(): boolean {
    return this.guardUp;
  }

  get alive(): boolean {
    return this.hpValue > 0;
  }

  /** 배리어의 한도. 아군은 장비에 따라 달라진다. */
  abstract get maxBp(): number;

  /** 행동 게이지가 차는 빠르기(민첩). */
  abstract get speed(): number;

  /** 피해를 받는다. 방어 중이면 절반으로 줄고 방어가 풀린다. */
  takeDamage(raw: number, kind: DamageKind = 'normal'): DamageResult {
    let amount = Math.max(1, Math.round(raw));
    if (this.guardUp) {
      amount = Math.round(amount * GUARD_RATIO);
      this.guardUp = false;
    }
    const before = this.bpValue;
    let shield = 0;
    let health = 0;
    if (kind !== 'pierce' && this.bpValue > 0) {
      const breaker = kind === 'breaker';
      shield = Math.min(this.bpValue, breaker ? Math.round(amount * BREAKER_RATIO) : amount);
      this.bpValue -= shield;
      if (!breaker) health = Math.max(0, amount - shield);
    } else {
      health = amount;
    }
    this.hpValue = Math.max(0, this.hpValue - health);
    const broken = before > 0 && this.bpValue === 0;
    if (broken) this.delay(BREAK_DELAY);
    return { hp: health, bp: shield, broken };
  }

  /** 생명력을 회복한다. 쓰러진 동료도 다시 일어난다. */
  heal(amount: number): void {
    this.hpValue = Math.min(this.maxHpValue, this.hpValue + amount);
  }

  /** 배리어를 한도까지 채운다. */
  shield(amount: number): void {
    this.bpValue = Math.min(this.maxBp, this.bpValue + amount);
  }

  /** 다음 피격의 피해를 줄이는 방어 자세를 잡는다. */
  brace(): void {
    this.guardUp = true;
  }

  /** 행동 게이지를 채운다. limit를 주면 그 값에서 멈춘다. */
  charge(amount: number, limit = Infinity): void {
    this.apValue = Math.min(limit, this.apValue + amount);
  }

  /** 행동 게이지를 뒤로 민다. */
  delay(amount: number): void {
    this.apValue = Math.max(0, this.apValue - amount);
  }

  /** 행동을 마쳐 게이지를 비운다. */
  spendTurn(): void {
    this.apValue = 0;
  }

  /** 전투에 들어설 때: 게이지를 정해진 값에서 시작하고 방어 자세를 푼다. */
  enterBattle(startAp: number): void {
    this.apValue = startAp;
    this.guardUp = false;
  }

  /** 하위 클래스가 성장이나 회복으로 몸 상태를 바꿀 때 쓴다. */
  protected setVitals(next: Partial<{ hp: number; bp: number; maxHp: number; def: number }>): void {
    if (next.maxHp !== undefined) this.maxHpValue = next.maxHp;
    if (next.def !== undefined) this.defValue = next.def;
    if (next.hp !== undefined) this.hpValue = next.hp;
    if (next.bp !== undefined) this.bpValue = next.bp;
  }
}

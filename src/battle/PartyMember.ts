import { Combatant } from './Combatant';
import type { Command } from './commands';

/** 아군 한 사람의 레벨 1 수치와 소개. */
export interface HeroSpec {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly hp: number;
  readonly bp: number;
  readonly mp: number;
  readonly atk: number;
  readonly mag: number;
  readonly def: number;
  readonly spd: number;
  readonly weapon: string;
  readonly armor: string;
  /** 숫자 1~5에 놓이는 명령 다섯 가지. */
  readonly commands: readonly Command[];
}

/** 되돌릴 수 있도록 떠 둔 아군 한 사람의 상태. */
export interface MemberState {
  readonly hp: number;
  readonly bp: number;
  readonly mp: number;
  readonly maxHp: number;
  readonly maxBp: number;
  readonly maxMp: number;
  readonly atk: number;
  readonly mag: number;
  readonly def: number;
  readonly spd: number;
  readonly level: number;
  readonly xp: number;
}

/** 무기 강화 한 번에 오르는 공격력. */
const WEAPON_STEP = 4;
/** 방어구 강화 한 번에 오르는 배리어 한도. */
const ARMOR_STEP = 8;
/** 중량형 무기의 공격력 덤과 민첩 손해. */
const HEAVY_ATK = 7;
const HEAVY_SPD = 3;
/** 레벨이 오르는 데 필요한 경험치는 레벨 × 이 값. */
const XP_PER_LEVEL = 80;
const GROWTH = { hp: 16, bp: 5, mp: 5, atk: 3, mag: 3, def: 1, spd: 1 } as const;

/**
 * 플레이어가 명령을 내리는 아군. 마력(MP), 능력치, 장비, 성장을 스스로 관리한다.
 * 무엇을 할 수 있는지는 넘겨받은 명령 목록이 정하므로, 새 캐릭터는 수치와 명령만 바꿔 만든다.
 */
export class PartyMember extends Combatant {
  readonly role: string;
  readonly weapon: string;
  readonly armor: string;
  readonly commands: readonly Command[];

  private mpValue: number;
  private maxMpValue: number;
  private baseMaxBp: number;
  private atkValue: number;
  private magValue: number;
  private spdValue: number;
  private levelValue = 1;
  private xpValue = 0;
  private weaponLevelValue = 0;
  private armorLevelValue = 0;
  private heavy = false;

  constructor(spec: HeroSpec) {
    super(spec.id, spec.name, spec.hp, spec.def, spec.hp, spec.bp);
    this.role = spec.role;
    this.weapon = spec.weapon;
    this.armor = spec.armor;
    this.commands = spec.commands;
    this.mpValue = spec.mp;
    this.maxMpValue = spec.mp;
    this.baseMaxBp = spec.bp;
    this.atkValue = spec.atk;
    this.magValue = spec.mag;
    this.spdValue = spec.spd;
  }

  get mp(): number {
    return this.mpValue;
  }

  get maxMp(): number {
    return this.maxMpValue;
  }

  get maxBp(): number {
    return this.baseMaxBp + this.armorLevelValue * ARMOR_STEP;
  }

  get mag(): number {
    return this.magValue;
  }

  get level(): number {
    return this.levelValue;
  }

  get xp(): number {
    return this.xpValue;
  }

  get weaponLevel(): number {
    return this.weaponLevelValue;
  }

  /** 무기 강화와 형태까지 더한 공격력. */
  get attackPower(): number {
    return this.atkValue + this.weaponLevelValue * WEAPON_STEP + (this.heavy ? HEAVY_ATK : 0);
  }

  /** 무기 형태까지 반영한 민첩. 행동 게이지가 차는 빠르기다. */
  get speed(): number {
    return this.spdValue - (this.heavy ? HEAVY_SPD : 0);
  }

  spendMp(cost: number): void {
    this.mpValue -= cost;
  }

  restoreMp(amount: number): void {
    this.mpValue = Math.min(this.maxMpValue, this.mpValue + amount);
  }

  /** 배리어 한도 자체를 늘린다(군단의 지원처럼 전투 밖에서 받는 보탬). */
  fortify(amount: number): void {
    this.baseMaxBp += amount;
    this.setVitals({ bp: this.bp + amount });
  }

  /** 경험치를 얻고, 모이면 레벨이 오른다. */
  gainXp(amount: number): void {
    this.xpValue += amount;
    while (this.xpValue >= this.levelValue * XP_PER_LEVEL) {
      this.xpValue -= this.levelValue * XP_PER_LEVEL;
      this.levelValue += 1;
      this.baseMaxBp += GROWTH.bp;
      this.maxMpValue += GROWTH.mp;
      this.atkValue += GROWTH.atk;
      this.magValue += GROWTH.mag;
      this.spdValue += GROWTH.spd;
      this.setVitals({ maxHp: this.maxHp + GROWTH.hp, def: this.def + GROWTH.def });
    }
  }

  /** 생명력, 배리어, 마력을 모두 채운다. */
  recover(): void {
    this.setVitals({ hp: this.maxHp, bp: this.maxBp });
    this.mpValue = this.maxMpValue;
  }

  save(): MemberState {
    return {
      hp: this.hp,
      bp: this.bp,
      mp: this.mpValue,
      maxHp: this.maxHp,
      maxBp: this.baseMaxBp,
      maxMp: this.maxMpValue,
      atk: this.atkValue,
      mag: this.magValue,
      def: this.def,
      spd: this.spdValue,
      level: this.levelValue,
      xp: this.xpValue,
    };
  }

  load(state: MemberState): void {
    this.baseMaxBp = state.maxBp;
    this.maxMpValue = state.maxMp;
    this.mpValue = state.mp;
    this.atkValue = state.atk;
    this.magValue = state.mag;
    this.spdValue = state.spd;
    this.levelValue = state.level;
    this.xpValue = state.xp;
    this.setVitals({ maxHp: state.maxHp, def: state.def, hp: state.hp, bp: state.bp });
  }
}

import { Combatant } from './Combatant';

/** 적 한 종류의 수치. */
export interface EnemySpec {
  readonly id: string;
  readonly name: string;
  readonly hp: number;
  readonly bp: number;
  readonly atk: number;
  readonly def: number;
  readonly spd: number;
  /** 전투를 시작할 때의 행동 게이지. */
  readonly startAp: number;
  readonly boss?: boolean;
}

/** 적. 게이지가 차면 명령을 기다리지 않고 바로 공격한다. */
export class Enemy extends Combatant {
  readonly atk: number;
  readonly spd: number;
  readonly boss: boolean;
  private readonly barrier: number;

  constructor(spec: EnemySpec) {
    super(spec.id, spec.name, spec.hp, spec.def, spec.hp, spec.bp);
    this.atk = spec.atk;
    this.spd = spec.spd;
    this.boss = spec.boss ?? false;
    this.barrier = spec.bp;
    this.enterBattle(spec.startAp);
  }

  get maxBp(): number {
    return this.barrier;
  }

  get speed(): number {
    return this.spd;
  }
}

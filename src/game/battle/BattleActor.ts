import type { Combatant } from '../../battle/Combatant';
import { GoTo } from '../control/GoTo';
import type { ScriptedController } from '../control/ScriptedController';
import type { Character } from '../entities/Character';
import type { Vec2, Vec3 } from '../logic/view';

/** 전투에 나서는 한 사람의 몸과 그 몸을 움직이는 조종자. */
export interface Performer {
  readonly body: Character<string>;
  readonly lead: ScriptedController;
}

/** 자리에서 이보다 멀리 서 있으면 자리로 바로 옮긴다. */
const SLOT_TOLERANCE = 0.2;

/**
 * 전투 수치(Combatant)와 장면 속의 몸(Character)을 이어 준다.
 * 자리로 걸어가기, 맞은편 바라보기, 공격 동작을 시키고, 수치가 바뀌면 몸의 모습을 맞춘다.
 * 쓰러졌을 때 어떻게 보일지는 아군과 적이 달라서 하위 클래스가 정한다.
 */
export abstract class BattleActor {
  private route: GoTo | null = null;
  private slot: Vec2 | null = null;

  constructor(
    readonly combatant: Combatant,
    protected readonly body: Character<string>,
    private readonly lead: ScriptedController,
  ) {}

  get position(): Readonly<Vec2> {
    return this.body.position;
  }

  /** 발밑. 머리 위와 함께 몸이 화면에서 차지하는 자리를 알려 준다. */
  get feet(): Vec3 {
    const { x, z } = this.body.position;
    return { x, y: this.body.elevation, z };
  }

  /** 머리 위. 숫자와 표시를 띄울 자리다. */
  get overhead(): Vec3 {
    const { x, z } = this.body.position;
    return { x, y: this.body.elevation + this.body.height * 1.05, z };
  }

  /** 대형의 자기 자리로 걸어간다. */
  moveTo(slot: Readonly<Vec2>): void {
    this.slot = { x: slot.x, z: slot.z };
    this.route = new GoTo(this.slot);
    this.lead.travel(this.route);
  }

  /** 자리에 닿았거나, 길이 막혀 더 못 가고 멈췄는지. */
  get settled(): boolean {
    return this.route?.arrived ?? true;
  }

  /** 자리를 잡고 맞은편을 본다. 길이 막혀 못 닿았으면 그 자리로 바로 옮긴다(자리는 미리 빈 곳으로 골라 두었다). */
  takePlace(facing: Readonly<Vec2>): void {
    if (this.slot) {
      const { x, z } = this.body.position;
      if (Math.hypot(this.slot.x - x, this.slot.z - z) > SLOT_TOLERANCE) this.body.placeAt(this.slot);
    }
    this.lead.travel(null);
    this.route = null;
    this.body.turnTo(facing);
  }

  /** 공격 동작을 한 번 한다. */
  strike(): void {
    this.lead.attack();
  }

  /** 전투가 끝나 자리를 떠나도 되게 한다. */
  dismiss(): void {
    this.lead.travel(null);
    this.route = null;
    this.slot = null;
  }

  /** 수치에 맞춰 몸의 모습을 고친다(쓰러짐, 다시 일어남). */
  abstract refresh(): void;
}

/** 아군: 쓰러지면 그 자리에 눕고, 회복되면 다시 일어난다. */
export class AllyActor extends BattleActor {
  refresh(): void {
    this.body.setFallen(!this.combatant.alive);
  }
}

/** 적: 쓰러지면 장면에서 사라진다. */
export class FoeActor extends BattleActor {
  refresh(): void {
    this.body.setVisible(this.combatant.alive);
  }
}

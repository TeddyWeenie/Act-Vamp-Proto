import type { CharacterController, MoveIntent } from '../control/controller';
import type { Vec2 } from '../logic/view';

/** 캐릭터가 취할 수 있는 자세. 실제 그림 이름은 캐릭터마다 다르게 고른다. */
export type Pose = 'idle' | 'walk' | 'attack';

/** 상태가 캐릭터에게 시킬 수 있는 일. 상태는 캐릭터의 나머지 속을 보지 못한다. */
export interface CharacterActions {
  readonly controller: CharacterController;
  readonly position: Readonly<Vec2>;
  /** 반복하지 않는 자세가 끝났는지. */
  readonly poseFinished: boolean;
  show(pose: Pose, restart?: boolean): void;
  /** 한 프레임만큼 걷는다. 막혀서 거의 나아가지 못했으면 false. */
  walk(intent: MoveIntent, dt: number): boolean;
}

/**
 * 캐릭터의 행동 상태. 상태마다 같은 update를 다르게 구현하고, 다음 상태를 돌려준다.
 * 새 행동(피격, 시전, 쓰러짐)은 이 클래스를 상속한 상태를 더하면 된다.
 */
export abstract class CharacterState {
  /** 이 상태로 들어올 때 한 번 부른다. */
  enter(_character: CharacterActions): void {}

  abstract update(character: CharacterActions, dt: number): CharacterState;
}

class IdleState extends CharacterState {
  override enter(character: CharacterActions): void {
    character.show('idle');
  }

  update(character: CharacterActions): CharacterState {
    if (character.controller.takeAttack()) return CHARACTER_STATES.attack;
    return character.controller.moveIntent(character.position) ? CHARACTER_STATES.walk : this;
  }
}

class WalkState extends CharacterState {
  update(character: CharacterActions, dt: number): CharacterState {
    if (character.controller.takeAttack()) return CHARACTER_STATES.attack;
    const intent = character.controller.moveIntent(character.position);
    if (!intent) return CHARACTER_STATES.idle;

    const advanced = character.walk(intent, dt);
    // 벽에 막히면 제자리걸음을 하지 않고 서며, 클릭 이동은 그만둔다.
    if (!advanced) character.controller.stop();
    character.show(advanced ? 'walk' : 'idle');
    return this;
  }
}

class AttackState extends CharacterState {
  override enter(character: CharacterActions): void {
    character.controller.stop();
    character.show('attack', true);
  }

  update(character: CharacterActions): CharacterState {
    return character.poseFinished ? CHARACTER_STATES.idle : this;
  }
}

/** 상태는 자기 데이터를 갖지 않으므로 모든 캐릭터가 같은 객체를 함께 쓴다. */
export const CHARACTER_STATES: Readonly<Record<Pose, CharacterState>> = {
  idle: new IdleState(),
  walk: new WalkState(),
  attack: new AttackState(),
};

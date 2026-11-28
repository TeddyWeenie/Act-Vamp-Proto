import type { Vec2 } from '../logic/view';
import type { CharacterController, MoveIntent } from './controller';

/**
 * 조종자를 갈아 끼우는 자리. 탐색 중에는 플레이어가, 대화와 전투 중에는 연출이 주인공을 움직인다.
 * 캐릭터는 지금 누가 조종하는지 모른다.
 */
export class SwitchController implements CharacterController {
  private current: CharacterController;

  constructor(initial: CharacterController) {
    this.current = initial;
  }

  /** 조종자를 바꾼다. 물러나는 쪽에 밀려 있던 이동과 공격 입력은 버린다. */
  use(next: CharacterController): void {
    if (next === this.current) return;
    this.current.stop();
    this.current.takeAttack();
    next.takeAttack();
    this.current = next;
  }

  moveIntent(from: Readonly<Vec2>): MoveIntent | null {
    return this.current.moveIntent(from);
  }

  takeAttack(): boolean {
    return this.current.takeAttack();
  }

  stop(): void {
    this.current.stop();
  }
}

import type { ActionInput } from '../input';
import type { Vec2 } from '../logic/view';
import type { CharacterController, MoveIntent, MoveSource } from './controller';

/**
 * 플레이어의 조종. 이동 수단 여러 개를 우선순위대로 묶는다.
 * 앞에 있는 수단이 움직이려 하면 뒤에 있는 수단의 계획은 버린다(키보드를 누르면 클릭 이동이 취소된다).
 */
export class PlayerController implements CharacterController {
  constructor(
    private readonly sources: readonly MoveSource[],
    private readonly actions: ActionInput,
  ) {}

  moveIntent(from: Readonly<Vec2>): MoveIntent | null {
    let chosen: MoveIntent | null = null;
    for (const source of this.sources) {
      // 선택되지 않더라도 모든 수단에 물어야 밀린 입력이 뒤늦게 튀어나오지 않는다.
      const intent = source.moveIntent(from);
      if (chosen) source.stop();
      else chosen = intent;
    }
    return chosen;
  }

  takeAttack(): boolean {
    return this.actions.takeAttack();
  }

  stop(): void {
    for (const source of this.sources) source.stop();
  }
}

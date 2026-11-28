import type { Vec2 } from '../logic/view';
import type { CharacterController, MoveIntent, MoveSource } from './controller';

/**
 * 연출이 조종하는 캐릭터의 조종자. 어디로 걸을지는 갈아 끼우는 이동 수단(따라가기, 자리로 가기)이 정하고,
 * 공격은 연출이 요청할 때 한 번만 일어난다. 동료, 적, 전투 중의 주인공이 이것으로 움직인다.
 */
export class ScriptedController implements CharacterController {
  private source: MoveSource | null = null;
  private attackQueued = false;

  /** 이동 수단을 바꾼다. null이면 제자리에 선다. */
  travel(source: MoveSource | null): void {
    this.source?.stop();
    this.source = source;
  }

  /** 다음 프레임에 공격 동작을 한 번 하게 한다. */
  attack(): void {
    this.attackQueued = true;
  }

  moveIntent(from: Readonly<Vec2>): MoveIntent | null {
    return this.source?.moveIntent(from) ?? null;
  }

  takeAttack(): boolean {
    const queued = this.attackQueued;
    this.attackQueued = false;
    return queued;
  }

  stop(): void {
    this.source?.stop();
  }
}

import type { AxisInput } from '../input';
import { VIEW, inputToGround, type Vec2 } from '../logic/view';
import type { MoveIntent, MoveSource } from './controller';

/** 방향키를 누르고 있는 동안 그 방향으로 걷는다. 화면 기준 입력이라 카메라가 돌아간 각을 알아야 한다. */
export class KeyboardMove implements MoveSource {
  constructor(
    private readonly input: AxisInput,
    private readonly azimuth = VIEW.azimuth,
  ) {}

  moveIntent(_from: Readonly<Vec2>): MoveIntent | null {
    const axis = this.input.axis();
    if (axis.x === 0 && axis.y === 0) return null;
    return { dir: inputToGround(axis.x, axis.y, this.azimuth), maxDistance: Infinity };
  }

  stop(): void {}
}

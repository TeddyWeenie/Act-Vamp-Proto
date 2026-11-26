import type { AxisInput } from '../input';
import { inputToGround, type Vec2 } from '../logic/view';
import type { MoveIntent, MoveSource } from './controller';

/** 방향키를 누르고 있는 동안 그 방향으로 걷는다. */
export class KeyboardMove implements MoveSource {
  constructor(private readonly input: AxisInput) {}

  moveIntent(_from: Readonly<Vec2>): MoveIntent | null {
    const axis = this.input.axis();
    if (axis.x === 0 && axis.y === 0) return null;
    return { dir: inputToGround(axis.x, axis.y), maxDistance: Infinity };
  }

  stop(): void {}
}

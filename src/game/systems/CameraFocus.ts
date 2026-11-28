import type { Vec2 } from '../logic/view';

/**
 * 카메라가 바라볼 곳. 보통은 주인공을 따라가고, 전투처럼 한 자리를 비춰야 할 때는 그 자리에 머문다.
 * 카메라는 이것의 위치만 읽으므로 지금 무엇을 비추는지 모른다.
 */
export class CameraFocus {
  private fixed: Vec2 | null = null;

  constructor(private readonly subject: { readonly position: Readonly<Vec2> }) {}

  get position(): Readonly<Vec2> {
    return this.fixed ?? this.subject.position;
  }

  /** 한 자리를 비춘다. */
  hold(point: Readonly<Vec2>): void {
    this.fixed = { x: point.x, z: point.z };
  }

  /** 다시 주인공을 따라간다. */
  release(): void {
    this.fixed = null;
  }
}

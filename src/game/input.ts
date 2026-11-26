/** 화면 기준 이동 입력. 오른쪽 +x, 위쪽 +y. */
export interface AxisInput {
  axis(): { readonly x: number; readonly y: number };
}

/** 한 번 읽으면 비워지는 행동 입력. */
export interface ActionInput {
  takeAttack(): boolean;
}

export interface PointerClick {
  readonly ndcX: number;
  readonly ndcY: number;
}

/** 한 번 읽으면 비워지는 클릭 위치(화면 좌표 -1~1). */
export interface PointerInput {
  takePointer(): PointerClick | null;
}

/** 한 번 읽으면 비워지는 확대·축소 입력. */
export interface ZoomInput {
  takeWheel(): number;
}

/**
 * 브라우저의 키보드와 포인터 이벤트를 모아 게임이 읽기 쉬운 값으로 바꾼다.
 * 쓰는 쪽은 위의 작은 인터페이스 가운데 필요한 것만 받는다.
 */
export class DomInput implements AxisInput, ActionInput, PointerInput, ZoomInput {
  private readonly keys = new Set<string>();
  private readonly axisValue = { x: 0, y: 0 };
  private attackQueued = false;
  private pointerTarget: PointerClick | null = null;
  private wheel = 0;

  constructor(private readonly element: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    element.addEventListener('pointerdown', this.onPointerDown);
    element.addEventListener('wheel', this.onWheel, { passive: false });
  }

  axis(): { readonly x: number; readonly y: number } {
    const keys = this.keys;
    const right = keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0;
    const left = keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0;
    const up = keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0;
    const down = keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0;
    this.axisValue.x = right - left;
    this.axisValue.y = up - down;
    return this.axisValue;
  }

  takeAttack(): boolean {
    const queued = this.attackQueued;
    this.attackQueued = false;
    return queued;
  }

  takePointer(): PointerClick | null {
    const target = this.pointerTarget;
    this.pointerTarget = null;
    return target;
  }

  takeWheel(): number {
    const delta = this.wheel;
    this.wheel = 0;
    return delta;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    this.element.removeEventListener('wheel', this.onWheel);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Space') {
      if (!event.repeat) this.attackQueued = true;
      event.preventDefault();
      return;
    }
    if (event.code.startsWith('Arrow')) event.preventDefault();
    this.keys.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private readonly onBlur = (): void => {
    this.keys.clear();
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const rect = this.element.getBoundingClientRect();
    this.pointerTarget = {
      ndcX: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      ndcY: -(((event.clientY - rect.top) / rect.height) * 2 - 1),
    };
  };

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.wheel += Math.sign(event.deltaY);
  };
}

import { describe, expect, it } from 'vitest';
import { groundToScreen, inputToGround, screenRight, screenUp, towardCamera } from '../src/game/logic/view';

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

describe('고정 쿼터뷰 방향', () => {
  it('카메라는 위에서 45도로 내려다본다', () => {
    const dir = towardCamera();
    close(Math.hypot(dir.x, dir.y, dir.z), 1);
    close(dir.y, Math.SQRT1_2);
    close(dir.x, 0.5);
    close(dir.z, 0.5);
  });

  it('화면 오른쪽과 위쪽은 지면에서 서로 수직이다', () => {
    const r = screenRight();
    const u = screenUp();
    close(r.x * u.x + r.z * u.z, 0);
    // 화면 위쪽은 카메라에서 멀어지는 방향이다.
    const cam = towardCamera();
    expect(u.x * cam.x + u.z * cam.z).toBeLessThan(0);
  });

  it('대각선 입력도 같은 속도로 움직인다', () => {
    const straight = inputToGround(1, 0);
    const diagonal = inputToGround(1, 1);
    close(Math.hypot(straight.x, straight.z), 1);
    close(Math.hypot(diagonal.x, diagonal.z), 1);
  });

  it('입력이 없으면 움직이지 않는다', () => {
    expect(inputToGround(0, 0)).toEqual({ x: 0, z: 0 });
  });

  it('지면 방향을 화면 성분으로 되돌리면 입력과 같다', () => {
    const screen = groundToScreen(inputToGround(1, 0));
    close(screen.right, 1);
    close(screen.up, 0);
    const up = groundToScreen(inputToGround(0, 1));
    close(up.right, 0);
    close(up.up, 1);
  });
});

import { describe, expect, it } from 'vitest';
import type { MoveIntent, MoveSource } from '../src/game/control/controller';
import { KeyboardMove } from '../src/game/control/KeyboardMove';
import { PlayerController } from '../src/game/control/PlayerController';
import { PointerMove } from '../src/game/control/PointerMove';
import type { PointerClick } from '../src/game/input';
import { CollisionMap } from '../src/game/systems/CollisionMap';

const BOUNDS = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
const ORIGIN = { x: 0, z: 0 };

class FakeSource implements MoveSource {
  asked = 0;
  stops = 0;
  constructor(public intent: MoveIntent | null) {}
  moveIntent(): MoveIntent | null {
    this.asked++;
    return this.intent;
  }
  stop(): void {
    this.stops++;
  }
}

function pointerSetup() {
  let click: PointerClick | null = null;
  const input = {
    takePointer: () => {
      const taken = click;
      click = null;
      return taken;
    },
  };
  // 화면 좌표를 그대로 10배 한 지면 위치로 바꾸는 가짜 카메라.
  const picker = { pickGround: (x: number, y: number) => ({ x: x * 10, z: y * 10 }) };
  const move = new PointerMove(input, picker, new CollisionMap(BOUNDS));
  return { move, press: (ndcX: number, ndcY: number) => (click = { ndcX, ndcY }) };
}

describe('키보드 이동', () => {
  it('누르지 않으면 이동 의사가 없다', () => {
    expect(new KeyboardMove({ axis: () => ({ x: 0, y: 0 }) }).moveIntent(ORIGIN)).toBeNull();
  });

  it('대각선으로 눌러도 방향의 길이는 1이다', () => {
    const intent = new KeyboardMove({ axis: () => ({ x: 1, y: 1 }) }).moveIntent(ORIGIN)!;
    expect(Math.hypot(intent.dir.x, intent.dir.z)).toBeCloseTo(1, 6);
    expect(intent.maxDistance).toBe(Infinity);
  });
});

describe('클릭 이동', () => {
  it('클릭한 곳을 향하고 남은 거리만큼만 가게 한다', () => {
    const { move, press } = pointerSetup();
    press(0.3, 0.4);
    const intent = move.moveIntent(ORIGIN)!;
    expect(intent.dir.x).toBeCloseTo(0.6, 6);
    expect(intent.dir.z).toBeCloseTo(0.8, 6);
    expect(intent.maxDistance).toBeCloseTo(5, 6);
    expect(move.destination).toEqual({ x: 3, z: 4 });
  });

  it('맵 밖을 클릭하면 경계 안쪽으로 당긴다', () => {
    const { move, press } = pointerSetup();
    press(5, 0);
    move.moveIntent(ORIGIN);
    expect(move.destination).toEqual({ x: 10, z: 0 });
  });

  it('도착하면 목적지를 지운다', () => {
    const { move, press } = pointerSetup();
    press(0.3, 0.4);
    expect(move.moveIntent({ x: 3, z: 4 })).toBeNull();
    expect(move.destination).toBeNull();
  });

  it('멈추라고 하면 목적지를 버린다', () => {
    const { move, press } = pointerSetup();
    press(0.3, 0.4);
    move.moveIntent(ORIGIN);
    move.stop();
    expect(move.moveIntent(ORIGIN)).toBeNull();
  });
});

describe('플레이어 조종', () => {
  const intent: MoveIntent = { dir: { x: 1, z: 0 }, maxDistance: Infinity };

  it('앞선 수단이 움직이려 하면 뒤 수단의 계획을 버린다', () => {
    const keyboard = new FakeSource(intent);
    const pointer = new FakeSource({ dir: { x: 0, z: 1 }, maxDistance: 2 });
    const controller = new PlayerController([keyboard, pointer], { takeAttack: () => false });
    expect(controller.moveIntent(ORIGIN)).toBe(intent);
    expect(pointer.asked).toBe(1);
    expect(pointer.stops).toBe(1);
    expect(keyboard.stops).toBe(0);
  });

  it('앞선 수단이 가만히 있으면 뒤 수단을 따른다', () => {
    const keyboard = new FakeSource(null);
    const pointer = new FakeSource(intent);
    const controller = new PlayerController([keyboard, pointer], { takeAttack: () => false });
    expect(controller.moveIntent(ORIGIN)).toBe(intent);
    expect(pointer.stops).toBe(0);
  });

  it('멈추면 모든 수단이 멈춘다', () => {
    const sources = [new FakeSource(intent), new FakeSource(intent)];
    new PlayerController(sources, { takeAttack: () => false }).stop();
    expect(sources.map((source) => source.stops)).toEqual([1, 1]);
  });
});

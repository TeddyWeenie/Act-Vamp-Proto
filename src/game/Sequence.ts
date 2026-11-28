import type { Updatable } from './capabilities';

/** 여러 가지를 정해진 순서대로 한 걸음씩 진행시킨다. 게임의 박자(Game)는 이것이 몇 개로 이루어졌는지 모른다. */
export class Sequence implements Updatable {
  constructor(private readonly parts: readonly Updatable[]) {}

  update(dt: number): void {
    for (const part of this.parts) part.update(dt);
  }
}

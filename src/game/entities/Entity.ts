import type { Object3D } from 'three';
import type { Updatable } from '../capabilities';

/**
 * 장면에 놓이는 모든 것의 공통 뼈대.
 * 월드는 건물인지 캐릭터인지 묻지 않고 root를 무대에 올리고 update만 부른다.
 */
export abstract class Entity implements Updatable {
  protected constructor(readonly root: Object3D) {}

  /** 시간이 흐를 때 할 일. 가만히 있는 것은 그대로 둔다. */
  update(_dt: number): void {}
}

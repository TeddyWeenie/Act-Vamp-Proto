import { isObstacle, isOccluder, isRaised, type Stage, type Updatable } from './capabilities';
import type { Entity } from './entities/Entity';
import type { CollisionMap } from './systems/CollisionMap';
import type { OcclusionSystem } from './systems/OcclusionSystem';

/**
 * 장면에 있는 모든 것을 맡는다.
 * 새로 들어온 것이 무엇을 할 수 있는지 보고 알맞은 곳에 등록하므로,
 * 새 종류의 물체를 더할 때 이 클래스는 고치지 않는다.
 */
export class World implements Updatable {
  private readonly entities: Entity[] = [];

  constructor(
    private readonly stage: Stage,
    private readonly collisions: CollisionMap,
    private readonly occlusion: OcclusionSystem,
  ) {}

  /** 장면에 있는 것들. 검증 도구가 들여다볼 때 쓴다. */
  get members(): readonly Entity[] {
    return this.entities;
  }

  add<T extends Entity>(entity: T): T {
    this.entities.push(entity);
    this.stage.add(entity.root);
    if (isObstacle(entity)) this.collisions.add(entity);
    if (isRaised(entity)) this.collisions.raise(entity);
    if (isOccluder(entity)) this.occlusion.add(entity);
    return entity;
  }

  update(dt: number): void {
    for (const entity of this.entities) entity.update(dt);
    this.occlusion.update(dt);
  }
}

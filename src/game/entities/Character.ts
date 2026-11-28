import type { OcclusionTarget, SpriteAnimator, WalkableSpace } from '../capabilities';
import type { CharacterController, MoveIntent } from '../control/controller';
import type { FacingRule } from '../logic/facing';
import type { Facing } from '../logic/movement';
import type { Vec2 } from '../logic/view';
import {
  CHARACTER_STATES,
  type CharacterActions,
  type CharacterState,
  type Pose,
} from '../states/characterStates';
import { Entity } from './Entity';

/** 캐릭터의 몸 크기와 빠르기. */
export interface CharacterBody {
  /** 걷는 속도(월드 단위/초). */
  readonly speed: number;
  /** 충돌에 쓰는 발밑 원의 반지름. */
  readonly radius: number;
  /** 키. 가림 검사 높이를 정한다. */
  readonly height: number;
}

/** 이동 거리의 이 비율도 나아가지 못하면 막힌 것으로 본다. */
const BLOCKED_RATIO = 0.2;

/**
 * 걸어 다니는 2D 캐릭터의 공통 뼈대.
 * 위치, 방향, 행동 상태를 스스로 관리하고, 무엇에 조종되는지, 어떤 공간을 걷는지, 방향을 어떻게 정하는지는 주입받는다.
 * 하위 클래스는 자세를 자기 그림 이름으로 바꾸는 방법만 정한다.
 */
export abstract class Character<Clip extends string>
  extends Entity
  implements OcclusionTarget, CharacterActions
{
  readonly occlusionHeights: readonly number[];

  private state: CharacterState = CHARACTER_STATES.idle;
  private pose: Pose = 'idle';
  private current: Vec2;
  private direction: Facing;

  protected constructor(
    private readonly sprite: SpriteAnimator<Clip>,
    private readonly body: CharacterBody,
    private readonly space: WalkableSpace,
    readonly controller: CharacterController,
    start: Readonly<Vec2>,
    private readonly facingRule: FacingRule,
  ) {
    super(sprite.root);
    this.current = { x: start.x, z: start.z };
    this.direction = facingRule.initial;
    this.occlusionHeights = [0.25, body.height * 0.55, body.height * 0.95];
    this.sprite.setPosition(start.x, start.z, this.elevation);
  }

  get position(): Readonly<Vec2> {
    return this.current;
  }

  /** 발이 놓인 높이. 평지에서는 0이고 계단 위에서는 그 단의 높이다. */
  get elevation(): number {
    return this.space.heightAt(this.current, this.body.radius);
  }

  /** 키. 머리 위에 숫자나 표시를 띄울 높이를 정할 때 쓴다. */
  get height(): number {
    return this.body.height;
  }

  get hidden(): boolean {
    return !this.root.visible;
  }

  get halfWidth(): number {
    return this.body.radius;
  }

  get facing(): Readonly<Facing> {
    return this.direction;
  }

  /** 지금 보여 주는 그림 이름. */
  get clip(): Clip {
    return this.sprite.clip;
  }

  get poseFinished(): boolean {
    return this.sprite.finished;
  }

  /** 걷지 않고 바로 옮긴다. 장면 전환이나 검증에 쓴다. */
  placeAt(point: Readonly<Vec2>): void {
    this.current = { x: point.x, z: point.z };
    this.controller.stop();
  }

  show(pose: Pose, restart = false): void {
    this.pose = pose;
    this.sprite.play(this.clipFor(pose, this.direction), restart);
  }

  /** 걷지 않고 그 방향을 바라본다. 대화 상대나 전투의 맞은편을 볼 때 쓴다. */
  turnTo(dir: Readonly<Vec2>): void {
    this.direction = this.facingRule.next(dir, this.direction);
    this.sprite.play(this.clipFor(this.pose, this.direction));
  }

  /**
   * 쓰러졌는지 나타낸다. 쓰러진 그림이 아직 없어서 지금은 서 있는 그림을 옆으로 눕힌다.
   * 쓰러진 동작 그림이 생기면 이 안만 바꾸면 되고, 부르는 쪽은 그대로다.
   */
  setFallen(fallen: boolean): void {
    this.root.rotation.z = fallen ? Math.PI / 2 : 0;
  }

  walk(intent: MoveIntent, dt: number): boolean {
    const distance = Math.min(this.body.speed * dt, intent.maxDistance);
    if (distance <= 0) return true;
    const next = this.space.move(this.current, intent.dir, distance, this.body.radius);
    const moved = Math.hypot(next.x - this.current.x, next.z - this.current.z);
    this.direction = this.facingRule.next(intent.dir, this.direction);
    this.current = next;
    return moved > distance * BLOCKED_RATIO;
  }

  override update(dt: number): void {
    const next = this.state.update(this, dt);
    if (next !== this.state) {
      this.state = next;
      next.enter(this);
    }
    this.sprite.faceLeft(this.direction.left);
    this.sprite.setPosition(this.current.x, this.current.z, this.elevation);
    this.sprite.update(dt);
  }

  /** 자세와 방향에 맞는 그림 이름. 가진 그림이 캐릭터마다 달라서 하위 클래스가 정한다. */
  protected abstract clipFor(pose: Pose, facing: Readonly<Facing>): Clip;
}

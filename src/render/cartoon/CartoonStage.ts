import type { Camera, Scene, Vector3, WebGLRenderer } from 'three';
import type { CartoonBuilding } from './CartoonBuilding';

/** What a stage needs to know about the current view. */
export interface ViewContext {
  readonly camera: Camera;
  /** The world point the camera looks at (the ground point at screen centre). */
  readonly focus: Vector3;
}

/**
 * One switchable step of the cartoon look.
 *
 * The base class owns the on/off state so no subclass can forget to react to it: the setter is
 * the only way to change it and it always calls `onEnabledChanged`. What a stage acts on is
 * declared separately through the small role interfaces below, so a stage implements only the
 * roles it really has.
 */
export abstract class CartoonStage {
  private isEnabled = true;

  protected constructor(public readonly id: string) {}

  get enabled(): boolean {
    return this.isEnabled;
  }

  set enabled(value: boolean) {
    if (value === this.isEnabled) return;
    this.isEnabled = value;
    this.onEnabledChanged(value);
  }

  /** Bring everything this stage controls in line with the new state. */
  protected abstract onEnabledChanged(enabled: boolean): void;

  /** Free GPU resources. Stages that own none keep this empty default. */
  dispose(): void {}
}

/** Role: the stage changes how buildings are drawn. */
export interface BuildingRole {
  adopt(building: CartoonBuilding): void;
  release(building: CartoonBuilding): void;
}

/** Role: the stage adds things to the scene or follows the camera. */
export interface SceneRole {
  attach(scene: Scene): void;
  detach(scene: Scene): void;
  update(view: ViewContext): void;
}

/** Role: the stage draws the frame itself (a post-process). */
export interface FrameRole {
  /** True when this stage wants to draw the frame right now. */
  readonly drawsFrame: boolean;
  setSize(width: number, height: number, pixelRatio: number): void;
  render(renderer: WebGLRenderer, scene: Scene, camera: Camera): void;
}

export const hasBuildingRole = (s: object): s is BuildingRole => 'adopt' in s && 'release' in s;
export const hasSceneRole = (s: object): s is SceneRole => 'attach' in s && 'update' in s;
export const hasFrameRole = (s: object): s is FrameRole => 'render' in s && 'setSize' in s;

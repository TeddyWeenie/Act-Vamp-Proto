import type { Camera, Object3D, Scene, WebGLRenderer } from 'three';
import { CartoonBuilding } from './CartoonBuilding';
import { hasBuildingRole, hasFrameRole, hasSceneRole, type CartoonStage, type ViewContext } from './CartoonStage';
import { ColorGradePass } from './ColorGradePass';
import { TextureFlattenPatch, ToonMaterialFactory, UnlitMaterialFactory } from './materials';
import { OutlineShellFactory } from './outline';
import { DEFAULT_CARTOON_SETTINGS, type CartoonSettings } from './settings';
import { BlobShadowFactory } from './shadows';
import { FlattenStage, GradeStage, LightingStage, OutlineStage, ToonShadeStage } from './stages';

/**
 * The cartoon look as one object. It knows stages only through the `CartoonStage` base class and
 * the role interfaces, so a new step is a new stage class passed to the constructor: nothing
 * here changes.
 *
 *   const look = CartoonLook.createDefault({ ...DEFAULT_CARTOON_SETTINGS, characterHeight: 1.6 });
 *   look.attach(scene);
 *   const house = look.addBuilding(gltf.scene);      // materials + outline are now cartoon
 *   look.update({ camera, focus });                  // once for a fixed camera
 *   look.setSize(width, height, renderer.getPixelRatio());
 *   look.render(renderer, scene, camera);            // instead of renderer.render(...)
 */
export class CartoonLook {
  private readonly stages = new Map<string, CartoonStage>();
  private readonly buildings = new Set<CartoonBuilding>();

  constructor(stages: readonly CartoonStage[]) {
    for (const stage of stages) this.stages.set(stage.id, stage);
  }

  /** The five stages tuned in the model viewer, wired together. */
  static createDefault(settings: CartoonSettings = DEFAULT_CARTOON_SETTINGS): CartoonLook {
    const flatten = new TextureFlattenPatch(settings.flatten);
    return new CartoonLook([
      new ToonShadeStage(new ToonMaterialFactory(settings.shade, [flatten]), new UnlitMaterialFactory([flatten])),
      new OutlineStage(new OutlineShellFactory(settings.outline, settings.characterHeight)),
      new FlattenStage(flatten),
      new LightingStage(settings.light, settings.shade, settings.characterHeight, new BlobShadowFactory(settings.light)),
      new GradeStage(settings.grade, settings.characterHeight, new ColorGradePass(settings.grade)),
    ]);
  }

  /** A stage by id ('shade', 'outline', 'flatten', 'light', 'grade'), typed as asked. */
  stage<T extends CartoonStage = CartoonStage>(id: string): T {
    const stage = this.stages.get(id);
    if (!stage) throw new Error(`CartoonLook has no stage "${id}". Known: ${[...this.stages.keys()].join(', ')}`);
    return stage as T;
  }

  setEnabled(id: string, enabled: boolean): void {
    this.stage(id).enabled = enabled;
  }

  /** Switch every stage at once: the before/after toggle. */
  setAllEnabled(enabled: boolean): void {
    for (const stage of this.stages.values()) stage.enabled = enabled;
  }

  addBuilding(root: Object3D): CartoonBuilding {
    const building = new CartoonBuilding(root);
    this.buildings.add(building);
    for (const stage of this.stages.values()) if (hasBuildingRole(stage)) stage.adopt(building);
    return building;
  }

  removeBuilding(building: CartoonBuilding): void {
    if (!this.buildings.delete(building)) return;
    for (const stage of this.stages.values()) if (hasBuildingRole(stage)) stage.release(building);
    building.dispose();
  }

  attach(scene: Scene): void {
    for (const stage of this.stages.values()) if (hasSceneRole(stage)) stage.attach(scene);
  }

  detach(scene: Scene): void {
    for (const stage of this.stages.values()) if (hasSceneRole(stage)) stage.detach(scene);
  }

  update(view: ViewContext): void {
    for (const stage of this.stages.values()) if (hasSceneRole(stage)) stage.update(view);
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    for (const stage of this.stages.values()) if (hasFrameRole(stage)) stage.setSize(width, height, pixelRatio);
  }

  /** Draw the frame through the first stage that wants to, or plainly when none does. */
  render(renderer: WebGLRenderer, scene: Scene, camera: Camera): void {
    for (const stage of this.stages.values()) {
      if (hasFrameRole(stage) && stage.drawsFrame) return stage.render(renderer, scene, camera);
    }
    renderer.render(scene, camera);
  }

  dispose(): void {
    for (const building of this.buildings) building.dispose();
    this.buildings.clear();
    for (const stage of this.stages.values()) stage.dispose();
    this.stages.clear();
  }
}

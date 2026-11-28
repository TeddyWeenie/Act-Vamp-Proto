import {
  AmbientLight, Color, DirectionalLight, Fog, Vector3,
  type Camera, type Mesh, type Scene, type WebGLRenderer,
} from 'three';
import { CartoonStage, type BuildingRole, type FrameRole, type SceneRole, type ViewContext } from './CartoonStage';
import type { CartoonBuilding } from './CartoonBuilding';
import type { ColorGradePass } from './ColorGradePass';
import type { BuildingMaterialFactory, TextureFlattenPatch } from './materials';
import type { OutlineShellFactory } from './outline';
import type { BlobShadowFactory } from './shadows';
import type { GradeSettings, LightSettings, ShadeSettings } from './settings';

/** 1. Toon shading: bodies are cel-shaded while on, plain texture colour while off. */
export class ToonShadeStage extends CartoonStage implements BuildingRole {
  private readonly buildings = new Set<CartoonBuilding>();

  constructor(private readonly toon: BuildingMaterialFactory, private readonly unlit: BuildingMaterialFactory) {
    super('shade');
  }

  adopt(building: CartoonBuilding): void {
    this.buildings.add(building);
    building.useMaterials(this.factory());
  }

  release(building: CartoonBuilding): void {
    this.buildings.delete(building);
  }

  protected onEnabledChanged(): void {
    for (const building of this.buildings) building.useMaterials(this.factory());
  }

  override dispose(): void {
    this.toon.dispose();
    this.unlit.dispose();
  }

  private factory(): BuildingMaterialFactory {
    return this.enabled ? this.toon : this.unlit;
  }
}

/** 2. Outline in the sprite's ink colour and width. */
export class OutlineStage extends CartoonStage implements BuildingRole {
  private readonly buildings = new Set<CartoonBuilding>();

  constructor(private readonly shells: OutlineShellFactory) {
    super('outline');
  }

  adopt(building: CartoonBuilding): void {
    this.buildings.add(building);
    building.addOutline(this.shells);
    building.setOutlineVisible(this.enabled);
  }

  release(building: CartoonBuilding): void {
    this.buildings.delete(building);
  }

  protected onEnabledChanged(enabled: boolean): void {
    for (const building of this.buildings) building.setOutlineVisible(enabled);
  }
}

/** 3. Texture flattening and palette match. */
export class FlattenStage extends CartoonStage {
  constructor(private readonly patch: TextureFlattenPatch) {
    super('flatten');
    patch.active = true;
  }

  protected onEnabledChanged(enabled: boolean): void {
    this.patch.active = enabled;
  }
}

/**
 * 4. Light direction matched to the sprite's painted light, plus ground shadows.
 * The lights exist either way (toon shading needs them); this stage decides where the key light
 * comes from and whether the shadows it handed out are visible.
 */
export class LightingStage extends CartoonStage implements SceneRole {
  private readonly ambient: AmbientLight;
  private readonly sun: DirectionalLight;
  private readonly shadows = new Set<Mesh>();
  private readonly right = new Vector3();
  private readonly toward = new Vector3();
  private readonly shift = new Vector3();

  constructor(
    private readonly settings: LightSettings,
    shade: ShadeSettings,
    private readonly characterHeight: number,
    private readonly blobs: BlobShadowFactory,
  ) {
    super('light');
    this.ambient = new AmbientLight(0xffffff, shade.ambientIntensity);
    this.sun = new DirectionalLight(0xffffff, shade.sunIntensity);
  }

  attach(scene: Scene): void {
    scene.add(this.ambient, this.sun, this.sun.target);
  }

  detach(scene: Scene): void {
    scene.remove(this.ambient, this.sun, this.sun.target);
  }

  /** Call when the camera turns. With the game's fixed camera, once after setup is enough. */
  update(view: ViewContext): void {
    view.camera.updateMatrixWorld();
    const e = view.camera.matrixWorld.elements;
    this.right.set(e[0], 0, e[2]).normalize();
    this.toward.set(e[8], 0, e[10]);
    if (this.toward.lengthSq() < 1e-6) this.toward.set(e[4], 0, e[6]);
    this.toward.normalize();
    const m = this.settings.matchedDirection, u = this.settings.unmatchedDirection;
    if (this.enabled) this.sun.position.copy(this.right).multiplyScalar(m[0]).addScaledVector(this.toward, m[2]).setY(m[1]);
    else this.sun.position.set(u[0], u[1], u[2]);
    this.sun.position.multiplyScalar(10).add(view.focus);
    this.sun.target.position.copy(view.focus);
    const o = this.settings.shadowOffset, h = this.characterHeight;
    this.shift.copy(this.right).multiplyScalar(o[0] * h).addScaledVector(this.toward, o[1] * h);
  }

  /** Round shadow for a character's feet. Add it to the scene and move it with `placeShadow`. */
  createCharacterShadow(): Mesh {
    const [w, d] = this.settings.characterShadow;
    return this.track(this.blobs.create('round', w * this.characterHeight, d * this.characterHeight));
  }

  /** Soft box shadow for a building footprint (world units). */
  createBuildingShadow(width: number, depth: number): Mesh {
    return this.track(this.blobs.create('box', width * 1.5, depth * 1.5));
  }

  /** Put a shadow under a ground point, slid a little away from the light. `spread` grows the slide for tall things. */
  placeShadow(shadow: Mesh, ground: Vector3, spread = 1): void {
    shadow.position.copy(ground).addScaledVector(this.shift, spread);
    shadow.position.y = ground.y + 0.006 * this.characterHeight;
  }

  protected onEnabledChanged(enabled: boolean): void {
    for (const shadow of this.shadows) shadow.visible = enabled;
  }

  override dispose(): void {
    for (const shadow of this.shadows) (shadow.material as { dispose(): void }).dispose();
    this.shadows.clear();
    this.blobs.dispose();
  }

  private track(shadow: Mesh): Mesh {
    shadow.visible = this.enabled;
    this.shadows.add(shadow);
    return shadow;
  }
}

/** 5. Whole-frame colour grade and distance fog. */
export class GradeStage extends CartoonStage implements SceneRole, FrameRole {
  private readonly fog: Fog;
  private scene: Scene | null = null;

  constructor(private readonly settings: GradeSettings, private readonly characterHeight: number, private readonly pass: ColorGradePass) {
    super('grade');
    this.fog = new Fog(new Color(settings.fogColor), 1, 100);
  }

  get drawsFrame(): boolean {
    return this.enabled;
  }

  attach(scene: Scene): void {
    this.scene = scene;
    this.applyFog();
  }

  detach(scene: Scene): void {
    if (scene.fog === this.fog) scene.fog = null;
    this.scene = null;
  }

  update(view: ViewContext): void {
    const distance = view.camera.position.distanceTo(view.focus);
    this.fog.near = distance + this.settings.fogNear * this.characterHeight;
    this.fog.far = distance + this.settings.fogFar * this.characterHeight;
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.pass.setSize(width, height, pixelRatio);
  }

  render(renderer: WebGLRenderer, scene: Scene, camera: Camera): void {
    this.pass.render(renderer, scene, camera);
  }

  protected onEnabledChanged(): void {
    this.applyFog();
  }

  override dispose(): void {
    this.pass.dispose();
  }

  private applyFog(): void {
    if (!this.scene) return;
    if (this.enabled) this.scene.fog = this.fog;
    else if (this.scene.fog === this.fog) this.scene.fog = null;
  }
}

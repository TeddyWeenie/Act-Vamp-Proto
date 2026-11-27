import {
  OrthographicCamera,
  type Camera,
  type Material,
  type Mesh,
  type MeshBasicMaterial,
  type Object3D,
  type Scene,
  type Texture,
  type Vector3,
  type WebGLRenderer,
} from 'three';
import type { Bounds } from '../game/logic/movement';
import { castShadowOutline } from '../game/logic/shadow';
import {
  DEFAULT_ATMOSPHERE,
  LensPass,
  Motes,
  SceneLight,
  ShadeMap,
  type AtmosphereSettings,
} from './atmosphere';
import type { BuildingSkin, GroundArea, SceneLook } from './look';

/**
 * 다른 화면 느낌 위에 "같은 빛과 같은 공기"를 덧입힌다.
 *  1. 장면의 빛: 캐릭터가 그늘에 들어가면 어둡고 차갑게, 햇빛에서는 따뜻하게 물든다.
 *  2. 렌즈: 화면 전체에 빛 번짐, 먼 곳 흐림, 옅은 안개, 색 보정을 한 겹 씌운다.
 *  3. 공기: 빛 입자가 캐릭터 앞뒤로 떠다닌다.
 * 그림과 건물을 어떻게 그릴지는 감싼 화면 느낌에 그대로 맡기므로, 어떤 화면 느낌에도 씌울 수 있다.
 */
export class AtmosphereLook implements SceneLook {
  private readonly shade: ShadeMap;
  private readonly light: SceneLight;
  private readonly lens: LensPass;
  private readonly motes: Motes;
  private screenHeight = 1;

  constructor(
    private readonly inner: SceneLook,
    area: Bounds,
    settings: AtmosphereSettings = DEFAULT_ATMOSPHERE,
  ) {
    this.shade = new ShadeMap(area, settings.light.cellsPerUnit);
    this.light = new SceneLight(settings.light, this.shade);
    this.lens = new LensPass(settings.lens);
    this.motes = new Motes(settings.motes);
  }

  get fadedOpacity(): number {
    return this.inner.fadedOpacity;
  }

  get fadeRate(): number {
    return this.inner.fadeRate;
  }

  get groundTileSize(): number {
    return this.inner.groundTileSize;
  }

  spriteMaterial(map: Texture): MeshBasicMaterial {
    return this.light.lightWalker(this.inner.spriteMaterial(map));
  }

  propMaterial(map: Texture): MeshBasicMaterial {
    return this.light.lightFixture(this.inner.propMaterial(map));
  }

  footShadow(characterHeight: number): Object3D {
    return this.inner.footShadow(characterHeight);
  }

  dress(model: Object3D): BuildingSkin {
    return this.inner.dress(model);
  }

  dressFitting(piece: Mesh): BuildingSkin {
    return this.inner.dressFitting(piece);
  }

  depthOnlyMaterial(): Material {
    return this.inner.depthOnlyMaterial();
  }

  /** 땅에 그림자를 깔면서, 같은 모양을 빛 지도에도 적어 캐릭터가 그 그늘을 느끼게 한다. */
  groundShadow(area: GroundArea): Object3D {
    this.shade.addShadow(castShadowOutline(area), area.fromProp);
    return this.inner.groundShadow(area);
  }

  groundMaterial(map: Texture): Material {
    return this.inner.groundMaterial(map);
  }

  attach(scene: Scene): void {
    this.inner.attach(scene);
    scene.add(this.motes.object);
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.inner.setSize(width, height, pixelRatio);
    this.lens.setSize(width, height, pixelRatio);
    this.screenHeight = height * pixelRatio;
  }

  track(camera: Camera, focus: Vector3): void {
    this.inner.track(camera, focus);
    // 정사영 카메라는 거리와 상관없이 월드 1이 화면에서 늘 같은 크기다.
    const worldHeight = camera instanceof OrthographicCamera ? (camera.top - camera.bottom) / camera.zoom : 0;
    const pixelsPerUnit = worldHeight > 0 ? this.screenHeight / worldHeight : 0;
    this.motes.update(performance.now() / 1000, focus, pixelsPerUnit);
  }

  render(renderer: WebGLRenderer, scene: Scene, camera: Camera): void {
    this.lens.render(renderer, () => this.inner.render(renderer, scene, camera));
  }
}

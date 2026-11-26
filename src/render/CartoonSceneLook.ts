import {
  Mesh,
  Quaternion,
  Vector3,
  type Camera,
  type Material,
  type Object3D,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { CartoonLook, DEFAULT_CARTOON_SETTINGS, type CartoonSettings, type LightingStage } from './cartoon';
import { BaseLook, type BuildingSkin, type GroundArea } from './look';
import { NoTreatment, type TextureTreatment } from './treatment';

/** 건물 그림자를 빛 반대쪽으로 미는 정도. 건물 높이가 캐릭터 키의 몇 배인지에 곱한다. */
const BUILDING_SHADOW_SPREAD = 2.2;

interface PlacedShadow {
  readonly shadow: Mesh;
  readonly ground: Vector3;
  readonly spread: number;
}

/**
 * 카툰 화면: 3단계 명암, 스프라이트 선 색의 외곽선, 색 평탄화, 그림의 빛 방향에 맞춘 조명,
 * 화면 전체 색 보정과 안개. 실제 처리는 cartoon 모듈이 하고, 이 클래스는 게임의 약속(SceneLook)에 맞춰 이어 준다.
 * 수치(settings)와 건물·바닥 텍스처 손보기(buildingPaint, groundPaint)는 밖에서 넣어 주며, 묶음은 cartoonStyles.ts에 있다.
 */
export class CartoonSceneLook extends BaseLook {
  private readonly cartoon: CartoonLook;
  private readonly lighting: LightingStage;
  private readonly placed: PlacedShadow[] = [];
  private readonly lastOrientation = new Quaternion();
  private aligned = false;

  constructor(
    private readonly characterHeight: number,
    settings: CartoonSettings = DEFAULT_CARTOON_SETTINGS,
    private readonly buildingPaint: TextureTreatment = new NoTreatment(),
    private readonly groundPaint: TextureTreatment = new NoTreatment(),
  ) {
    super();
    this.cartoon = CartoonLook.createDefault({ ...settings, characterHeight });
    this.lighting = this.cartoon.stage<LightingStage>('light');
  }

  footShadow(): Object3D {
    return this.place(this.lighting.createCharacterShadow(), new Vector3(), 1);
  }

  /** 텍스처를 먼저 손보고 재질과 외곽선을 입힌다. 카툰 재질이 손본 텍스처를 그대로 이어받는다. */
  dress(model: Object3D): BuildingSkin {
    model.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      const materials: Material[] = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) {
        const map = (material as Material & { map?: Texture | null }).map;
        if (map) this.buildingPaint.apply(map);
      }
    });
    return this.cartoon.addBuilding(model);
  }

  override groundMaterial(map: Texture): Material {
    this.groundPaint.apply(map);
    return super.groundMaterial(map);
  }

  groundShadow(area: GroundArea): Object3D {
    const spread = (BUILDING_SHADOW_SPREAD * area.height) / this.characterHeight;
    const shadow = this.lighting.createBuildingShadow(area.width, area.depth);
    return this.place(shadow, new Vector3(area.x, 0, area.z), spread);
  }

  override attach(scene: Scene): void {
    super.attach(scene);
    this.cartoon.attach(scene);
  }

  override setSize(width: number, height: number, pixelRatio: number): void {
    this.cartoon.setSize(width, height, pixelRatio);
  }

  /** 카메라 각도가 그대로면 조명 방향과 그림자 위치도 그대로라 다시 계산하지 않는다. */
  override track(camera: Camera, focus: Vector3): void {
    if (this.aligned && this.lastOrientation.equals(camera.quaternion)) return;
    this.lastOrientation.copy(camera.quaternion);
    this.aligned = true;
    this.cartoon.update({ camera, focus });
    for (const { shadow, ground, spread } of this.placed) this.lighting.placeShadow(shadow, ground, spread);
  }

  override render(renderer: WebGLRenderer, scene: Scene, camera: Camera): void {
    this.cartoon.render(renderer, scene, camera);
  }

  private place(shadow: Mesh, ground: Vector3, spread: number): Mesh {
    this.placed.push({ shadow, ground, spread });
    // 다음 track에서 새 그림자까지 빛 방향에 맞춰 놓는다.
    this.aligned = false;
    return shadow;
  }
}

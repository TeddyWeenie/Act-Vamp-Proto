import {
  Color,
  DoubleSide,
  MeshBasicMaterial,
  type Camera,
  type Material,
  type Object3D,
  type Scene,
  type Texture,
  type Vector3,
  type WebGLRenderer,
} from 'three';

/** 그리는 순서. 투명한 것끼리는 이 순서대로 그려야 가려진 캐릭터가 건물 너머로 보인다. */
export const ORDER = {
  shadow: 1,
  sprite: 2,
  fadedDepth: 3,
  fadedColor: 4,
  /** 공기 중의 빛 입자. 모든 것 위에 덧그린다. */
  air: 5,
} as const;

/** 화면 느낌에 맞게 갈아입힌 건물의 겉모습. 건물은 불투명도만 알려 주면 된다. */
export interface BuildingSkin {
  /** 1이면 보통, 그보다 작으면 몸체와 외곽선이 함께 옅어지고 깊이를 쓰지 않는다. */
  setOpacity(opacity: number): void;
}

/** 물체가 땅에서 차지하는 자리(건물이면 처마를 뺀 벽)와 높이. 바닥 그림자를 만들 때 쓴다. */
export interface GroundArea {
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly depth: number;
  readonly height: number;
  /** 나무처럼 바닥이 둥근 물체인지. */
  readonly round?: boolean;
  /** 건물이 아니라 소품이 드리우는 그림자인지. 소품이 자기 그림자에 스스로 어두워지지 않게 가려 쓴다. */
  readonly fromProp?: boolean;
}

/**
 * 화면의 "그림 느낌"을 정하는 약속. 쓰는 쪽마다 필요한 부분만 받도록 넷으로 나눴다.
 * 새 화면 느낌은 이 인터페이스를 구현한 클래스를 만들어 GameFactory에 넘기면 되고,
 * 건물이나 캐릭터 코드는 고치지 않는다.
 */
export interface SpriteLook {
  spriteMaterial(map: Texture): MeshBasicMaterial;
  /** 나무나 울타리처럼 세워 놓는 소품 그림의 재질. */
  propMaterial(map: Texture): MeshBasicMaterial;
  /** 캐릭터 발밑 그림자. 발 위치를 원점으로 놓은 물체를 돌려준다. */
  footShadow(characterHeight: number): Object3D;
}

export interface BuildingLook {
  /** 캐릭터를 가리는 건물의 불투명도. */
  readonly fadedOpacity: number;
  /** 건물이 옅어지고 돌아오는 속도. */
  readonly fadeRate: number;
  /** 모델의 재질을 이 화면 느낌으로 갈아입힌다. */
  dress(model: Object3D): BuildingSkin;
  /** 옅어진 건물의 안쪽 면이 비치지 않도록 깊이만 먼저 쓰는 재질. */
  depthOnlyMaterial(): Material;
  /** 건물이 땅에 붙어 보이도록 바닥에 까는 그림자. 월드 좌표에 놓인 물체를 돌려준다. */
  groundShadow(area: GroundArea): Object3D;
}

export interface GroundLook {
  /** 바닥 그림 한 장이 덮는 월드 크기. */
  readonly groundTileSize: number;
  groundMaterial(map: Texture): Material;
}

export interface FrameLook {
  /** 배경색, 조명, 안개처럼 장면 전체에 걸리는 것을 넣는다. */
  attach(scene: Scene): void;
  setSize(width: number, height: number, pixelRatio: number): void;
  /** 카메라와 그것이 바라보는 지점을 알려 준다. 조명 방향과 안개 거리를 맞추는 데 쓴다. */
  track(camera: Camera, focus: Vector3): void;
  render(renderer: WebGLRenderer, scene: Scene, camera: Camera): void;
}

export interface SceneLook extends SpriteLook, BuildingLook, GroundLook, FrameLook {}

/** 어떤 화면 느낌이든 똑같이 쓰는 부분. 달라지는 부분만 하위 클래스가 채운다. */
export abstract class BaseLook implements SceneLook {
  readonly fadedOpacity = 0.3;
  readonly fadeRate = 9;
  /** 바닥 그림 한 장에 돌이 가로로 열여덟 개쯤 들어 있어서, 돌 하나가 캐릭터 키의 1/4쯤 되는 크기다. */
  readonly groundTileSize = 10;

  protected readonly background = new Color(0x241d2e);

  spriteMaterial(map: Texture): MeshBasicMaterial {
    return new MeshBasicMaterial({ map, transparent: true, alphaTest: 0.02, side: DoubleSide });
  }

  propMaterial(map: Texture): MeshBasicMaterial {
    return this.spriteMaterial(map);
  }

  depthOnlyMaterial(): Material {
    const material = new MeshBasicMaterial({ colorWrite: false });
    // 투명 대기열에서 캐릭터 다음에 그려지도록 한다.
    material.transparent = true;
    return material;
  }

  groundMaterial(map: Texture): Material {
    return new MeshBasicMaterial({ map });
  }

  attach(scene: Scene): void {
    scene.background = this.background;
  }

  setSize(_width: number, _height: number, _pixelRatio: number): void {}

  track(_camera: Camera, _focus: Vector3): void {}

  render(renderer: WebGLRenderer, scene: Scene, camera: Camera): void {
    renderer.render(scene, camera);
  }

  abstract footShadow(characterHeight: number): Object3D;
  abstract dress(model: Object3D): BuildingSkin;
  abstract groundShadow(area: GroundArea): Object3D;
}

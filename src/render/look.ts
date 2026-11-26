import {
  CanvasTexture,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  SRGBColorSpace,
  type Material,
  type Texture,
} from 'three';

/** 그리는 순서. 투명한 것끼리는 이 순서대로 그려야 가려진 캐릭터가 건물 너머로 보인다. */
export const ORDER = {
  shadow: 1,
  sprite: 2,
  fadedDepth: 3,
  fadedColor: 4,
} as const;

/**
 * 화면의 "그림 느낌"을 정하는 재질 공장.
 * 쓰는 쪽마다 필요한 부분만 받도록 셋으로 나눴다. 카툰 렌더링(단계 명암, 외곽선, 색 보정)은
 * 이 인터페이스를 구현한 새 클래스를 만들어 갈아 끼우면 되고, 건물이나 캐릭터 코드는 고치지 않는다.
 */
export interface SpriteLook {
  spriteMaterial(map: Texture): MeshBasicMaterial;
  /** 캐릭터 발밑의 둥근 그림자. */
  blobShadowMaterial(): Material;
}

export interface BuildingLook {
  /** 캐릭터를 가리는 건물의 불투명도. */
  readonly fadedOpacity: number;
  /** 건물이 옅어지고 돌아오는 속도. */
  readonly fadeRate: number;
  buildingMaterial(map: Texture | null): Material;
  /** 옅어진 건물의 안쪽 면이 비치지 않도록 깊이만 먼저 쓰는 재질. */
  depthOnlyMaterial(): Material;
  /** 건물 재질에 불투명도를 적용한다. 1이면 완전히 불투명한 보통 재질로 되돌린다. */
  applyFade(material: Material, opacity: number): void;
  /** 건물이 땅에 붙어 보이도록 바닥에 까는 그림자. */
  contactShadowMaterial(): Material;
}

export interface GroundLook {
  /** 바닥 그림 한 장이 덮는 월드 크기. */
  readonly groundTileSize: number;
  groundMaterial(map: Texture): Material;
}

export interface SceneLook extends SpriteLook, BuildingLook, GroundLook {
  readonly background: Color;
}

const SHADOW_COLOR = '12,8,20';

/** 지금 쓰는 화면: 조명 없이 텍스처 색을 그대로 보여 준다. */
export class FlatLook implements SceneLook {
  readonly background = new Color(0x241d2e);
  readonly fadedOpacity = 0.3;
  readonly fadeRate = 9;
  readonly groundTileSize = 7;

  private readonly groundTint = new Color(0xd9d2e0);
  // 그림자 그림은 처음 쓸 때 한 번만 만들어 모든 물체가 함께 쓴다.
  private blobTexture: Texture | null = null;
  private contactTexture: Texture | null = null;

  spriteMaterial(map: Texture): MeshBasicMaterial {
    return new MeshBasicMaterial({ map, transparent: true, alphaTest: 0.02, side: DoubleSide });
  }

  blobShadowMaterial(): Material {
    this.blobTexture ??= FlatLook.paint((ctx, size) => {
      const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, `rgba(${SHADOW_COLOR},0.9)`);
      gradient.addColorStop(0.55, `rgba(${SHADOW_COLOR},0.55)`);
      gradient.addColorStop(1, `rgba(${SHADOW_COLOR},0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    });
    return FlatLook.shadowMaterial(this.blobTexture, 0.6);
  }

  buildingMaterial(map: Texture | null): Material {
    return new MeshBasicMaterial({ map, color: map ? 0xffffff : 0xb9ad9a });
  }

  depthOnlyMaterial(): Material {
    const material = new MeshBasicMaterial({ colorWrite: false });
    // 투명 대기열에서 캐릭터 다음에 그려지도록 한다.
    material.transparent = true;
    return material;
  }

  applyFade(material: Material, opacity: number): void {
    const faded = opacity < 0.999;
    if (material.transparent !== faded) {
      material.transparent = faded;
      material.depthWrite = !faded;
      material.needsUpdate = true;
    }
    material.opacity = faded ? opacity : 1;
  }

  contactShadowMaterial(): Material {
    this.contactTexture ??= FlatLook.paint((ctx, size) => {
      const inset = size * 0.2;
      ctx.filter = `blur(${size * 0.07}px)`;
      ctx.fillStyle = `rgba(${SHADOW_COLOR},0.85)`;
      ctx.fillRect(inset, inset, size - inset * 2, size - inset * 2);
    });
    return FlatLook.shadowMaterial(this.contactTexture, 0.55);
  }

  groundMaterial(map: Texture): Material {
    return new MeshBasicMaterial({ map, color: this.groundTint });
  }

  private static shadowMaterial(map: Texture, opacity: number): Material {
    return new MeshBasicMaterial({ map, transparent: true, depthWrite: false, opacity });
  }

  private static paint(draw: (ctx: CanvasRenderingContext2D, size: number) => void, size = 128): Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    draw(canvas.getContext('2d')!, size);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }
}

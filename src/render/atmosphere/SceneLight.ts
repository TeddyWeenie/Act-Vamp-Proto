import { Color, Vector2, type MeshBasicMaterial, type Texture, type Vector4 } from 'three';
import type { Rgb, SceneLightSettings } from './settings';

/** 그림이 장면의 빛을 읽는 곳. 빨강 채널은 모든 그림자, 초록 채널은 건물 그림자만 담는다(1이 햇빛). */
export interface ShadeSource {
  readonly texture: Texture;
  readonly rect: Vector4;
}

const toColor = (rgb: Rgb): Color => new Color(rgb[0], rgb[1], rgb[2]);

const ALL_SHADOWS = new Vector2(1, 0);
const BUILDING_SHADOWS = new Vector2(0, 1);

const VERTEX_HEAD = /* glsl */ `
uniform sampler2D uShadeMap;
uniform vec4 uShadeRect;
uniform vec2 uShadeChannel;
varying float vLit;
varying float vRise;
`;

const VERTEX_BODY = /* glsl */ `
// 발 위치(물체의 원점)가 햇빛 속인지 그늘 속인지 한 번만 읽어 그림 전체에 똑같이 쓴다.
vec2 foot = ( modelMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xz;
vLit = dot( texture2D( uShadeMap, ( foot - uShadeRect.xy ) * uShadeRect.zw ).rg, uShadeChannel );
vRise = uv.y;
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform vec3 uSun;
uniform vec3 uShade;
uniform float uFootDim;
varying float vLit;
varying float vRise;
`;

const FRAGMENT_BODY = /* glsl */ `
diffuseColor.rgb *= mix( uShade, uSun, vLit ) * mix( uFootDim, 1.0, smoothstep( 0.04, 0.4, vRise ) );
`;

/**
 * 장면의 빛을 2D 그림에 입힌다. 햇빛 자리에서는 따뜻하게, 건물이나 나무 그늘에서는 어둡고 차갑게 물들이고,
 * 발 쪽을 살짝 어둡게 해서 땅에 붙어 보이게 한다. 그림을 다시 그리지 않고 재질에 몇 줄을 끼워 넣는 방식이다.
 */
export class SceneLight {
  private readonly sun: Color;
  private readonly shade: Color;

  constructor(
    private readonly settings: SceneLightSettings,
    private readonly source: ShadeSource,
  ) {
    this.sun = toColor(settings.sun);
    this.shade = toColor(settings.shade);
  }

  /** 걸어 다니는 캐릭터용: 발밑이 건물 그늘이든 나무 그늘이든 어두워진다. */
  lightWalker<M extends MeshBasicMaterial>(material: M): M {
    return this.apply(material, ALL_SHADOWS);
  }

  /** 제자리에 선 소품용: 건물 그늘에서만 어두워진다. 자기 그림자에 스스로 어두워지지 않게 하려는 것이다. */
  lightFixture<M extends MeshBasicMaterial>(material: M): M {
    return this.apply(material, BUILDING_SHADOWS);
  }

  private apply<M extends MeshBasicMaterial>(material: M, channel: Vector2): M {
    const uniforms = {
      uShadeMap: { value: this.source.texture },
      uShadeRect: { value: this.source.rect },
      uShadeChannel: { value: channel },
      uSun: { value: this.sun },
      uShade: { value: this.shade },
      uFootDim: { value: this.settings.footDim },
    };
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${VERTEX_HEAD}`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERTEX_BODY}`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${FRAGMENT_HEAD}`)
        .replace('#include <map_fragment>', `#include <map_fragment>\n${FRAGMENT_BODY}`);
    };
    // 같은 셰이더를 쓰는 재질끼리 프로그램을 나눠 쓰되, 손대지 않은 재질과는 섞이지 않게 한다.
    material.customProgramCacheKey = () => 'scene-light';
    return material;
  }
}

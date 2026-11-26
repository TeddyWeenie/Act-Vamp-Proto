import {
  Color, DataTexture, FrontSide, MeshBasicMaterial, MeshToonMaterial, NearestFilter, RGBAFormat,
  type Material, type Side, type Texture, type WebGLProgramParametersWithUniforms,
} from 'three';
import type { FlattenSettings, ShadeSettings } from './settings';

/** What a building material is built from: the parts of the GLB material worth keeping. */
export interface MaterialSource {
  readonly map: Texture | null;
  readonly color: Color;
  readonly side: Side;
  readonly alphaTest: number;
  readonly vertexColors: boolean;
}

export function readMaterialSource(material: Material): MaterialSource {
  const m = material as Material & { map?: Texture | null; color?: Color };
  return {
    map: m.map ?? null,
    color: m.color ? m.color.clone() : new Color(0xffffff),
    side: m.side ?? FrontSide,
    alphaTest: m.alphaTest ?? 0,
    vertexColors: m.vertexColors ?? false,
  };
}

/** A shader edit that can be added to any built-in material without knowing its class. */
export interface MaterialPatch {
  readonly key: string;
  applyTo(material: Material): void;
}

/** Lets several patches share one material: each keeps the previous compile hook alive. */
export function chainCompile(material: Material, key: string, edit: (shader: WebGLProgramParametersWithUniforms) => void): void {
  const previous = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    edit(shader);
  };
  material.customProgramCacheKey = () => previousKey + '|' + key;
  material.needsUpdate = true;
}

/**
 * Texture flattening as a shader patch: snaps brightness toward a few soft steps and nudges the
 * palette toward the sprite's. One instance is shared by every building material, so flipping
 * `active` switches all of them at once without recompiling anything.
 */
export class TextureFlattenPatch implements MaterialPatch {
  readonly key = 'nocturne-flatten';
  private readonly amount = { value: 1 };
  private readonly chunk: string;

  constructor(settings: FlattenSettings) {
    const v3 = (c: readonly number[]) => `vec3( ${c.map((n) => n.toFixed(4)).join(', ')} )`;
    const n = settings.levels.toFixed(1);
    this.chunk = /* glsl */ `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, vMapUv, uFlatten * ${settings.mipBias.toFixed(2)} );
  if ( uFlatten > 0.5 ) {
    vec3 c = sampledDiffuseColor.rgb;
    float l = max( dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ), 1e-4 );
    float lp = pow( l, 1.0 / 2.2 );
    float q = ( floor( lp * ${n} ) + smoothstep( 0.2, 0.8, fract( lp * ${n} ) ) ) / ${n};
    c = mix( c, c * pow( max( q, 0.03 ), 2.2 ) / l, ${settings.strength.toFixed(3)} );
    float g = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
    c = mix( vec3( g ), c, ${settings.saturation.toFixed(3)} );
    c *= mix( ${v3(settings.shadowTint)}, ${v3(settings.lightTint)}, smoothstep( 0.02, 0.4, g ) );
    sampledDiffuseColor.rgb = max( c, vec3( 0.0 ) );
  }
  diffuseColor *= sampledDiffuseColor;
#endif`;
  }

  get active(): boolean {
    return this.amount.value > 0.5;
  }

  set active(on: boolean) {
    this.amount.value = on ? 1 : 0;
  }

  applyTo(material: Material): void {
    chainCompile(material, this.key, (shader) => {
      shader.uniforms.uFlatten = this.amount;
      shader.fragmentShader = 'uniform float uFlatten;\n' + shader.fragmentShader.replace('#include <map_fragment>', this.chunk);
    });
  }
}

/**
 * Builds the body material of a building. Subclasses choose the material class; the base class
 * guarantees every result carries the same patches (template method).
 */
export abstract class BuildingMaterialFactory {
  constructor(private readonly patches: readonly MaterialPatch[] = []) {}

  create(source: MaterialSource): Material {
    const material = this.build(source);
    for (const patch of this.patches) patch.applyTo(material);
    return material;
  }

  protected abstract build(source: MaterialSource): Material;

  dispose(): void {}
}

/** Cel-shaded body: light falls into a few flat bands. */
export class ToonMaterialFactory extends BuildingMaterialFactory {
  private readonly gradient: DataTexture;

  constructor(settings: ShadeSettings, patches: readonly MaterialPatch[] = []) {
    super(patches);
    const data = new Uint8Array(settings.bands.length * 4);
    settings.bands.forEach((b, i) => data.set([b * 255, b * 255, b * 255, 255], i * 4));
    this.gradient = new DataTexture(data, settings.bands.length, 1, RGBAFormat);
    this.gradient.minFilter = this.gradient.magFilter = NearestFilter;
    this.gradient.generateMipmaps = false;
    this.gradient.needsUpdate = true;
  }

  protected build(source: MaterialSource): Material {
    return new MeshToonMaterial({ ...source, gradientMap: this.gradient });
  }

  override dispose(): void {
    this.gradient.dispose();
  }
}

/** Unlit body: the texture colour as generated. Also what sam_3_3d models need (their metalness is 1). */
export class UnlitMaterialFactory extends BuildingMaterialFactory {
  protected build(source: MaterialSource): Material {
    return new MeshBasicMaterial({ ...source });
  }
}

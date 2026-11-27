import {
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';
import type { LensSettings } from './settings';

/** 빛 번짐은 화면의 1/4 크기에서 계산한다. 넓게 번지면서 값이 싸다. */
const BLOOM_SCALE = 0.25;

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }`;

/** 밝은 곳만 남긴다. 문턱 근처에서 부드럽게 시작해 경계가 끊어져 보이지 않게 한다. */
const BRIGHT_FRAGMENT = /* glsl */ `
uniform sampler2D tScene;
uniform float uThreshold;
varying vec2 vUv;
void main() {
  vec3 c = min( texture2D( tScene, vUv ).rgb, vec3( 4.0 ) );
  float level = max( c.r, max( c.g, c.b ) );
  gl_FragColor = vec4( c * smoothstep( uThreshold, uThreshold + 0.25, level ), 1.0 );
}`;

/** 한 방향으로 흐린다. 가로 한 번, 세로 한 번 돌리면 둥글게 번진다. */
const BLUR_FRAGMENT = /* glsl */ `
uniform sampler2D tSource;
uniform vec2 uStep;
varying vec2 vUv;
void main() {
  vec3 c = texture2D( tSource, vUv ).rgb * 0.227;
  c += ( texture2D( tSource, vUv + uStep * 1.385 ).rgb + texture2D( tSource, vUv - uStep * 1.385 ).rgb ) * 0.316;
  c += ( texture2D( tSource, vUv + uStep * 3.231 ).rgb + texture2D( tSource, vUv - uStep * 3.231 ).rgb ) * 0.0703;
  gl_FragColor = vec4( c, 1.0 );
}`;

/**
 * 마지막 한 겹: 먼 곳과 아주 가까운 곳을 흐리고, 빛 번짐과 옅은 안개를 더하고, 색을 보정한다.
 * 카메라가 주인공을 화면 가운데에 두므로, 화면 위쪽이 먼 곳이고 아래쪽이 가까운 곳이다.
 */
const FINAL_FRAGMENT = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform float uAspect;
uniform float uBloom;
uniform float uFarStart;
uniform float uFarBlur;
uniform float uNearStart;
uniform float uNearBlur;
uniform vec3 uHaze;
uniform float uHazeAmount;
uniform float uSaturation;
uniform vec3 uShadowTint;
uniform vec3 uLightTint;
uniform float uContrast;
uniform float uVignette;
varying vec2 vUv;

vec3 toDisplay( vec3 c ) {
  return mix( c * 12.92, 1.055 * pow( max( c, vec3( 0.0 ) ), vec3( 1.0 / 2.4 ) ) - 0.055, step( vec3( 0.0031308 ), c ) );
}

vec3 softened( float radius ) {
  vec2 r = vec2( radius / uAspect, radius );
  vec3 c = texture2D( tScene, vUv ).rgb * 2.0;
  c += texture2D( tScene, vUv + r * vec2( 1.0, 0.0 ) ).rgb;
  c += texture2D( tScene, vUv + r * vec2( -1.0, 0.0 ) ).rgb;
  c += texture2D( tScene, vUv + r * vec2( 0.0, 1.0 ) ).rgb;
  c += texture2D( tScene, vUv + r * vec2( 0.0, -1.0 ) ).rgb;
  c += texture2D( tScene, vUv + r * vec2( 0.7, 0.7 ) ).rgb;
  c += texture2D( tScene, vUv + r * vec2( -0.7, 0.7 ) ).rgb;
  c += texture2D( tScene, vUv + r * vec2( 0.7, -0.7 ) ).rgb;
  c += texture2D( tScene, vUv + r * vec2( -0.7, -0.7 ) ).rgb;
  c += texture2D( tScene, vUv + r * vec2( 0.5, 0.0 ) ).rgb;
  c += texture2D( tScene, vUv + r * vec2( -0.5, 0.0 ) ).rgb;
  c += texture2D( tScene, vUv + r * vec2( 0.0, 0.5 ) ).rgb;
  c += texture2D( tScene, vUv + r * vec2( 0.0, -0.5 ) ).rgb;
  return c / 14.0;
}

void main() {
  float far = smoothstep( uFarStart, 1.0, vUv.y );
  float near = smoothstep( uNearStart, 0.0, vUv.y );
  vec3 c = softened( max( far * uFarBlur, near * uNearBlur ) );
  c += texture2D( tBloom, vUv ).rgb * uBloom;
  c = mix( c, uHaze, far * uHazeAmount );

  // 여기부터는 눈에 보이는 색 공간에서 다룬다.
  c = toDisplay( clamp( c, 0.0, 1.0 ) );
  float level = dot( c, vec3( 0.299, 0.587, 0.114 ) );
  c = mix( vec3( level ), c, uSaturation );
  c *= mix( uShadowTint, uLightTint, smoothstep( 0.1, 0.8, level ) );
  c = mix( c, c * c * ( 3.0 - 2.0 * c ), uContrast );
  c *= 1.0 - uVignette * smoothstep( 0.4, 0.95, length( ( vUv - 0.5 ) * vec2( 1.0, 0.85 ) ) * 1.35 );
  gl_FragColor = vec4( clamp( c, 0.0, 1.0 ), 1.0 );
}`;

/**
 * 화면 전체에 씌우는 렌즈 효과. 장면을 따로 그려 둔 뒤 빛 번짐, 거리 흐림, 안개, 색 보정을 한 번에 입혀 화면에 옮긴다.
 * 캐릭터와 배경에 똑같이 걸리므로 둘을 한 장의 사진처럼 묶어 준다.
 */
export class LensPass {
  private readonly sceneTarget = new WebGLRenderTarget(1, 1, { samples: 4, type: HalfFloatType });
  private readonly bloomA = LensPass.bloomTarget();
  private readonly bloomB = LensPass.bloomTarget();
  private readonly bright: ShaderMaterial;
  private readonly blur: ShaderMaterial;
  private readonly final: ShaderMaterial;
  private readonly quad: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly quadScene = new Scene();
  private readonly quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly bloomStep = new Vector2();

  constructor(settings: LensSettings) {
    this.bright = LensPass.material(BRIGHT_FRAGMENT, {
      tScene: { value: this.sceneTarget.texture },
      uThreshold: { value: settings.bloomThreshold },
    });
    this.blur = LensPass.material(BLUR_FRAGMENT, {
      tSource: { value: null },
      uStep: { value: new Vector2() },
    });
    this.final = LensPass.material(FINAL_FRAGMENT, {
      tScene: { value: this.sceneTarget.texture },
      tBloom: { value: this.bloomA.texture },
      uAspect: { value: 1 },
      uBloom: { value: settings.bloomStrength },
      uFarStart: { value: settings.farStart },
      uFarBlur: { value: settings.farBlur },
      uNearStart: { value: settings.nearStart },
      uNearBlur: { value: settings.nearBlur },
      uHaze: { value: new Vector3(...settings.haze) },
      uHazeAmount: { value: settings.hazeAmount },
      uSaturation: { value: settings.saturation },
      uShadowTint: { value: new Vector3(...settings.shadowTint) },
      uLightTint: { value: new Vector3(...settings.lightTint) },
      uContrast: { value: settings.contrast },
      uVignette: { value: settings.vignette },
    });
    this.quad = new Mesh(new PlaneGeometry(2, 2), this.final);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    const w = Math.max(1, Math.round(width * pixelRatio));
    const h = Math.max(1, Math.round(height * pixelRatio));
    this.sceneTarget.setSize(w, h);
    const bw = Math.max(1, Math.round(w * BLOOM_SCALE));
    const bh = Math.max(1, Math.round(h * BLOOM_SCALE));
    this.bloomA.setSize(bw, bh);
    this.bloomB.setSize(bw, bh);
    this.bloomStep.set(1 / bw, 1 / bh);
    this.final.uniforms.uAspect!.value = w / h;
  }

  /** drawScene이 그린 장면에 효과를 입혀 지금의 그리기 대상(보통 화면)에 옮긴다. */
  render(renderer: WebGLRenderer, drawScene: () => void): void {
    const destination = renderer.getRenderTarget();
    renderer.setRenderTarget(this.sceneTarget);
    drawScene();

    this.draw(renderer, this.bright, this.bloomA);
    // 두 번 돌려 넓게 번지게 한다.
    for (const spread of [1, 2]) {
      this.blurInto(renderer, this.bloomA, this.bloomB, spread * this.bloomStep.x, 0);
      this.blurInto(renderer, this.bloomB, this.bloomA, 0, spread * this.bloomStep.y);
    }
    this.draw(renderer, this.final, destination);
  }

  dispose(): void {
    for (const target of [this.sceneTarget, this.bloomA, this.bloomB]) target.dispose();
    for (const material of [this.bright, this.blur, this.final]) material.dispose();
    this.quad.geometry.dispose();
  }

  private blurInto(
    renderer: WebGLRenderer,
    from: WebGLRenderTarget,
    to: WebGLRenderTarget,
    stepX: number,
    stepY: number,
  ): void {
    this.blur.uniforms.tSource!.value = from.texture;
    (this.blur.uniforms.uStep!.value as Vector2).set(stepX, stepY);
    this.draw(renderer, this.blur, to);
  }

  private draw(renderer: WebGLRenderer, material: ShaderMaterial, target: WebGLRenderTarget | null): void {
    this.quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(this.quadScene, this.quadCamera);
  }

  private static bloomTarget(): WebGLRenderTarget {
    return new WebGLRenderTarget(1, 1, {
      type: HalfFloatType,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: false,
    });
  }

  private static material(fragmentShader: string, uniforms: ShaderMaterial['uniforms']): ShaderMaterial {
    return new ShaderMaterial({
      uniforms,
      vertexShader: VERTEX,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
  }
}

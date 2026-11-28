import {
  HalfFloatType, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, WebGLRenderTarget,
  type Camera, type WebGLRenderer,
} from 'three';
import type { GradeSettings } from './settings';

const v3 = (c: readonly number[]) => `vec3( ${c.map((n) => n.toFixed(4)).join(', ')} )`;

/** The grade as plain GLSL, in case the game prefers to run it inside its own composer. */
export function colorGradeFragment(s: GradeSettings): string {
  return /* glsl */ `
uniform sampler2D tDiffuse;
varying vec2 vUv;
vec3 toDisplay( vec3 c ) {
  return mix( c * 12.92, 1.055 * pow( max( c, vec3( 0.0 ) ), vec3( 1.0 / 2.4 ) ) - 0.055, step( vec3( 0.0031308 ), c ) );
}
void main() {
  // The scene arrives linear. Grade in display space, where the numbers were tuned.
  vec3 c = toDisplay( clamp( texture2D( tDiffuse, vUv ).rgb, 0.0, 1.0 ) );
  float l = dot( c, vec3( 0.299, 0.587, 0.114 ) );
  c = mix( vec3( l ), c, ${s.saturation.toFixed(3)} );
  c *= mix( ${v3(s.shadowTint)}, ${v3(s.lightTint)}, smoothstep( 0.05, 0.75, l ) );
  c += ${v3(s.lift)} * ( 1.0 - l );
  c = mix( c, c * c * ( 3.0 - 2.0 * c ), ${s.contrast.toFixed(3)} );
  c *= 1.0 - ${s.vignette.toFixed(3)} * smoothstep( 0.35, 0.9, length( vUv - 0.5 ) );
  gl_FragColor = vec4( c, 1.0 );
}`;
}

export const COLOR_GRADE_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }`;

/**
 * Whole-frame colour grade with no dependency beyond three: draws the scene into an
 * anti-aliased buffer, then onto the screen through one full-screen shader. Because it covers
 * sprite and background alike, it is the step that makes them read as one picture.
 */
export class ColorGradePass {
  private readonly target = new WebGLRenderTarget(1, 1, { samples: 4, type: HalfFloatType });
  private readonly material: ShaderMaterial;
  private readonly quadScene = new Scene();
  private readonly quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  constructor(settings: GradeSettings) {
    this.material = new ShaderMaterial({
      uniforms: { tDiffuse: { value: this.target.texture } },
      vertexShader: COLOR_GRADE_VERTEX,
      fragmentShader: colorGradeFragment(settings),
      depthTest: false,
      depthWrite: false,
    });
    const quad = new Mesh(new PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    this.quadScene.add(quad);
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.target.setSize(Math.max(1, Math.round(width * pixelRatio)), Math.max(1, Math.round(height * pixelRatio)));
  }

  render(renderer: WebGLRenderer, scene: Scene, camera: Camera): void {
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(this.target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(previous);
    renderer.render(this.quadScene, this.quadCamera);
  }

  dispose(): void {
    this.target.dispose();
    this.material.dispose();
    (this.quadScene.children[0] as Mesh).geometry.dispose();
  }
}

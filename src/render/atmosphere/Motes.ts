import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Points,
  ShaderMaterial,
  Vector3,
  type Object3D,
} from 'three';
import { ORDER } from '../look';
import type { MoteSettings } from './settings';

const VERTEX = /* glsl */ `
attribute vec3 seed;
uniform float uTime;
uniform vec3 uCenter;
uniform vec3 uBox;
uniform float uPixelsPerUnit;
uniform float uSize;
varying float vGlow;
void main() {
  // 바람에 천천히 떠밀리며 조금씩 흔들린다. 상자 밖으로 나가면 반대편에서 다시 들어온다.
  vec3 drifted = seed * uBox + vec3( 0.22, 0.05, 0.1 ) * uTime * ( 0.5 + seed.z );
  drifted.x += sin( uTime * 0.6 + seed.y * 40.0 ) * 0.25;
  drifted.y += sin( uTime * 0.9 + seed.x * 40.0 ) * 0.15;
  vec3 world = uCenter + mod( drifted - uCenter + uBox * 0.5, uBox ) - uBox * 0.5;
  world.y = 0.3 + mod( drifted.y, uBox.y );
  vGlow = 0.55 + 0.45 * sin( uTime * ( 1.0 + seed.z * 2.0 ) + seed.x * 50.0 );
  gl_Position = projectionMatrix * viewMatrix * vec4( world, 1.0 );
  gl_PointSize = uSize * ( 0.6 + seed.y * 0.8 ) * uPixelsPerUnit;
}`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
varying float vGlow;
void main() {
  float falloff = smoothstep( 1.0, 0.0, length( gl_PointCoord - 0.5 ) * 2.0 );
  gl_FragColor = vec4( uColor * falloff * falloff * vGlow * uStrength, 1.0 );
}`;

/**
 * 공기 중에 떠다니는 빛 입자. 캐릭터 앞뒤로 함께 떠서 캐릭터와 배경이 같은 공간에 있다는 느낌을 준다.
 * 움직임은 모두 셰이더가 계산하므로 매 프레임 시간과 보는 곳만 알려 주면 된다.
 */
export class Motes {
  private readonly material: ShaderMaterial;
  private readonly points: Points;

  constructor(settings: MoteSettings) {
    const seeds = new Float32Array(settings.count * 3);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    const geometry = new BufferGeometry();
    geometry.setAttribute('seed', new Float32BufferAttribute(seeds, 3));
    // 위치는 셰이더가 정하므로 자리만 채워 둔다.
    geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(seeds.length), 3));

    this.material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCenter: { value: new Vector3() },
        uBox: { value: new Vector3(...settings.box) },
        uPixelsPerUnit: { value: 1 },
        uSize: { value: settings.size },
        uColor: { value: new Color(...settings.color) },
        uStrength: { value: settings.strength },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    this.points = new Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = ORDER.air;
  }

  get object(): Object3D {
    return this.points;
  }

  /** center: 카메라가 보는 지면 위의 점. pixelsPerUnit: 월드 1이 화면에서 차지하는 픽셀 수. */
  update(seconds: number, center: Vector3, pixelsPerUnit: number): void {
    const uniforms = this.material.uniforms;
    uniforms.uTime!.value = seconds;
    (uniforms.uCenter!.value as Vector3).set(center.x, 0, center.z);
    uniforms.uPixelsPerUnit!.value = pixelsPerUnit;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}

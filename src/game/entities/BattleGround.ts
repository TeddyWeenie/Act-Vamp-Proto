import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { ORDER } from '../../render/look';
import { approach } from '../logic/occlusion';
import type { Vec2 } from '../logic/view';
import { Entity } from './Entity';

const FADE_RATE = 5;
const FULL_OPACITY = 0.5;

/**
 * 전투가 벌어지는 자리의 바닥에 깔리는 어두운 타원.
 * 걷던 자리 그대로지만 "여기가 싸움터"라는 느낌을 주려고, 대형이 서는 곳만 살짝 가라앉힌다.
 */
export class BattleGround extends Entity {
  private readonly material: MeshBasicMaterial;
  private target = 0;

  constructor() {
    const material = new MeshBasicMaterial({
      map: BattleGround.paint(),
      transparent: true,
      depthWrite: false,
      opacity: 0,
    });
    const mesh = new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), material);
    // 건물과 캐릭터의 그림자보다 아래에 깔리도록 땅에 더 가깝게 둔다.
    mesh.position.y = 0.008;
    mesh.renderOrder = ORDER.shadow;
    mesh.visible = false;
    super(mesh);
    this.material = material;
  }

  /** centre를 가운데로 가로 width, 세로 depth 크기의 싸움터를 드러낸다. */
  appear(centre: Readonly<Vec2>, width: number, depth: number): void {
    this.root.position.x = centre.x;
    this.root.position.z = centre.z;
    this.root.scale.set(width, 1, depth);
    this.target = FULL_OPACITY;
    this.root.visible = true;
  }

  vanish(): void {
    this.target = 0;
  }

  override update(dt: number): void {
    if (this.material.opacity === this.target) return;
    this.material.opacity = approach(this.material.opacity, this.target, dt, FADE_RATE);
    if (this.material.opacity === 0) this.root.visible = false;
  }

  /** 가운데가 어둡고 가장자리로 갈수록 옅어지며, 테두리에 금빛 선이 한 줄 도는 원. */
  private static paint(): CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const half = size / 2;
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, 'rgba(24,12,34,0.95)');
    gradient.addColorStop(0.78, 'rgba(24,12,34,0.8)');
    gradient.addColorStop(1, 'rgba(24,12,34,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(201,166,107,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(half, half, half * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    return new CanvasTexture(canvas);
  }
}

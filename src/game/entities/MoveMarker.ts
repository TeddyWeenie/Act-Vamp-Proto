import { Mesh, MeshBasicMaterial, RingGeometry } from 'three';
import { ORDER } from '../../render/look';
import type { DestinationProvider } from '../capabilities';
import { Entity } from './Entity';

const VISIBLE_OPACITY = 0.85;
const FADE_PER_SECOND = 4;

/** 클릭 이동의 목적지를 바닥에 고리로 보여 준다. 도착하거나 취소되면 서서히 사라진다. */
export class MoveMarker extends Entity {
  private readonly material: MeshBasicMaterial;

  constructor(private readonly provider: DestinationProvider) {
    const geometry = new RingGeometry(0.2, 0.28, 32);
    geometry.rotateX(-Math.PI / 2);
    const material = new MeshBasicMaterial({
      color: 0xe9cf9a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const mesh = new Mesh(geometry, material);
    mesh.position.y = 0.03;
    mesh.renderOrder = ORDER.shadow;
    super(mesh);
    this.material = material;
  }

  override update(dt: number): void {
    const destination = this.provider.destination;
    if (destination) {
      this.root.position.x = destination.x;
      this.root.position.z = destination.z;
      this.material.opacity = VISIBLE_OPACITY;
    } else if (this.material.opacity > 0) {
      this.material.opacity = Math.max(0, this.material.opacity - dt * FADE_PER_SECOND);
    }
    this.root.visible = this.material.opacity > 0;
  }
}

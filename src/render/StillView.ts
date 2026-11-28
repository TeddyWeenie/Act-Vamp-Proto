import { Mesh, PlaneGeometry, type MeshBasicMaterial, type Object3D, type Texture } from 'three';
import type { StillImage } from '../game/capabilities';
import type { ViewAngle } from '../game/logic/view';
import { ORDER, type SpriteLook } from './look';

/**
 * 3D 장면 안에 세운 움직이지 않는 그림(나무, 울타리 같은 소품).
 * 캐릭터 그림과 같은 방식으로 세운다: 지면에 수직이고, 위에서 내려다볼 때 눌리는 만큼 가로를 줄여 그림 비율을 지킨다.
 */
export class StillView implements StillImage {
  readonly root: Object3D;
  readonly width: number;
  private readonly material: MeshBasicMaterial;

  constructor(
    texture: Texture,
    readonly height: number,
    look: SpriteLook,
    angle: ViewAngle,
  ) {
    const image = texture.image as { width: number; height: number };
    this.width = height * (image.width / image.height) * Math.cos(angle.elevation);
    // 그림의 아랫변이 땅에 닿도록 평면을 올려 둔다.
    const geometry = new PlaneGeometry(1, 1);
    geometry.translate(0, 0.5, 0);
    this.material = look.propMaterial(texture);
    const mesh = new Mesh(geometry, this.material);
    mesh.scale.set(this.width, height, 1);
    mesh.rotation.y = angle.azimuth;
    mesh.renderOrder = ORDER.sprite;
    this.root = mesh;
  }

  setOpacity(opacity: number): void {
    this.material.opacity = opacity;
  }
}

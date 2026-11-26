import { Group, Mesh, PlaneGeometry, type MeshBasicMaterial, type Texture } from 'three';
import { CELL, FIGURE_HEIGHT, FOOT_MARGIN, type SpriteSheet } from '../data/sprites';
import type { SpriteAnimator } from '../game/capabilities';
import { frameAt, isFinished } from '../game/logic/animation';
import type { ViewAngle } from '../game/logic/view';
import { ORDER, type SpriteLook } from './look';

/**
 * 3D 장면 안에 세운 2D 동작 그림.
 * 평면을 지면에 수직으로 세우고 카메라 쪽으로만 돌려 둔다. 수직으로 서 있어야 벽 앞뒤에서 깊이가 맞는다.
 * 위에서 내려다보면 세로가 눌려 보이므로, 가로를 같은 비율로 줄여 원래 그림 비율을 유지한다.
 */
export class SpriteView<Name extends string> implements SpriteAnimator<Name> {
  readonly root = new Group();
  private readonly mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly cellHeight: number;
  private readonly cellWidth: number;
  private current: Name;
  private time = 0;
  private left = false;
  private shownFrame = -1;

  constructor(
    private readonly sheet: SpriteSheet<Name>,
    private readonly textures: Readonly<Record<Name, Texture>>,
    first: Name,
    look: SpriteLook,
    angle: ViewAngle,
  ) {
    this.current = first;
    this.cellHeight = (sheet.height * CELL) / FIGURE_HEIGHT;
    this.cellWidth = this.cellHeight * Math.cos(angle.elevation);

    // 발 기준선이 원점에 오도록 평면을 올려 둔다. 크기를 바꿔도 발 위치는 그대로다.
    const geometry = new PlaneGeometry(1, 1);
    geometry.translate(0, 0.5 - FOOT_MARGIN / CELL, 0);
    this.mesh = new Mesh(geometry, look.spriteMaterial(textures[first]));
    this.mesh.rotation.y = angle.azimuth;
    this.mesh.renderOrder = ORDER.sprite;
    this.root.add(this.mesh);

    this.root.add(look.footShadow(sheet.height));

    this.apply();
  }

  get clip(): Name {
    return this.current;
  }

  get finished(): boolean {
    return isFinished(this.sheet.clips[this.current], this.time);
  }

  play(name: Name, restart = false): void {
    if (name === this.current && !restart) return;
    this.current = name;
    this.time = 0;
    this.mesh.material.map = this.textures[name];
    this.shownFrame = -1;
    this.apply();
  }

  faceLeft(left: boolean): void {
    if (left === this.left) return;
    this.left = left;
    this.shownFrame = -1;
    this.apply();
  }

  setPosition(x: number, z: number): void {
    this.root.position.set(x, 0, z);
  }

  update(dt: number): void {
    this.time += dt;
    this.apply();
  }

  private apply(): void {
    const clip = this.sheet.clips[this.current];
    const frame = frameAt(clip, this.time);
    // 프레임이 바뀔 때만 텍스처 좌표를 다시 쓴다.
    if (frame === this.shownFrame) return;
    this.shownFrame = frame;
    const texture = this.textures[this.current];
    // 그림이 원래 보는 쪽과 지금 봐야 하는 쪽이 다를 때만 뒤집는다. 반전은 텍스처 좌표를 거꾸로 읽어서 처리한다.
    const mirrored = clip.faces !== 'center' && this.left !== (clip.faces === 'left');
    texture.repeat.set((mirrored ? -1 : 1) / clip.frames, 1);
    texture.offset.set((frame + (mirrored ? 1 : 0)) / clip.frames, 0);
    const height = this.cellHeight * clip.scale;
    this.mesh.scale.set(this.cellWidth * clip.scale * (clip.cellAspect ?? 1), height, 1);
    // 평면은 기본 발 여백에 맞춰 올려 두었으므로, 여백이 다른 그림은 그 차이만큼 내려 발을 같은 자리에 둔다.
    this.mesh.position.y = ((FOOT_MARGIN - (clip.footMargin ?? FOOT_MARGIN)) / CELL) * height;
  }
}

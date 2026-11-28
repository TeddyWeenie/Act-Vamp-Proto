import { Group, Mesh, PlaneGeometry, type MeshBasicMaterial, type Texture } from 'three';
import type { SpriteAnimator } from '../game/capabilities';
import type { ViewAngle } from '../game/logic/view';
import type { Pose } from '../game/states/characterStates';
import { PLACEHOLDER_FOOT_RATIO } from './PlaceholderArt';
import { ORDER, type SpriteLook } from './look';

/** 공격 동작 한 번의 길이(초). */
const ATTACK_SECONDS = 0.42;

/**
 * 그림 한 장으로 서기, 걷기, 공격을 흉내 내는 임시 동작 그림.
 * 진짜 동작 그림(SpriteView)과 같은 약속을 지키므로, 그림이 준비되면 이것만 바꿔 끼우면 된다.
 * 서 있을 때는 숨 쉬듯 살짝 늘어나고, 걸을 때는 통통 튀고, 공격할 때는 보는 쪽으로 한 번 뛰어든다.
 */
export class PlaceholderSprite implements SpriteAnimator<Pose> {
  readonly root = new Group();
  private readonly mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly width: number;
  private current: Pose = 'idle';
  private time = 0;
  private left = false;

  /** right와 left는 같은 인물이 오른쪽과 왼쪽을 보는 그림이다. */
  constructor(
    private readonly right: Texture,
    private readonly leftward: Texture,
    private readonly height: number,
    look: SpriteLook,
    angle: ViewAngle,
  ) {
    const image = right.image as { width: number; height: number };
    // 진짜 그림과 같은 방식으로 세운다: 위에서 내려다볼 때 눌리는 만큼 가로를 줄인다.
    this.width = height * (image.width / image.height) * Math.cos(angle.elevation);
    const geometry = new PlaneGeometry(1, 1);
    geometry.translate(0, 0.5 - PLACEHOLDER_FOOT_RATIO, 0);
    this.mesh = new Mesh(geometry, look.spriteMaterial(right));
    this.mesh.rotation.y = angle.azimuth;
    this.mesh.renderOrder = ORDER.sprite;
    this.root.add(this.mesh);
    this.root.add(look.footShadow(height));
    this.apply();
  }

  get clip(): Pose {
    return this.current;
  }

  get finished(): boolean {
    return this.current === 'attack' && this.time >= ATTACK_SECONDS;
  }

  play(pose: Pose, restart = false): void {
    if (pose === this.current && !restart) return;
    this.current = pose;
    this.time = 0;
    this.apply();
  }

  faceLeft(left: boolean): void {
    if (left === this.left) return;
    this.left = left;
    this.mesh.material.map = left ? this.leftward : this.right;
  }

  setPosition(x: number, z: number, height: number): void {
    this.root.position.set(x, height, z);
  }

  update(dt: number): void {
    this.time += dt;
    this.apply();
  }

  private apply(): void {
    const side = this.left ? -1 : 1;
    let stretch = 1;
    let lift = 0;
    let lunge = 0;
    if (this.current === 'idle') {
      stretch = 1 + Math.sin(this.time * 2.6) * 0.015;
    } else if (this.current === 'walk') {
      lift = Math.abs(Math.sin(this.time * 9)) * 0.07 * this.height;
    } else {
      const swing = Math.sin(Math.min(1, this.time / ATTACK_SECONDS) * Math.PI);
      lift = swing * 0.12 * this.height;
      lunge = swing * 0.3 * this.height * side;
    }
    this.mesh.scale.set(this.width, this.height * stretch, 1);
    this.mesh.position.set(lunge, lift, 0);
  }
}

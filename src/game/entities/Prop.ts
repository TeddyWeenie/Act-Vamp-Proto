import { Group } from 'three';
import type { PropPlacement } from '../../data/town';
import type { BuildingLook } from '../../render/look';
import type { Obstacle, Occluder, OcclusionTarget, StillImage } from '../capabilities';
import type { Footprint } from '../logic/movement';
import { approach, billboardCover, isOccluded, type Box3D } from '../logic/occlusion';
import type { Vec3 } from '../logic/view';
import { Entity } from './Entity';

/** 캐릭터를 가린 소품의 불투명도. 건물보다 덜 옅어져서 잎 사이로 비쳐 보이는 느낌을 낸다. */
const FADED_OPACITY = 0.45;

/**
 * 광장에 세워 놓는 소품(나무, 울타리, 통). 그림 한 장을 세운 것이고, 길을 막고 땅에 그림자를 드리운다.
 * 캐릭터의 발치는 그대로 가리지만, 몸통이나 머리까지 가리게 되면 스스로 옅어진다.
 */
export class Prop extends Entity implements Obstacle, Occluder {
  readonly footprint: Footprint;

  private readonly cover: Box3D | null;
  private occluding = false;
  private currentOpacity = 1;

  constructor(
    private readonly image: StillImage,
    placement: PropPlacement,
    private readonly look: Pick<BuildingLook, 'groundShadow' | 'fadeRate'>,
  ) {
    super(new Group());
    const { x, z, block, shadow } = placement;
    image.root.position.set(x, 0, z);
    this.root.add(image.root);
    this.root.add(look.groundShadow({ x, z, ...shadow, fromProp: true }));

    this.footprint = {
      minX: x - block.width / 2,
      maxX: x + block.width / 2,
      minZ: z - block.depth / 2,
      maxZ: z + block.depth / 2,
    };
    this.cover = placement.cover
      ? billboardCover({ x, z }, image.width, image.height, placement.cover)
      : null;
  }

  get opacity(): number {
    return this.currentOpacity;
  }

  /** 발목은 가려도 괜찮으므로 몸통과 머리 높이만 살핀다. */
  occludes(target: OcclusionTarget, towardCamera: Vec3): boolean {
    if (!this.cover) return false;
    return isOccluded(target.position, target.occlusionHeights.slice(1), towardCamera, this.cover);
  }

  setOccluding(occluding: boolean): void {
    this.occluding = occluding;
  }

  override update(dt: number): void {
    const target = this.occluding ? FADED_OPACITY : 1;
    if (this.currentOpacity === target) return;
    this.currentOpacity = approach(this.currentOpacity, target, dt, this.look.fadeRate);
    this.image.setOpacity(this.currentOpacity);
  }
}

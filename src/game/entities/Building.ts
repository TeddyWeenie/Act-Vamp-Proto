import { Box3, Group, Mesh, Raycaster, Vector3, type Intersection, type Object3D } from 'three';
import type { BuildingPlacement } from '../../data/town';
import { ORDER, type BuildingLook, type BuildingSkin } from '../../render/look';
import type { Obstacle, Occluder, OcclusionTarget } from '../capabilities';
import type { Footprint } from '../logic/movement';
import { approach, isOccluded, type Box3D } from '../logic/occlusion';
import type { Vec3 } from '../logic/view';
import { Entity } from './Entity';

/** 지붕 처마는 걸어 지나갈 수 있으므로, 충돌에 쓰는 바닥 면적은 겉 상자보다 조금 줄인다. */
const FOOTPRINT_SHRINK = 0.12;

/**
 * 마을의 건물. 길을 막고, 캐릭터를 가리면 스스로 옅어진다.
 * 옅어질 때는 깊이만 먼저 그린 뒤 색을 덧그려 건물 안쪽 면이 비치지 않게 한다.
 */
export class Building extends Entity implements Obstacle, Occluder {
  readonly footprint: Footprint;

  private readonly box: Box3D;
  private readonly skin: BuildingSkin;
  private readonly bodyMeshes: Mesh[] = [];
  private readonly drawnMeshes: Mesh[] = [];
  private readonly depthMeshes: Mesh[] = [];
  private readonly raycaster = new Raycaster();
  // 매번 새로 만들지 않고 다시 쓰는 계산용 객체.
  private readonly rayOrigin = new Vector3();
  private readonly rayDirection = new Vector3();
  private readonly hits: Intersection[] = [];
  private occluding = false;
  private currentOpacity = 1;
  private faded = false;

  constructor(
    model: Object3D,
    placement: BuildingPlacement,
    private readonly look: BuildingLook,
  ) {
    super(new Group());

    // 겉모습을 입히기 전의 메시가 건물의 몸체다. 입힌 뒤에는 외곽선 같은 덧메시가 더 생길 수 있다.
    model.traverse((node) => {
      if (node instanceof Mesh) this.bodyMeshes.push(node);
    });
    this.skin = look.dress(model);
    model.traverse((node) => {
      if (node instanceof Mesh) this.drawnMeshes.push(node);
    });
    const depthMaterial = look.depthOnlyMaterial();
    for (const mesh of this.bodyMeshes) {
      const depth = new Mesh(mesh.geometry, depthMaterial);
      depth.renderOrder = ORDER.fadedDepth;
      depth.visible = false;
      depth.raycast = () => {};
      mesh.add(depth);
      this.depthMeshes.push(depth);
    }

    // 높이를 맞추고, 바닥 중심이 배치 위치에 오도록 옮긴다.
    const size = new Box3().setFromObject(model).getSize(new Vector3());
    model.scale.setScalar(placement.height / size.y);
    model.rotation.y = (placement.quarterTurns * Math.PI) / 2;
    model.updateMatrixWorld(true);
    const fitted = new Box3().setFromObject(model);
    const center = fitted.getCenter(new Vector3());
    model.position.set(placement.x - center.x, -fitted.min.y, placement.z - center.z);
    this.root.add(model);
    this.root.updateMatrixWorld(true);

    const world = new Box3().setFromObject(model);
    const width = world.max.x - world.min.x;
    const depth = world.max.z - world.min.z;
    this.box = {
      min: { x: world.min.x, y: world.min.y, z: world.min.z },
      max: { x: world.max.x, y: world.max.y, z: world.max.z },
    };
    this.footprint = {
      minX: world.min.x + width * FOOTPRINT_SHRINK,
      maxX: world.max.x - width * FOOTPRINT_SHRINK,
      minZ: world.min.z + depth * FOOTPRINT_SHRINK,
      maxZ: world.max.z - depth * FOOTPRINT_SHRINK,
    };

    this.root.add(
      look.groundShadow({ x: placement.x, z: placement.z, width, depth, height: world.max.y - world.min.y }),
    );
  }

  get opacity(): number {
    return this.currentOpacity;
  }

  /** 먼저 상자로 걸러 내고, 걸리면 실제 메시에 선을 쏴서 박공지붕 옆 빈 곳을 가려 낸다. */
  occludes(target: OcclusionTarget, towardCamera: Vec3): boolean {
    const { position, occlusionHeights } = target;
    if (!isOccluded(position, occlusionHeights, towardCamera, this.box)) return false;
    this.rayDirection.set(towardCamera.x, towardCamera.y, towardCamera.z);
    for (const y of occlusionHeights) {
      this.raycaster.set(this.rayOrigin.set(position.x, y, position.z), this.rayDirection);
      this.hits.length = 0;
      if (this.raycaster.intersectObjects(this.bodyMeshes, false, this.hits).length > 0) return true;
    }
    return false;
  }

  setOccluding(occluding: boolean): void {
    this.occluding = occluding;
  }

  override update(dt: number): void {
    const target = this.occluding ? this.look.fadedOpacity : 1;
    if (this.currentOpacity === target) return;
    this.currentOpacity = approach(this.currentOpacity, target, dt, this.look.fadeRate);
    this.skin.setOpacity(this.currentOpacity);
    const faded = this.currentOpacity < 1;
    if (faded === this.faded) return;
    this.faded = faded;
    for (const mesh of this.drawnMeshes) mesh.renderOrder = faded ? ORDER.fadedColor : 0;
    for (const mesh of this.depthMeshes) mesh.visible = faded;
  }
}

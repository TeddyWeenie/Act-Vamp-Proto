import {
  Box3,
  Group,
  Mesh,
  PlaneGeometry,
  Raycaster,
  Vector3,
  type Intersection,
  type Material,
  type Object3D,
  type Texture,
} from 'three';
import type { BuildingPlacement } from '../../data/town';
import { ORDER, type BuildingLook } from '../../render/look';
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
  private readonly colorMeshes: Mesh[] = [];
  private readonly depthMeshes: Mesh[] = [];
  private readonly materials: Material[] = [];
  private readonly raycaster = new Raycaster();
  // 매번 새로 만들지 않고 다시 쓰는 계산용 객체.
  private readonly rayOrigin = new Vector3();
  private readonly rayDirection = new Vector3();
  private readonly hits: Intersection[] = [];
  private occluding = false;
  private currentOpacity = 1;

  constructor(
    model: Object3D,
    placement: BuildingPlacement,
    private readonly look: BuildingLook,
  ) {
    super(new Group());

    const depthMaterial = look.depthOnlyMaterial();
    model.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      const original = node.material as { map?: Texture | null };
      const material = look.buildingMaterial(original.map ?? null);
      node.material = material;
      this.materials.push(material);
      this.colorMeshes.push(node);
    });
    for (const mesh of this.colorMeshes) {
      const depth = new Mesh(mesh.geometry, depthMaterial);
      depth.renderOrder = ORDER.fadedDepth;
      depth.visible = false;
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

    const contactGeometry = new PlaneGeometry(1, 1);
    contactGeometry.rotateX(-Math.PI / 2);
    const contact = new Mesh(contactGeometry, look.contactShadowMaterial());
    contact.scale.set(width * 1.45, 1, depth * 1.45);
    contact.position.set(placement.x, 0.015, placement.z);
    contact.renderOrder = ORDER.shadow;
    this.root.add(contact);
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
      if (this.raycaster.intersectObjects(this.colorMeshes, false, this.hits).length > 0) return true;
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
    const faded = this.currentOpacity < 0.999;
    for (const material of this.materials) this.look.applyFade(material, this.currentOpacity);
    for (const mesh of this.colorMeshes) mesh.renderOrder = faded ? ORDER.fadedColor : 0;
    for (const mesh of this.depthMeshes) mesh.visible = faded;
  }
}

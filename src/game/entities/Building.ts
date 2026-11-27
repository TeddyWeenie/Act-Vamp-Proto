import { Box3, Group, Mesh, Raycaster, Vector3, type Intersection, type Object3D } from 'three';
import type { BuildingPlacement } from '../../data/town';
import { ORDER, type BuildingLook, type BuildingSkin } from '../../render/look';
import type { Obstacle, Occluder, OcclusionTarget, Raised } from '../capabilities';
import type { Footprint } from '../logic/movement';
import { approach, bodyProbes, rayHitsBox, type Box3D } from '../logic/occlusion';
import type { Vec2, Vec3 } from '../logic/view';
import { Entity } from './Entity';

/** 벽을 찾지 못했을 때만 쓰는 어림값: 겉 상자를 이 비율만큼 줄여 처마 밑을 지나가게 한다. */
const FOOTPRINT_SHRINK = 0.12;
/** 벽을 찾는 선의 높이(건물 높이에 견준 값). 계단과 기단보다 높고 처마보다 낮다. */
const WALL_PROBE_HEIGHT = 0.3;
/** 벽 한 면을 따라 선을 쏘는 자리. 가운데는 문간처럼 들어간 곳일 수 있어 여러 곳에서 가장 바깥을 고른다. */
const WALL_PROBE_SPOTS = [0.25, 0.5, 0.75];
/** 이보다 낮은 윗면은 계단처럼 밟고 올라선다. 더 높은 것은 벽이다. */
const STEP_REACH = 1.0;

const DOWN = new Vector3(0, -1, 0);

/**
 * 마을의 건물. 벽은 길을 막고, 문 앞 계단은 밟고 올라설 수 있으며, 캐릭터를 가리면 스스로 옅어진다.
 * 옅어질 때는 깊이만 먼저 그린 뒤 색을 덧그려 건물 안쪽 면이 비치지 않게 한다.
 */
export class Building extends Entity implements Obstacle, Occluder, Raised {
  readonly footprint: Footprint;

  private readonly box: Box3D;
  private readonly skins: BuildingSkin[];
  private readonly bodyMeshes: Mesh[] = [];
  private readonly drawnMeshes: Mesh[] = [];
  private readonly depthMeshes: Mesh[] = [];
  private readonly raycaster = new Raycaster();
  private readonly stepProbe = new Raycaster(new Vector3(), DOWN, 0, STEP_REACH);
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
    fittings: readonly Mesh[] = [],
  ) {
    super(new Group());

    // 겉모습을 입히기 전의 메시가 건물의 몸체다. 입힌 뒤에는 외곽선 같은 덧메시가 더 생길 수 있다.
    model.traverse((node) => {
      if (node instanceof Mesh) this.bodyMeshes.push(node);
    });
    this.skins = [look.dress(model)];
    // 따로 그린 조각(문, 꽃 상자)은 몸체가 아니라서 길을 막거나 캐릭터를 가리는 검사에는 들어가지 않고,
    // 건물과 함께 옅어지기만 한다.
    for (const piece of fittings) {
      this.skins.push(look.dressFitting(piece));
      model.add(piece);
    }
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
    this.box = {
      min: { x: world.min.x, y: world.min.y, z: world.min.z },
      max: { x: world.max.x, y: world.max.y, z: world.max.z },
    };
    this.footprint = this.measureWalls(world);

    this.root.add(
      look.groundShadow({
        x: placement.x,
        z: placement.z,
        width: this.footprint.maxX - this.footprint.minX,
        depth: this.footprint.maxZ - this.footprint.minZ,
        height: world.max.y - world.min.y,
      }),
    );
  }

  /**
   * 그 자리에 계단처럼 낮은 윗면이 있으면 그 높이를 알려 준다.
   * 처마 아래로만 선을 쏘므로 지붕은 잡히지 않는다.
   */
  floorAt(point: Readonly<Vec2>): number {
    const { min, max } = this.box;
    if (point.x < min.x || point.x > max.x || point.z < min.z || point.z > max.z) return 0;
    this.stepProbe.ray.origin.set(point.x, STEP_REACH, point.z);
    this.hits.length = 0;
    const hit = this.stepProbe.intersectObjects(this.bodyMeshes, false, this.hits)[0];
    return hit ? Math.max(0, hit.point.y) : 0;
  }

  get opacity(): number {
    return this.currentOpacity;
  }

  /**
   * 몸 가운데와 좌우 끝을 발목, 허리, 머리 높이에서 살펴 하나라도 가려지면 가린 것으로 본다.
   * 먼저 상자로 걸러 내고, 걸리면 실제 메시에 선을 쏴서 박공지붕 옆 빈 곳을 가려 낸다.
   */
  occludes(target: OcclusionTarget, towardCamera: Vec3): boolean {
    const probes = bodyProbes(
      target.position,
      target.occlusionHeights,
      target.elevation,
      target.halfWidth,
      towardCamera,
    );
    this.rayDirection.set(towardCamera.x, towardCamera.y, towardCamera.z);
    for (const probe of probes) {
      if (!rayHitsBox(probe, towardCamera, this.box)) continue;
      this.raycaster.set(this.rayOrigin.set(probe.x, probe.y, probe.z), this.rayDirection);
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
    for (const skin of this.skins) skin.setOpacity(this.currentOpacity);
    const faded = this.currentOpacity < 1;
    if (faded === this.faded) return;
    this.faded = faded;
    for (const mesh of this.drawnMeshes) mesh.renderOrder = faded ? ORDER.fadedColor : 0;
    for (const mesh of this.depthMeshes) mesh.visible = faded;
  }

  /**
   * 길을 막는 자리는 겉 상자가 아니라 실제 벽이다. 네 면 바깥에서 안쪽으로 선을 쏘아 벽이 선 자리를 잰다.
   * 그래야 처마 밑과 문 앞 계단을 걸을 수 있고, 문 바로 앞까지 다가설 수 있다.
   */
  private measureWalls(world: Box3): Footprint {
    const width = world.max.x - world.min.x;
    const depth = world.max.z - world.min.z;
    const y = world.min.y + (world.max.y - world.min.y) * WALL_PROBE_HEIGHT;
    const along = (from: number, length: number) => WALL_PROBE_SPOTS.map((spot) => from + length * spot);
    const xs = along(world.min.x, width);
    const zs = along(world.min.z, depth);

    const west = this.wallHits(
      zs.map((z) => [world.min.x - 1, y, z]),
      1,
      0,
    );
    const east = this.wallHits(
      zs.map((z) => [world.max.x + 1, y, z]),
      -1,
      0,
    );
    const north = this.wallHits(
      xs.map((x) => [x, y, world.min.z - 1]),
      0,
      1,
    );
    const south = this.wallHits(
      xs.map((x) => [x, y, world.max.z + 1]),
      0,
      -1,
    );
    return {
      minX: west.length ? Math.min(...west.map((hit) => hit.x)) : world.min.x + width * FOOTPRINT_SHRINK,
      maxX: east.length ? Math.max(...east.map((hit) => hit.x)) : world.max.x - width * FOOTPRINT_SHRINK,
      minZ: north.length ? Math.min(...north.map((hit) => hit.z)) : world.min.z + depth * FOOTPRINT_SHRINK,
      maxZ: south.length ? Math.max(...south.map((hit) => hit.z)) : world.max.z - depth * FOOTPRINT_SHRINK,
    };
  }

  /** 주어진 자리들에서 수평으로 선을 쏘아 처음 닿은 벽의 위치를 모은다. */
  private wallHits(
    origins: readonly (readonly [number, number, number])[],
    dirX: number,
    dirZ: number,
  ): Vector3[] {
    const found: Vector3[] = [];
    this.rayDirection.set(dirX, 0, dirZ);
    for (const [x, y, z] of origins) {
      this.raycaster.set(this.rayOrigin.set(x, y, z), this.rayDirection);
      this.hits.length = 0;
      const hit = this.raycaster.intersectObjects(this.bodyMeshes, false, this.hits)[0];
      if (hit) found.push(hit.point.clone());
    }
    return found;
  }
}

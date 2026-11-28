import { OrthographicCamera, Plane, Raycaster, Vector2, Vector3, type Camera } from 'three';
import type { GroundPicker, ScreenPoint, ScreenProjector } from '../game/capabilities';
import { VIEW, towardCamera, type Vec2, type Vec3, type ViewAngle } from '../game/logic/view';

const DISTANCE = 60;
const FOLLOW_RATE = 6;
/** 처음 거리에 견주어 얼마나 당기고 밀 수 있는지. */
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 1.5;

/** 정해진 각도로 내려다보는 고정 시점 카메라. 각도는 처음에 받은 그대로이고 대상만 따라간다. */
export class QuarterCamera implements GroundPicker, ScreenProjector {
  private readonly lens = new OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  private readonly target = new Vector3();
  private readonly offset: Vector3;
  private readonly raycaster = new Raycaster();
  private readonly ground = new Plane(new Vector3(0, 1, 0), 0);
  // 매번 새로 만들지 않고 다시 쓰는 계산용 벡터.
  private readonly pointer = new Vector2();
  private readonly hit = new Vector3();
  private readonly projected = new Vector3();
  /** 장면에 따라 잠시 당겨 보는 배율. 1이면 보통이고, 작을수록 가까이 본다. */
  private closeness = 1;
  private closenessTarget = 1;
  private readonly minViewHeight: number;
  private readonly maxViewHeight: number;
  private aspect = 16 / 9;

  /** viewHeight: 화면 세로에 들어오는 월드 길이. 작을수록 확대된다. */
  constructor(
    angle: ViewAngle = VIEW,
    private viewHeight = 8.6,
  ) {
    this.minViewHeight = viewHeight * MIN_ZOOM;
    this.maxViewHeight = viewHeight * MAX_ZOOM;
    const dir = towardCamera(angle.elevation, angle.azimuth);
    this.offset = new Vector3(dir.x, dir.y, dir.z).multiplyScalar(DISTANCE);
    this.apply();
  }

  /** 렌더러에 넘길 카메라. */
  get camera(): Camera {
    return this.lens;
  }

  /** 카메라가 바라보는 지점. */
  get focus(): Vector3 {
    return this.target;
  }

  resize(width: number, height: number): void {
    this.aspect = width / Math.max(1, height);
    this.apply();
  }

  zoom(delta: number): void {
    this.viewHeight = Math.max(this.minViewHeight, Math.min(this.maxViewHeight, this.viewHeight + delta));
    this.apply();
  }

  /** 화면을 잠시 당기거나 되돌린다. ratio가 1보다 작으면 가까이 본다. 휠로 정한 거리는 그대로 남는다. */
  closeUp(ratio: number): void {
    this.closenessTarget = ratio;
  }

  /** 대상 위치로 부드럽게 따라간다. snap이면 바로 옮긴다. */
  follow(point: Readonly<Vec2>, dt: number, snap = false): void {
    const k = snap ? 1 : 1 - Math.exp(-FOLLOW_RATE * dt);
    if (this.closeness !== this.closenessTarget) {
      const gap = this.closenessTarget - this.closeness;
      this.closeness = Math.abs(gap) < 0.002 ? this.closenessTarget : this.closeness + gap * k;
      this.apply();
    }
    this.target.x += (point.x - this.target.x) * k;
    this.target.z += (point.z - this.target.z) * k;
    this.target.y = 1;
    this.lens.position.copy(this.target).add(this.offset);
    this.lens.lookAt(this.target);
    this.lens.updateMatrixWorld();
  }

  pickGround(ndcX: number, ndcY: number): Vec2 | null {
    this.raycaster.setFromCamera(this.pointer.set(ndcX, ndcY), this.lens);
    const hit = this.raycaster.ray.intersectPlane(this.ground, this.hit);
    return hit ? { x: hit.x, z: hit.z } : null;
  }

  toScreen(point: Readonly<Vec3>): ScreenPoint {
    const p = this.projected.set(point.x, point.y, point.z).project(this.lens);
    return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 };
  }

  private apply(): void {
    const halfH = (this.viewHeight * this.closeness) / 2;
    const halfW = halfH * this.aspect;
    this.lens.left = -halfW;
    this.lens.right = halfW;
    this.lens.top = halfH;
    this.lens.bottom = -halfH;
    this.lens.updateProjectionMatrix();
  }
}

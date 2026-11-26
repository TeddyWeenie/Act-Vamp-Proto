import { OrthographicCamera, Plane, Raycaster, Vector2, Vector3, type Camera } from 'three';
import type { GroundPicker } from '../game/capabilities';
import { towardCamera, type Vec2 } from '../game/logic/view';

const DISTANCE = 60;
const FOLLOW_RATE = 6;
const MIN_VIEW_HEIGHT = 6;
const MAX_VIEW_HEIGHT = 14;

/** 위에서 45도로 내려다보는 고정 쿼터뷰 카메라. 각도는 바뀌지 않고 대상만 따라간다. */
export class QuarterCamera implements GroundPicker {
  private readonly lens = new OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  private readonly target = new Vector3();
  private readonly offset: Vector3;
  private readonly raycaster = new Raycaster();
  private readonly ground = new Plane(new Vector3(0, 1, 0), 0);
  // 매번 새로 만들지 않고 다시 쓰는 계산용 벡터.
  private readonly pointer = new Vector2();
  private readonly hit = new Vector3();
  /** 화면 세로에 들어오는 월드 길이. 작을수록 확대된다. */
  private viewHeight = 8.6;
  private aspect = 16 / 9;

  constructor() {
    const dir = towardCamera();
    this.offset = new Vector3(dir.x, dir.y, dir.z).multiplyScalar(DISTANCE);
    this.apply();
  }

  /** 렌더러에 넘길 카메라. */
  get camera(): Camera {
    return this.lens;
  }

  resize(width: number, height: number): void {
    this.aspect = width / Math.max(1, height);
    this.apply();
  }

  zoom(delta: number): void {
    this.viewHeight = Math.max(MIN_VIEW_HEIGHT, Math.min(MAX_VIEW_HEIGHT, this.viewHeight + delta));
    this.apply();
  }

  /** 대상 위치로 부드럽게 따라간다. snap이면 바로 옮긴다. */
  follow(point: Readonly<Vec2>, dt: number, snap = false): void {
    const k = snap ? 1 : 1 - Math.exp(-FOLLOW_RATE * dt);
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

  private apply(): void {
    const halfH = this.viewHeight / 2;
    const halfW = halfH * this.aspect;
    this.lens.left = -halfW;
    this.lens.right = halfW;
    this.lens.top = halfH;
    this.lens.bottom = -halfH;
    this.lens.updateProjectionMatrix();
  }
}

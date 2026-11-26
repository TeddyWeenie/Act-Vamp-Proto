import type { Occluder, OcclusionTarget, Updatable } from '../capabilities';
import type { Vec3 } from '../logic/view';

/**
 * 지켜보는 대상이 어떤 것에 가려졌는지 살펴서, 가린 것에게 알려 준다.
 * 대상이 움직이지 않으면 결과가 같으므로 다시 검사하지 않는다.
 */
export class OcclusionSystem implements Updatable {
  private readonly occluders: Occluder[] = [];
  private target: OcclusionTarget | null = null;
  private lastX = NaN;
  private lastZ = NaN;

  constructor(private readonly towardCamera: Vec3) {}

  add(occluder: Occluder): void {
    this.occluders.push(occluder);
    this.invalidate();
  }

  watch(target: OcclusionTarget | null): void {
    this.target = target;
    this.invalidate();
  }

  update(_dt = 0): void {
    const target = this.target;
    if (target) {
      const { x, z } = target.position;
      if (x === this.lastX && z === this.lastZ) return;
      this.lastX = x;
      this.lastZ = z;
    }
    for (const occluder of this.occluders) {
      occluder.setOccluding(target ? occluder.occludes(target, this.towardCamera) : false);
    }
  }

  private invalidate(): void {
    this.lastX = this.lastZ = NaN;
  }
}

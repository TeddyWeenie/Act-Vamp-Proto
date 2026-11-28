import type { Occluder, OcclusionTarget, Updatable } from '../capabilities';
import type { Vec3 } from '../logic/view';

/**
 * 지켜보는 대상들이 어떤 것에 가려졌는지 살펴서, 가린 것에게 알려 준다.
 * 주인공 한 사람(watch)에 더해 동료와 적(include)도 함께 지켜볼 수 있고, 그중 누구라도 가리면 가린 것으로 본다.
 * 아무도 움직이지 않으면 결과가 같으므로 다시 검사하지 않는다.
 */
export class OcclusionSystem implements Updatable {
  private readonly occluders: Occluder[] = [];
  private readonly extras: OcclusionTarget[] = [];
  private targets: readonly OcclusionTarget[] = [];
  /** 지난번에 검사했을 때의 대상별 상태(x, z, 감춰졌는지). 달라진 것이 있을 때만 다시 검사한다. */
  private seen: number[] = [];
  private stale = true;

  constructor(private readonly towardCamera: Vec3) {}

  add(occluder: Occluder): void {
    this.occluders.push(occluder);
    this.stale = true;
  }

  /** 주로 지켜볼 대상(주인공)을 정한다. null이면 주인공 없이 함께 지켜보는 대상만 살핀다. */
  watch(target: OcclusionTarget | null): void {
    this.targets = target ? [target, ...this.extras] : [...this.extras];
    this.stale = true;
  }

  /** 주인공과 함께 지켜볼 대상을 더한다. */
  include(target: OcclusionTarget): void {
    this.extras.push(target);
    this.targets = [...this.targets, target];
    this.stale = true;
  }

  update(_dt = 0): void {
    if (!this.changed()) return;
    const { targets, towardCamera } = this;
    for (const occluder of this.occluders) {
      let covering = false;
      for (const target of targets) {
        if (!target.hidden && occluder.occludes(target, towardCamera)) {
          covering = true;
          break;
        }
      }
      occluder.setOccluding(covering);
    }
  }

  /** 지난 검사 뒤로 누가 움직였거나 나타나고 사라졌는지 보고, 지금 상태를 기억해 둔다. */
  private changed(): boolean {
    let changed = this.stale;
    this.stale = false;
    const { targets, seen } = this;
    if (seen.length !== targets.length * 3) {
      seen.length = targets.length * 3;
      changed = true;
    }
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i]!;
      const hidden = target.hidden ? 1 : 0;
      const { x, z } = target.position;
      const at = i * 3;
      if (seen[at] !== x || seen[at + 1] !== z || seen[at + 2] !== hidden) {
        seen[at] = x;
        seen[at + 1] = z;
        seen[at + 2] = hidden;
        changed = true;
      }
    }
    return changed;
  }
}

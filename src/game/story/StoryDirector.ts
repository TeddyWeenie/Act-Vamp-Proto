import type { Updatable } from '../capabilities';
import type { CharacterController } from '../control/controller';
import type { SwitchController } from '../control/SwitchController';
import type { InteractInput } from '../input';
import type { Vec2 } from '../logic/view';
import type { Hotspot, StoryScene } from './scene';
import type { PromptScreen } from './screens';

/** 주인공의 조종을 플레이어와 연출 사이에서 넘겨주는 데 필요한 것. */
export interface HeroReins {
  readonly hero: { readonly position: Readonly<Vec2> };
  readonly control: SwitchController;
  readonly player: CharacterController;
  readonly scripted: CharacterController;
}

/** 탐색으로 돌아올 때마다 알림을 받는 것. 할 일 표시를 고치거나 동료를 다시 따라오게 한다. */
export interface ExploreListener {
  exploring(): void;
}

/**
 * 탐색과 장면 사이를 오가게 한다.
 * 탐색 중에는 주인공 가까이의 자리(Hotspot)를 살펴 장면을 열고, 장면이 도는 동안에는 주인공의 조종을 연출에 넘긴다.
 * 어떤 자리와 장면이 있는지는 모르므로, 이야기가 늘어도 이 클래스는 그대로다.
 */
export class StoryDirector implements Updatable {
  private scene: StoryScene | null = null;

  constructor(
    private readonly reins: HeroReins,
    private readonly hotspots: readonly Hotspot[],
    private readonly input: InteractInput,
    private readonly prompt: PromptScreen,
    private readonly listener: ExploreListener,
  ) {
    this.listener.exploring();
  }

  /** 지금 장면이 도는 중인지. */
  get busy(): boolean {
    return this.scene !== null;
  }

  update(dt: number): void {
    const pressed = this.input.takeInteract();
    if (this.scene) {
      this.scene.update(dt);
      if (this.scene.finished) this.play(this.scene.next());
      return;
    }
    const spot = this.hotspots.find((candidate) => candidate.inReach(this.reins.hero.position));
    this.prompt.show(spot?.prompt ?? null);
    if (spot && (spot.prompt === null || pressed)) this.play(spot.open());
  }

  private play(scene: StoryScene | null): void {
    this.scene = scene;
    if (scene) {
      this.reins.control.use(this.reins.scripted);
      this.prompt.show(null);
      scene.begin();
    } else {
      this.reins.control.use(this.reins.player);
      this.listener.exploring();
    }
  }
}

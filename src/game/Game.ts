import type { Scene, WebGLRenderer } from 'three';
import type { QuarterCamera } from '../render/camera';
import type { OcclusionTarget, Updatable } from './capabilities';
import type { ZoomInput } from './input';

/** 휠 한 칸에 바뀌는 화면 높이. */
const ZOOM_STEP = 0.8;
/** 탭이 가려졌다 돌아왔을 때 한 번에 너무 멀리 가지 않도록 프레임 길이를 묶는다. */
const MAX_FRAME_SECONDS = 0.05;

/**
 * 게임의 박자를 맡는다. 매 프레임 월드를 한 걸음 진행시키고, 카메라를 주인공에게 맞추고, 화면을 그린다.
 * 월드 안에 무엇이 있는지는 알지 못한다.
 */
export class Game {
  private lastTime = 0;
  private running = false;

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly scene: Scene,
    private readonly view: QuarterCamera,
    private readonly world: Updatable,
    private readonly focus: Pick<OcclusionTarget, 'position'>,
    private readonly zoom: ZoomInput,
  ) {
    window.addEventListener('resize', this.resize);
    this.resize();
    this.view.follow(this.focus.position, 0, true);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
  }

  private readonly frame = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(MAX_FRAME_SECONDS, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.update(dt);
    this.renderer.render(this.scene, this.view.camera);
    requestAnimationFrame(this.frame);
  };

  private update(dt: number): void {
    const wheel = this.zoom.takeWheel();
    if (wheel) this.view.zoom(wheel * ZOOM_STEP);
    this.world.update(dt);
    this.view.follow(this.focus.position, dt);
  }

  private readonly resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height, false);
    this.view.resize(width, height);
  };
}

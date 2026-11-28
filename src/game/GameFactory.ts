import { SRGBColorSpace, Scene, TextureLoader, WebGLRenderer } from 'three';
import { ModelLibrary } from '../render/ModelLibrary';
import { TextureLibrary } from '../render/TextureLibrary';
import { SpriteFactory } from '../render/SpriteFactory';
import { QuarterCamera } from '../render/camera';
import type { SceneLook } from '../render/look';
import { DebugProbe } from './DebugProbe';
import { Game } from './Game';
import { Sequence } from './Sequence';
import { World } from './World';
import { KeyboardMove } from './control/KeyboardMove';
import { PlayerController } from './control/PlayerController';
import { PointerMove } from './control/PointerMove';
import { ScriptedController } from './control/ScriptedController';
import { SwitchController } from './control/SwitchController';
import { BuildingFactory } from './entities/BuildingFactory';
import { Ground } from './entities/Ground';
import { MoveMarker } from './entities/MoveMarker';
import { Prop } from './entities/Prop';
import { DomInput } from './input';
import { towardCamera } from './logic/view';
import type { Staging } from './staging/Staging';
import type { Story } from './story/Story';
import { CameraFocus } from './systems/CameraFocus';
import { CollisionMap } from './systems/CollisionMap';
import { OcclusionSystem } from './systems/OcclusionSystem';

const GROUND_TEXTURE = '/assets/textures/cobble.webp';

export interface AssembledGame {
  game: Game;
  debug: DebugProbe;
}

/**
 * 게임을 이루는 객체들을 만들어 서로 이어 준다.
 * 어떤 구현을 쓸지는 여기서만 정하고, 나머지 클래스는 넘겨받은 것을 인터페이스로만 쓴다.
 * 화면 느낌을 바꾸려면 look에, 카메라 구도와 그에 맞는 그림을 바꾸려면 staging에 다른 구현을 넘기면 된다.
 * story를 넘기면 그 이야기의 인물과 장면이 무대에 오르고, 넘기지 않으면 걸어 다니기만 하는 빈 마을이다.
 */
export class GameFactory {
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly look: SceneLook,
    private readonly staging: Staging,
    private readonly story: Story | null = null,
  ) {}

  async create(): Promise<AssembledGame> {
    const renderer = new WebGLRenderer({ canvas: this.canvas, antialias: true });
    renderer.outputColorSpace = SRGBColorSpace;
    const scene = new Scene();

    const { angle, town, props, bounds, viewHeight } = this.staging;
    const view = new QuarterCamera(angle, viewHeight);
    const input = new DomInput(this.canvas);
    const collisions = new CollisionMap(bounds);
    const occlusion = new OcclusionSystem(towardCamera(angle.elevation, angle.azimuth));
    const world = new World(scene, collisions, occlusion);

    const buildingFactory = new BuildingFactory(new ModelLibrary(), new TextureLibrary(), this.look);
    // 키보드가 먼저고, 누르지 않을 때만 클릭한 곳으로 걸어간다.
    const pointerMove = new PointerMove(input, view, collisions);
    const player = new PlayerController([new KeyboardMove(input, angle.azimuth), pointerMove], input);
    // 탐색 중에는 플레이어가, 대화와 전투 중에는 연출이 주인공을 움직인다.
    const heroLead = new ScriptedController();
    const controller = new SwitchController(player);

    const sprites = new SpriteFactory(this.look, angle);
    const [groundTexture, hero, buildings, scenery] = await Promise.all([
      new TextureLoader().loadAsync(GROUND_TEXTURE),
      this.staging.createHero(sprites, collisions, controller),
      Promise.all(town.map((placement) => buildingFactory.create(placement))),
      Promise.all(
        props.map(async (placement) => {
          const image = await sprites.still(placement.image, placement.height);
          return new Prop(image, placement, this.look);
        }),
      ),
    ]);

    world.add(new Ground(groundTexture, bounds, this.look, renderer.capabilities.getMaxAnisotropy()));
    for (const building of buildings) world.add(building);
    for (const prop of scenery) world.add(prop);

    world.add(new MoveMarker(pointerMove));
    world.add(hero);
    occlusion.watch(hero);

    const focus = new CameraFocus(hero);
    const tale = this.story?.stage({
      world,
      hero,
      control: controller,
      player,
      heroLead,
      space: collisions,
      sight: occlusion,
      focus,
      lens: view,
      input,
      look: this.look,
      angle,
    });
    // 이야기가 조종자를 먼저 정하고, 그다음 월드가 그 조종대로 움직인다.
    const frame = tale ? new Sequence([tale, world]) : world;

    return {
      game: new Game(renderer, scene, view, frame, focus, input, this.look),
      debug: new DebugProbe(hero, buildings, world),
    };
  }
}

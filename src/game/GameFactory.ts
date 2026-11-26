import { SRGBColorSpace, Scene, TextureLoader, WebGLRenderer } from 'three';
import { LUCIEN_BODY } from '../data/characters';
import { LUCIEN, type HeroClip } from '../data/sprites';
import { PLAYER_START, TOWN, TOWN_BOUNDS } from '../data/town';
import { ModelLibrary } from '../render/ModelLibrary';
import { SpriteFactory } from '../render/SpriteFactory';
import { QuarterCamera } from '../render/camera';
import type { SceneLook } from '../render/look';
import { DebugProbe } from './DebugProbe';
import { Game } from './Game';
import { World } from './World';
import { KeyboardMove } from './control/KeyboardMove';
import { PlayerController } from './control/PlayerController';
import { PointerMove } from './control/PointerMove';
import { BuildingFactory } from './entities/BuildingFactory';
import { Ground } from './entities/Ground';
import { Hero } from './entities/Hero';
import { MoveMarker } from './entities/MoveMarker';
import { DomInput } from './input';
import { towardCamera } from './logic/view';
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
 * 화면 느낌을 바꾸려면 look에 다른 구현을 넘기면 된다.
 */
export class GameFactory {
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly look: SceneLook,
  ) {}

  async create(): Promise<AssembledGame> {
    const renderer = new WebGLRenderer({ canvas: this.canvas, antialias: true });
    renderer.outputColorSpace = SRGBColorSpace;
    const scene = new Scene();

    const view = new QuarterCamera();
    const input = new DomInput(this.canvas);
    const collisions = new CollisionMap(TOWN_BOUNDS);
    const occlusion = new OcclusionSystem(towardCamera());
    const world = new World(scene, collisions, occlusion);

    const buildingFactory = new BuildingFactory(new ModelLibrary(), this.look);
    const [groundTexture, heroSprite, buildings] = await Promise.all([
      new TextureLoader().loadAsync(GROUND_TEXTURE),
      new SpriteFactory(this.look).create<HeroClip>(LUCIEN, 'idle'),
      Promise.all(TOWN.map((placement) => buildingFactory.create(placement))),
    ]);

    world.add(new Ground(groundTexture, TOWN_BOUNDS, this.look, renderer.capabilities.getMaxAnisotropy()));
    for (const building of buildings) world.add(building);

    // 키보드가 먼저고, 누르지 않을 때만 클릭한 곳으로 걸어간다.
    const pointerMove = new PointerMove(input, view, collisions);
    const controller = new PlayerController([new KeyboardMove(input), pointerMove], input);
    world.add(new MoveMarker(pointerMove));
    const hero = world.add(new Hero(heroSprite, LUCIEN_BODY, collisions, controller, PLAYER_START));
    occlusion.watch(hero);

    return {
      game: new Game(renderer, scene, view, world, hero, input, this.look),
      debug: new DebugProbe(hero, buildings),
    };
  }
}

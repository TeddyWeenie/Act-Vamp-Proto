import type { BuildingLook, SpriteLook } from '../../render/look';
import type { World } from '../World';
import type { CloseUpLens } from '../battle/Arena';
import type {
  ClearanceMap,
  OcclusionWatch,
  ScreenProjector,
  Updatable,
  WalkableSpace,
} from '../capabilities';
import type { ScriptedController } from '../control/ScriptedController';
import type { SwitchController } from '../control/SwitchController';
import type { CharacterController } from '../control/controller';
import type { Character } from '../entities/Character';
import type { InteractInput } from '../input';
import type { ViewAngle } from '../logic/view';
import type { CameraFocus } from '../systems/CameraFocus';
import type { BattleScreen, DialogueScreen, PromptScreen, QuestScreen, ResultScreen } from './screens';

/** 이야기가 플레이어에게 보여 주는 화면들. */
export interface StoryScreens {
  readonly dialogue: DialogueScreen;
  readonly result: ResultScreen;
  readonly prompt: PromptScreen;
  readonly quest: QuestScreen;
  readonly battle: BattleScreen;
}

/** 이야기를 무대에 올리는 데 필요한, 게임이 이미 만들어 둔 것들. */
export interface StoryKit {
  readonly world: World;
  readonly hero: Character<string>;
  /** 주인공의 조종을 갈아 끼우는 자리와, 거기에 끼울 플레이어 조종·연출 조종. */
  readonly control: SwitchController;
  readonly player: CharacterController;
  readonly heroLead: ScriptedController;
  readonly space: WalkableSpace & ClearanceMap;
  /** 건물이나 나무에 가려지면 그것을 옅게 해 줄 대상을 등록하는 곳. */
  readonly sight: OcclusionWatch;
  readonly focus: CameraFocus;
  readonly lens: CloseUpLens & ScreenProjector;
  readonly input: InteractInput;
  readonly look: SpriteLook & Pick<BuildingLook, 'groundShadow' | 'fadeRate'>;
  readonly angle: ViewAngle;
  /** 보통 때 화면 세로에 들어오는 월드 길이. */
  readonly viewHeight: number;
}

/** 이야기 한 편을 무대에 올리는 것. 다른 장(章)은 이 약속을 지키는 클래스를 더해 만든다. */
export interface Story {
  /** 인물과 장면을 무대에 올리고, 매 프레임 진행시킬 것을 돌려준다. */
  stage(kit: StoryKit): Updatable;
}

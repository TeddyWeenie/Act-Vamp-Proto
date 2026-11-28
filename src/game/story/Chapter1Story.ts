import {
  ARCHIVIST_AFTER,
  BATTLE_OPENING,
  DEFEAT,
  FIRST_VICTORY,
  INTRO,
  QUESTS,
  REACTOR_FIRST,
} from '../../data/chapter1';
import {
  AMBUSH_RADIUS,
  COMPANIONS,
  ORIN,
  QUEST_HINTS,
  REACTOR,
  SENTINELS,
  type ActorSpec,
} from '../../data/chapter1Scene';
import { ENCOUNTERS } from '../../data/encounters';
import { HERO_SPECS, START_SUPPLIES } from '../../data/party';
import { PlaceholderFactory } from '../../render/PlaceholderFactory';
import { Campaign } from '../../story/Campaign';
import { FieldArena } from '../battle/Arena';
import type { Performer } from '../battle/BattleActor';
import { BattleScene } from '../battle/BattleScene';
import type { Updatable } from '../capabilities';
import { Escort } from '../control/Escort';
import { ScriptedController } from '../control/ScriptedController';
import { Trail } from '../control/TrailFollow';
import { BattleGround } from '../entities/BattleGround';
import { Prop } from '../entities/Prop';
import { StandIn } from '../entities/StandIn';
import { CardinalFacing } from '../logic/facing';
import type { FormationShape } from '../logic/formation';
import type { Vec2 } from '../logic/view';
import { Sequence } from '../Sequence';
import { ResultScene } from './ResultScene';
import { StoryDirector, type ExploreListener } from './StoryDirector';
import { TalkScene } from './TalkScene';
import { CircleSpot, type StoryScene } from './scene';
import type { Story, StoryKit, StoryScreens } from './Story';

/**
 * 제1장의 첫 전투까지: 오린과의 대화와 선택, 동력로 앞의 조우, 그 자리에서 벌어지는 전투, 결과 화면.
 * 누가 어디에 서는지는 data/chapter1Scene.ts가, 대사는 data/chapter1.ts가 정하고,
 * 이 클래스는 그것들을 인물·자리·장면 객체로 엮기만 한다.
 */
export class Chapter1Story implements Story, ExploreListener {
  private readonly campaign = new Campaign(HERO_SPECS, START_SUPPLIES);
  private escort: Escort | null = null;

  constructor(
    private readonly screens: StoryScreens,
    private readonly formation: FormationShape,
  ) {}

  stage(kit: StoryKit): Updatable {
    const { world, hero, look, angle, space } = kit;
    const art = new PlaceholderFactory(look, angle);

    for (const fixture of [ORIN, REACTOR]) {
      world.add(new Prop(art.still(fixture.figure, fixture.height), fixture.site, look));
    }
    const walkOn = (spec: ActorSpec): Performer => {
      const lead = new ScriptedController();
      const sprite = art.figure(spec.figure, spec.body.height);
      const facing = new CardinalFacing(angle.azimuth);
      const body = world.add(new StandIn(sprite, spec.body, space, lead, spec.start, facing));
      // 동료와 적도 건물이나 나무 뒤에 서면 그것이 옅어져서, 전투 대형이 가려지지 않는다.
      kit.sight.include(body);
      return { body, lead };
    };
    const companions = COMPANIONS.map((spec) => ({ ...walkOn(spec), id: spec.id, lag: spec.lag }));
    const foes = SENTINELS.map(walkOn);
    // 적은 첫 선택을 마친 뒤에 나타난다.
    for (const foe of foes) foe.body.setVisible(false);
    // 동료는 오린을 보고 서 있다.
    for (const companion of companions)
      companion.body.turnTo(this.toward(companion.body.position, ORIN.site));

    const escort = new Escort(new Trail(hero), companions);
    this.escort = escort;
    const arena = new FieldArena(kit.focus, kit.lens, world.add(new BattleGround()));

    // 전투 수치의 순서(리시엔, 볼프, 에다)에 맞춰 몸을 짝짓는다.
    const allies = this.campaign.party.map((member): Performer =>
      member.id === HERO_SPECS[0]!.id
        ? { body: hero, lead: kit.heroLead }
        : companions.find((companion) => companion.id === member.id)!,
    );

    const { dialogue, result, battle } = this.screens;
    const firstBattle = (): StoryScene =>
      new BattleScene(
        {
          campaign: this.campaign,
          encounter: ENCOUNTERS.sentinels,
          cast: { allies, foes },
          ground: space,
          shape: this.formation,
          arena,
          screen: battle,
          projector: kit.lens,
          opening: BATTLE_OPENING[1],
        },
        (won) =>
          won
            ? new ResultScene(result, {
                title: FIRST_VICTORY.title,
                heading: FIRST_VICTORY.heading,
                body: FIRST_VICTORY.body,
                note: FIRST_VICTORY.reward,
                button: '계속',
              })
            : new ResultScene(
                result,
                {
                  title: DEFEAT.title,
                  heading: DEFEAT.heading,
                  body: DEFEAT.body,
                  note: DEFEAT.note,
                  button: '다시 도전',
                },
                firstBattle,
              ),
      );

    const talkToOrin = (): StoryScene => {
      hero.turnTo(this.toward(hero.position, ORIN.site));
      const stage = this.campaign.stage;
      if (stage !== 0) return new TalkScene(dialogue, [ARCHIVIST_AFTER[stage as 1 | 2 | 3]]);
      return new TalkScene(dialogue, INTRO, (choice) => {
        if (choice && this.campaign.choose(choice.id)) {
          for (const foe of foes) foe.body.setVisible(true);
        }
        return null;
      });
    };

    const hotspots = [
      new CircleSpot({ centre: ORIN.site, radius: ORIN.talkRadius, prompt: ORIN.prompt, open: talkToOrin }),
      new CircleSpot({
        centre: this.centreOf(SENTINELS.map((spec) => spec.start)),
        radius: AMBUSH_RADIUS,
        prompt: null,
        when: () => this.campaign.stage === 1,
        open: () => new TalkScene(dialogue, REACTOR_FIRST, firstBattle),
      }),
    ];

    const director = new StoryDirector(
      { hero, control: kit.control, player: kit.player, scripted: kit.heroLead },
      hotspots,
      kit.input,
      this.screens.prompt,
      this,
    );
    return new Sequence([director, escort]);
  }

  /** 탐색으로 돌아올 때마다: 할 일 표시를 고치고, 동료가 합류한 뒤라면 다시 따라오게 한다. */
  exploring(): void {
    const stage = this.campaign.stage;
    const quest = QUESTS[Math.min(stage, QUESTS.length - 1)]!;
    this.screens.quest.show({ ...quest, hint: QUEST_HINTS[stage] });
    if (stage >= 1) this.escort?.follow();
  }

  private toward(from: Readonly<Vec2>, to: Readonly<Vec2>): Vec2 {
    return { x: to.x - from.x, z: to.z - from.z };
  }

  private centreOf(points: readonly Vec2[]): Vec2 {
    return {
      x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
      z: points.reduce((sum, p) => sum + p.z, 0) / points.length,
    };
  }
}

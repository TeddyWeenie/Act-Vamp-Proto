import type { Battle } from '../../battle/Battle';
import type { Enemy } from '../../battle/Enemy';
import type { CommandId } from '../../battle/commands';
import type { BattleEvent } from '../../battle/events';
import type { EncounterSpec } from '../../data/encounters';
import type { Campaign, CampaignState } from '../../story/Campaign';
import type { ClearanceMap, ScreenProjector } from '../capabilities';
import { findClearFormation, type FormationPlan, type FormationShape } from '../logic/formation';
import type { Vec2 } from '../logic/view';
import type { StoryScene } from '../story/scene';
import type { BattleOrders, BattleScreen, FloatKind, Standing } from '../story/screens';
import type { Arena } from './Arena';
import { AllyActor, FoeActor, type BattleActor, type Performer } from './BattleActor';

/** 전투에 나서는 몸들. 순서는 일행과 적 목록의 순서와 같다. */
export interface BattleCast {
  readonly allies: readonly Performer[];
  readonly foes: readonly Performer[];
}

export interface BattleSetup {
  readonly campaign: Campaign;
  readonly encounter: EncounterSpec;
  readonly cast: BattleCast;
  readonly ground: ClearanceMap;
  readonly shape: FormationShape;
  readonly arena: Arena;
  readonly screen: BattleScreen;
  readonly projector: ScreenProjector;
  /** 전투가 시작될 때 띄우는 한 줄. */
  readonly opening: string;
}

/** 대형의 자리가 비었는지 볼 때 쓰는 발밑 반지름. 몸 너비보다 넉넉하게 잡아 벽이나 소품에 붙어 서지 않게 한다. */
const CLEARANCE = 1.0;
/** 자리로 걸어가는 데 주는 시간(초). 넘기면 자리로 바로 옮긴다. */
const GATHER_LIMIT = 2.6;
/** 공격 동작이 시작되고 맞는 순간까지, 맞은 뒤 다음 일까지의 시간(초). */
const STRIKE_SECONDS = 0.26;
const IMPACT_SECONDS = 0.42;
const SUPPORT_SECONDS = 0.4;
const ENDING_SECONDS = 1.0;

type Phase = 'gather' | 'fight' | 'over';
/** 연출 한 토막. 실행하고 나서 다음 토막까지 기다릴 시간을 돌려준다. */
type Beat = () => number;

/**
 * 걷던 자리에서 벌어지는 전투 한 판의 장면.
 * 만난 자리 가까이의 빈 곳에 대형을 잡아 모두를 걸어가게 하고, 규칙(Battle)이 내놓는 일들을 차례로 연출한다.
 * 규칙은 Battle이, 화면 표시는 BattleScreen이, 싸움터 꾸미기는 Arena가 맡고, 이 클래스는 그 셋의 박자만 맞춘다.
 */
export class BattleScene implements StoryScene, BattleOrders {
  private phase: Phase = 'gather';
  private battle!: Battle;
  private snapshot!: CampaignState;
  private plan!: FormationPlan;
  private allies: AllyActor[] = [];
  private foes: FoeActor[] = [];
  private readonly actors = new Map<string, BattleActor>();
  private readonly beats: Beat[] = [];
  private wait = 0;
  private timer = 0;
  private won = false;

  constructor(
    private readonly setup: BattleSetup,
    private readonly after: (won: boolean) => StoryScene | null = () => null,
  ) {}

  get finished(): boolean {
    return this.phase === 'over';
  }

  begin(): void {
    const { campaign, encounter, cast, ground, shape, arena, screen, opening } = this.setup;
    this.snapshot = campaign.save();
    this.battle = campaign.engage(encounter);
    this.allies = this.battle.party.map((member, i) => {
      const { body, lead } = cast.allies[i]!;
      return new AllyActor(member, body, lead);
    });
    this.foes = this.battle.enemies.map((enemy, i) => {
      const { body, lead } = cast.foes[i]!;
      return new FoeActor(enemy, body, lead);
    });
    for (const actor of [...this.allies, ...this.foes]) {
      this.actors.set(actor.combatant.id, actor);
      actor.refresh();
    }

    this.plan = findClearFormation(
      this.meetingPoint(),
      this.allies.length,
      this.foes.length,
      (point) => ground.isClear(point, CLEARANCE),
      shape,
    );
    this.allies.forEach((actor, i) => actor.moveTo(this.plan.party[i]!));
    this.foes.forEach((actor, i) => actor.moveTo(this.plan.enemies[i]!));

    arena.open(this.plan);
    screen.open(this.battle, campaign.supplies, this);
    screen.say(opening);
  }

  update(dt: number): void {
    if (this.phase === 'gather') this.gather(dt);
    else if (this.phase === 'fight') this.fight(dt);
    if (this.phase === 'over') return;
    this.setup.screen.arrange(this.standings());
    this.setup.screen.refresh();
  }

  next(): StoryScene | null {
    return this.after(this.won);
  }

  command(id: CommandId): void {
    const actor = this.battle.active;
    if (this.phase !== 'fight' || !actor || this.beats.length > 0 || this.wait > 0) return;
    const result = this.battle.act(id);
    if (!result.ok) {
      this.setup.screen.say(result.reason);
      return;
    }
    this.setup.screen.offer(null);
    this.setup.screen.say(`${actor.name} · ${result.command.name}`);
    this.present(result.events);
  }

  aim(enemy: Enemy): void {
    this.battle.aim(enemy);
  }

  /** 주인공과 적 무리의 가운데. 여기서 가장 가까운 빈자리에 대형을 잡는다. */
  private meetingPoint(): Vec2 {
    const hero = this.allies[0]!.position;
    const foes = this.foes.map((foe) => foe.position);
    const fx = foes.reduce((sum, p) => sum + p.x, 0) / foes.length;
    const fz = foes.reduce((sum, p) => sum + p.z, 0) / foes.length;
    return { x: (hero.x + fx) / 2, z: (hero.z + fz) / 2 };
  }

  private gather(dt: number): void {
    this.timer += dt;
    const everyone = [...this.allies, ...this.foes];
    if (this.timer < GATHER_LIMIT && !everyone.every((actor) => actor.settled)) return;
    const toFoes = this.plan.partyFacing;
    for (const ally of this.allies) ally.takePlace(toFoes);
    for (const foe of this.foes) foe.takePlace({ x: -toFoes.x, z: -toFoes.z });
    this.phase = 'fight';
  }

  private fight(dt: number): void {
    if (this.wait > 0) {
      this.wait -= dt;
      return;
    }
    const beat = this.beats.shift();
    if (beat) {
      this.wait = beat();
      return;
    }
    if (this.battle.phase !== 'running') {
      this.conclude();
      return;
    }
    // 명령을 기다리는 동안에는 규칙 쪽에서 시간이 멈춰 있다.
    this.present(this.battle.tick(dt));
  }

  /** 규칙이 내놓은 일들을 연출 토막으로 바꿔 줄 세운다. */
  private present(events: readonly BattleEvent[]): void {
    const { screen } = this.setup;
    let striker: string | null = null;
    for (const event of events) {
      switch (event.type) {
        case 'ready':
          this.beats.push(() => {
            screen.offer(this.battle.active);
            return 0;
          });
          break;
        case 'hit': {
          const attacker = this.actors.get(event.actor);
          const target = this.actors.get(event.target);
          // 한 번의 행동으로 여럿을 때릴 때는 공격 동작을 한 번만 한다.
          if (attacker && striker !== event.actor) {
            striker = event.actor;
            this.beats.push(() => {
              attacker.strike();
              if (attacker instanceof FoeActor) screen.say(`${attacker.combatant.name}의 공격`);
              return STRIKE_SECONDS;
            });
          }
          this.beats.push(() => {
            if (target) {
              target.refresh();
              if (event.hp > 0) this.float(target, `-${event.hp}`, 'damage');
              if (event.bp > 0) this.float(target, `배리어 -${event.bp}`, 'barrier', 0.05);
              if (event.broken) this.float(target, '배리어 파괴!', 'note', 0.1);
              if (event.hp === 0 && event.bp === 0) this.float(target, '막음', 'note');
            }
            return IMPACT_SECONDS;
          });
          break;
        }
        case 'heal': {
          const target = this.actors.get(event.target);
          this.beats.push(() => {
            if (target) {
              target.refresh();
              this.float(target, event.text, 'heal');
            }
            return SUPPORT_SECONDS;
          });
          break;
        }
        case 'victory':
        case 'defeat': {
          const text = event.type === 'victory' ? '승리!' : '일행이 쓰러졌다…';
          this.beats.push(() => {
            screen.offer(null);
            screen.say(text);
            return ENDING_SECONDS;
          });
          break;
        }
      }
    }
  }

  /** 모두가 지금 화면의 어디에 서 있는지. 화면이 이름표와 명령 메뉴를 그 곁에 붙인다. */
  private standings(): Standing[] {
    const { projector } = this.setup;
    return [...this.actors.values()].map((actor) => ({
      who: actor.combatant,
      feet: projector.toScreen(actor.feet),
      head: projector.toScreen(actor.overhead),
    }));
  }

  private float(actor: BattleActor, text: string, kind: FloatKind, drop = 0): void {
    const at = this.setup.projector.toScreen(actor.overhead);
    this.setup.screen.float(text, kind, { x: at.x, y: at.y + drop });
  }

  /** 전투를 마무리한다. 이기면 보상을 받고, 지면 전투 전 상태로 되돌린다. */
  private conclude(): void {
    const { campaign, encounter, arena, screen } = this.setup;
    this.won = this.battle.phase === 'victory';
    if (this.won) campaign.claim(this.battle, encounter);
    else campaign.load(this.snapshot);
    for (const actor of this.actors.values()) {
      actor.refresh();
      actor.dismiss();
    }
    screen.close();
    arena.close();
    this.phase = 'over';
  }
}

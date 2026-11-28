import { Group } from 'three';
import { describe, expect, it } from 'vitest';
import type { PartyMember } from '../src/battle/PartyMember';
import type { CommandId } from '../src/battle/commands';
import { ENCOUNTERS, type EncounterSpec } from '../src/data/encounters';
import { HERO_SPECS, START_SUPPLIES } from '../src/data/party';
import type { Arena } from '../src/game/battle/Arena';
import type { Performer } from '../src/game/battle/BattleActor';
import { BattleScene } from '../src/game/battle/BattleScene';
import type { ScreenProjector, SpriteAnimator } from '../src/game/capabilities';
import { ScriptedController } from '../src/game/control/ScriptedController';
import { StandIn } from '../src/game/entities/StandIn';
import { CardinalFacing } from '../src/game/logic/facing';
import { DEFAULT_FORMATION, type FormationPlan, type FormationShape } from '../src/game/logic/formation';
import type { Footprint } from '../src/game/logic/movement';
import type { Vec2 } from '../src/game/logic/view';
import type { BattleOrders, BattleScreen } from '../src/game/story/screens';
import { CollisionMap } from '../src/game/systems/CollisionMap';
import type { Pose } from '../src/game/states/characterStates';
import { Campaign } from '../src/story/Campaign';

/** 그림 없이 자세만 기억하는 가짜 동작 그림. 공격은 0.3초 뒤에 끝난다. */
class FakeSprite implements SpriteAnimator<Pose> {
  readonly root = new Group();
  clip: Pose = 'idle';
  private time = 0;
  get finished(): boolean {
    return this.clip === 'attack' && this.time >= 0.3;
  }
  play(clip: Pose, restart = false): void {
    if (clip === this.clip && !restart) return;
    this.clip = clip;
    this.time = 0;
  }
  faceLeft(): void {}
  setPosition(x: number, z: number, height: number): void {
    this.root.position.set(x, height, z);
  }
  update(dt: number): void {
    this.time += dt;
  }
}

/** 명령 메뉴가 열리면 기억해 두는 가짜 전투 화면. */
class FakeScreen implements BattleScreen {
  offered: PartyMember | null = null;
  orders: BattleOrders | null = null;
  opened = false;
  readonly said: string[] = [];
  readonly floats: string[] = [];
  open(_battle: unknown, _supplies: unknown, orders: BattleOrders): void {
    this.opened = true;
    this.orders = orders;
  }
  offer(member: PartyMember | null): void {
    this.offered = member;
  }
  say(text: string): void {
    this.said.push(text);
  }
  float(text: string): void {
    this.floats.push(text);
  }
  mark(): void {}
  refresh(): void {}
  close(): void {
    this.opened = false;
  }
}

class FakeArena implements Arena {
  plan: FormationPlan | null = null;
  closed = false;
  open(plan: FormationPlan): void {
    this.plan = plan;
  }
  close(): void {
    this.closed = true;
  }
}

const projector: ScreenProjector = { toScreen: () => ({ x: 0.5, y: 0.5 }) };
const BOUNDS = { minX: -20, maxX: 20, minZ: -20, maxZ: 20 };
const BODY = { speed: 4, radius: 0.45, height: 2.4 };
const DT = 1 / 30;

/** 일행이 버틸 수 없는 적 둘. 지는 경우를 확인할 때 쓴다. */
const HOPELESS: EncounterSpec = {
  enemies: [
    { id: 'e0', name: '시험용 거인', hp: 9999, bp: 0, atk: 400, def: 0, spd: 30, startAp: 90 },
    { id: 'e1', name: '시험용 그림자', hp: 9999, bp: 0, atk: 400, def: 0, spd: 30, startAp: 80 },
  ],
  reward: { gold: 0, shards: 0, potions: 0, xp: 0 },
  nextStage: 2,
};

function stage(options: { obstacle?: Footprint; shape?: FormationShape; encounter?: EncounterSpec } = {}) {
  const map = new CollisionMap(BOUNDS);
  if (options.obstacle) map.add({ footprint: options.obstacle });
  const bodies: StandIn[] = [];
  const walkOn = (start: Vec2): Performer => {
    const lead = new ScriptedController();
    const body = new StandIn(new FakeSprite(), BODY, map, lead, start, new CardinalFacing(0));
    bodies.push(body);
    return { body, lead };
  };
  const allies = [walkOn({ x: 0, z: 0 }), walkOn({ x: -1.5, z: 0.4 }), walkOn({ x: -2.8, z: -0.3 })];
  const foes = [walkOn({ x: 4, z: 0.5 }), walkOn({ x: 4.6, z: -1.2 })];
  const campaign = new Campaign(HERO_SPECS, START_SUPPLIES);
  campaign.choose('wolf');
  const screen = new FakeScreen();
  const arena = new FakeArena();
  const outcomes: boolean[] = [];
  const scene = new BattleScene(
    {
      campaign,
      encounter: options.encounter ?? ENCOUNTERS.sentinels,
      cast: { allies, foes },
      ground: map,
      shape: options.shape ?? DEFAULT_FORMATION,
      arena,
      screen,
      projector,
      opening: '조우!',
    },
    (won) => {
      outcomes.push(won);
      return null;
    },
  );
  /** 장면과 몸을 한 프레임씩 진행시킨다. 메뉴가 열리면 pick이 고른 명령을 내린다. */
  const run = (seconds: number, pick?: (member: PartyMember) => CommandId) => {
    for (let t = 0; t < seconds && !scene.finished; t += DT) {
      scene.update(DT);
      for (const body of bodies) body.update(DT);
      if (pick && screen.offered) screen.orders!.command(pick(screen.offered));
    }
  };
  return { scene, screen, arena, campaign, map, allies, foes, outcomes, run };
}

describe('그 자리에서 벌어지는 전투 장면', () => {
  it('만난 자리 가까이에 대형을 잡고, 모두 자기 자리에 선다', () => {
    const { scene, arena, allies, foes, run } = stage();
    scene.begin();
    run(4);
    const plan = arena.plan!;
    // 주인공(0,0)과 적 무리의 가운데에서 대형을 잡는다.
    expect(plan.centre.x).toBeCloseTo(2.15, 1);
    allies.forEach((ally, i) => {
      expect(ally.body.position.x).toBeCloseTo(plan.party[i]!.x, 1);
      expect(ally.body.position.z).toBeCloseTo(plan.party[i]!.z, 1);
    });
    foes.forEach((foe, i) => {
      expect(foe.body.position.x).toBeCloseTo(plan.enemies[i]!.x, 1);
      expect(foe.body.position.z).toBeCloseTo(plan.enemies[i]!.z, 1);
    });
    // 아군은 오른쪽(적 쪽)을, 적은 왼쪽을 본다.
    expect(allies[0]!.body.facing.left).toBe(false);
    expect(foes[0]!.body.facing.left).toBe(true);
  });

  it('건물이 있으면 그와 겹치지 않는 빈자리로 대형을 옮긴다', () => {
    // 적이 설 자리를 건물이 차지하고 있다.
    const { scene, arena, map, allies, foes, run } = stage({
      obstacle: { minX: 4.5, maxX: 8, minZ: -3, maxZ: 3 },
    });
    scene.begin();
    run(4);
    const plan = arena.plan!;
    for (const slot of [...plan.party, ...plan.enemies]) expect(map.isClear(slot, 1)).toBe(true);
    // 걸어가다 막힌 사람도 결국 자기 자리에 서 있고, 건물 안에 들어가 있지 않다.
    for (const performer of [...allies, ...foes]) {
      expect(map.isClear(performer.body.position, BODY.radius)).toBe(true);
    }
    foes.forEach((foe, i) => expect(foe.body.position.x).toBeCloseTo(plan.enemies[i]!.x, 1));
  });

  it('차례가 오면 명령 메뉴를 열고, 명령을 받으면 닫는다', () => {
    const { scene, screen, run } = stage();
    scene.begin();
    run(20);
    expect(screen.offered?.name).toBe('리시엔');
    screen.orders!.command('skill');
    expect(screen.offered).toBeNull();
    expect(screen.said.at(-1)).toBe('리시엔 · 혈월 찌르기');
    run(1.5);
    expect(screen.floats.some((text) => text.startsWith('-'))).toBe(true);
  });

  it('쓸 수 없는 명령은 이유를 알려 주고 차례를 넘기지 않는다', () => {
    const { scene, screen, campaign, run } = stage();
    campaign.supplies.add({ potions: -campaign.supplies.potions });
    scene.begin();
    run(20);
    screen.orders!.command('potion');
    expect(screen.said.at(-1)).toBe('회복약이 없습니다.');
    expect(screen.offered?.name).toBe('리시엔');
  });

  it('고유 기술을 쓰면 이기고, 보상을 받고, 쓰러진 적은 사라진다', () => {
    const { scene, screen, arena, campaign, foes, outcomes, run } = stage();
    scene.begin();
    run(600, () => 'skill');
    expect(scene.finished).toBe(true);
    scene.next();
    expect(outcomes).toEqual([true]);
    expect(campaign.stage).toBe(2);
    expect(campaign.supplies.gold).toBe(START_SUPPLIES.gold + ENCOUNTERS.sentinels.reward.gold);
    expect(foes.every((foe) => !foe.body.root.visible)).toBe(true);
    expect(screen.opened).toBe(false);
    expect(arena.closed).toBe(true);
  });

  it('지면 전투 전 상태로 되돌리고 다시 싸울 수 있다', () => {
    const { scene, campaign, allies, outcomes, run } = stage({ encounter: HOPELESS });
    const before = campaign.save();
    scene.begin();
    run(120, () => 'attack');
    expect(scene.finished).toBe(true);
    scene.next();
    expect(outcomes).toEqual([false]);
    expect(campaign.save()).toEqual(before);
    // 쓰러져 누웠던 몸이 다시 일어나 있다.
    expect(allies.every((ally) => ally.body.root.rotation.z === 0)).toBe(true);
  });

  it('아군이 아래, 적이 위에 서는 대형도 같은 방식으로 잡는다', () => {
    const { scene, arena, allies, foes, run } = stage({ shape: { ...DEFAULT_FORMATION, axis: 'ranks' } });
    scene.begin();
    run(4);
    const plan = arena.plan!;
    expect(Math.min(...plan.party.map((slot) => slot.z))).toBeGreaterThan(
      Math.max(...plan.enemies.map((slot) => slot.z)),
    );
    // 아군은 화면 위쪽(뒷모습)을, 적은 아래쪽을 본다.
    expect(allies[0]!.body.facing.back).toBe(true);
    expect(foes[0]!.body.facing.back).toBe(false);
  });
});

import { Battle } from '../battle/Battle';
import { Enemy } from '../battle/Enemy';
import { PartyMember, type HeroSpec, type MemberState } from '../battle/PartyMember';
import { Supplies, type SuppliesState } from '../battle/Supplies';
import type { Faction } from '../data/chapter1';
import type { EncounterSpec } from '../data/encounters';

/** 되돌릴 수 있도록 떠 둔 여정의 상태. 전투에서 지면 이 상태로 돌아간다. */
export interface CampaignState {
  readonly stage: number;
  readonly choice: Faction | null;
  readonly supplies: SuppliesState;
  readonly party: readonly MemberState[];
}

/** 첫 선택이 주는 보탬. */
const CHOICE_POTIONS = 2;
const CHOICE_BARRIER = 8;
const CHOICE_GOLD = 60;

/**
 * 한 번의 여정: 일행, 물자, 진행 단계, 첫 선택을 맡는다.
 * 전투를 열고 보상을 나눠 주는 일도 여기서 하므로, 화면 쪽은 수치를 직접 만지지 않는다.
 */
export class Campaign {
  readonly party: readonly PartyMember[];
  readonly supplies: Supplies;
  private stageValue = 0;
  private choiceValue: Faction | null = null;

  constructor(heroes: readonly HeroSpec[], supplies: SuppliesState) {
    this.party = heroes.map((spec) => new PartyMember(spec));
    this.supplies = new Supplies(supplies);
  }

  /** 진행 단계. 0 기록관을 만나기 전, 1 선택을 마침, 2 첫 전투 승리, 3 보스 처치. */
  get stage(): number {
    return this.stageValue;
  }

  get choice(): Faction | null {
    return this.choiceValue;
  }

  /** 누구의 지원을 받을지 정한다. 한 번만 고를 수 있다. */
  choose(faction: Faction): boolean {
    if (this.stageValue !== 0) return false;
    this.choiceValue = faction;
    this.stageValue = 1;
    if (faction === 'human') this.supplies.add({ potions: CHOICE_POTIONS });
    if (faction === 'wolf') for (const member of this.party) member.fortify(CHOICE_BARRIER);
    if (faction === 'vampire') this.supplies.add({ gold: CHOICE_GOLD });
    return true;
  }

  /** 전투 한 판을 연다. */
  engage(encounter: EncounterSpec): Battle {
    return new Battle(
      this.party,
      encounter.enemies.map((spec) => new Enemy(spec)),
      this.supplies,
    );
  }

  /** 이긴 전투의 보상을 받는다. 경험치가 모이면 레벨이 오르고, 모두 회복한다. */
  claim(battle: Battle, encounter: EncounterSpec): boolean {
    if (battle.phase !== 'victory') return false;
    const { gold, shards, potions, xp } = encounter.reward;
    this.supplies.add({ gold, shards, potions });
    for (const member of this.party) {
      member.gainXp(xp);
      member.recover();
    }
    this.stageValue = encounter.nextStage;
    return true;
  }

  save(): CampaignState {
    return {
      stage: this.stageValue,
      choice: this.choiceValue,
      supplies: this.supplies.save(),
      party: this.party.map((member) => member.save()),
    };
  }

  load(state: CampaignState): void {
    this.stageValue = state.stage;
    this.choiceValue = state.choice;
    this.supplies.load(state.supplies);
    this.party.forEach((member, i) => member.load(state.party[i]!));
  }
}

import type { EnemySpec } from '../battle/Enemy';

/** 전투 한 판: 나오는 적, 이겼을 때의 보상, 이긴 뒤의 진행 단계. */
export interface EncounterSpec {
  readonly enemies: readonly EnemySpec[];
  readonly reward: { readonly gold: number; readonly shards: number; readonly potions: number; readonly xp: number };
  /** 이기면 넘어가는 진행 단계. */
  readonly nextStage: number;
}

/** 제1장의 전투 두 판. 수치는 3D 프로토타입(src/core/rules.js)과 같다. */
export const ENCOUNTERS = {
  /** 동력로 앞의 첫 전투. */
  sentinels: {
    enemies: [
      { id: 'e0', name: '폭주한 파수기', hp: 90, bp: 35, atk: 22, def: 4, spd: 11, startAp: 12 },
      { id: 'e1', name: '균열의 잔향', hp: 70, bp: 22, atk: 20, def: 3, spd: 14, startAp: 0 },
    ],
    reward: { gold: 120, shards: 4, potions: 2, xp: 100 },
    nextStage: 2,
  },
  /** 핵심부의 보스전. */
  bellkeeper: {
    enemies: [
      { id: 'e0', name: '재의 종지기', hp: 275, bp: 95, atk: 32, def: 8, spd: 15, startAp: 5, boss: true },
      { id: 'e1', name: '혈정석 파수기', hp: 98, bp: 36, atk: 23, def: 4, spd: 11, startAp: 0 },
    ],
    reward: { gold: 220, shards: 6, potions: 2, xp: 150 },
    nextStage: 3,
  },
} as const satisfies Record<string, EncounterSpec>;

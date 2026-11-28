import type { HeroSpec } from '../battle/PartyMember';
import { BarrierBreak, BasicAttack, Guard, Mend, Overload, PiercingDrain, Potion, RallyBarrier } from '../battle/commands';

/**
 * 주인공 세 사람의 레벨 1 수치와 명령. 수치는 3D 프로토타입(src/core/rules.js)과 같다.
 * 역할은 관통(리시엔), 파쇄(볼프), 수복(에다)이다.
 */
export const HERO_SPECS: readonly HeroSpec[] = [
  {
    id: 'vampire',
    name: '리시엔',
    role: '혈월의 귀족',
    hp: 112,
    bp: 40,
    mp: 38,
    atk: 22,
    mag: 25,
    def: 6,
    spd: 19,
    weapon: '가문의 레이피어',
    armor: '벨벳 예복',
    commands: [
      new BasicAttack(),
      new PiercingDrain('혈월 찌르기', 9, '배리어 관통 · 준 HP 피해의 40% 흡혈'),
      new RallyBarrier('붉은 서약', 12, '아군 전체 배리어 20 회복', 20),
      new Guard(),
      new Potion(),
    ],
  },
  {
    id: 'wolf',
    name: '볼프',
    role: '철랑의 장교',
    hp: 155,
    bp: 58,
    mp: 27,
    atk: 29,
    mag: 12,
    def: 10,
    spd: 13,
    weapon: '군용 대검',
    armor: '강철 장교복',
    commands: [
      new BasicAttack(),
      new BarrierBreak('강철 파쇄', 8, '배리어에 2.6배 피해 · 파괴 시 행동 지연'),
      new RallyBarrier('군단의 포효', 10, '아군 전체 배리어 16 회복 · 자신 방어', 16, true),
      new Guard(),
      new Potion(),
    ],
  },
  {
    id: 'human',
    name: '에다',
    role: '룬 기공사',
    hp: 104,
    bp: 34,
    mp: 52,
    atk: 18,
    mag: 31,
    def: 5,
    spd: 16,
    weapon: '룬 캐스터',
    armor: '기공사의 코트',
    commands: [
      new BasicAttack(),
      new Overload('룬 과부하', 10, '적 전체 마법 피해 · 적의 행동 게이지 감소'),
      new Mend('수복 술식', 12, '가장 위급한 동료 HP 48 회복 · 전투불능 소생', 48),
      new Guard(),
      new Potion(),
    ],
  },
];

/** 여정을 시작할 때 가진 물자. */
export const START_SUPPLIES = { gold: 180, shards: 5, potions: 5 } as const;

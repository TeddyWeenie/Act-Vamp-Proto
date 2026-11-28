import type { CharacterBody } from '../game/entities/Character';
import type { PropSite } from '../game/entities/Prop';
import type { Vec2 } from '../game/logic/view';
import type { PlaceholderFigure } from '../render/PlaceholderArt';

/**
 * 제1장 첫 전투까지의 무대 배치: 누가 어디에 서 있고, 어디에 다가가면 무슨 일이 일어나는지.
 * 그림은 아직 임시 그림이라 생김새(figure)를 여기서 정한다. 진짜 그림이 오면 figure 대신 그림 파일을 가리키게 바꾼다.
 * 좌표는 탑뷰 광장(data/town.ts의 TOWN_TOP) 기준이다.
 */

/** 서 있기만 하는 사람이나 물건. */
export interface FixtureSpec {
  readonly figure: PlaceholderFigure;
  /** 그림의 월드 높이. */
  readonly height: number;
  readonly site: PropSite;
}

/** 걸어 다니는 인물. */
export interface ActorSpec {
  /** 전투 수치와 짝짓는 이름. 아군은 HERO_SPECS의 id, 적은 전투의 적 id와 같다. */
  readonly id: string;
  readonly figure: PlaceholderFigure;
  readonly body: CharacterBody;
  readonly start: Vec2;
}

export interface CompanionSpec extends ActorSpec {
  /** 주인공을 따라 걸을 때 뒤처지는 거리. */
  readonly lag: number;
}

/** 광장 서쪽에 서 있는 기록관. */
export const ORIN: FixtureSpec & { readonly talkRadius: number; readonly prompt: string } = {
  figure: { label: '오린', kind: 'elder', fill: '#5a5470', trim: '#c9a66b' },
  height: 2.3,
  site: {
    x: -3.6,
    z: -2.6,
    block: { width: 0.9, depth: 0.5 },
    shadow: { width: 0.9, depth: 0.5, height: 1.5, round: true },
  },
  talkRadius: 2.4,
  prompt: '기록관 오린과 이야기하기',
};

/** 광장 동쪽의 동력로. 성문과 함께 2단계에서 제자리를 잡는다. */
export const REACTOR: FixtureSpec = {
  figure: { label: '동력로', kind: 'machine', fill: '#4b4660', trim: '#8a6f4a' },
  height: 4.4,
  site: {
    x: 12.8,
    z: -4.8,
    block: { width: 3.2, depth: 1.4 },
    shadow: { width: 3.2, depth: 1.4, height: 3.2 },
  },
};

/** 주인공과 함께 다니는 동료. 처음에는 오린 곁에 서 있다가, 첫 선택 뒤부터 따라 걷는다. */
export const COMPANIONS: readonly CompanionSpec[] = [
  {
    id: 'wolf',
    figure: { label: '볼프', kind: 'person', fill: '#6c7480', trim: '#3d434c' },
    body: { speed: 4.1, radius: 0.45, height: 2.6 },
    start: { x: -5.5, z: -1.3 },
    lag: 1.7,
  },
  {
    id: 'human',
    figure: { label: '에다', kind: 'person', fill: '#b9853f', trim: '#5c8f8a' },
    body: { speed: 4.1, radius: 0.42, height: 2.2 },
    start: { x: -1.9, z: -3.0 },
    lag: 3.1,
  },
];

/** 동력로 앞을 지키는 적. 첫 선택 뒤에 나타나고, 가까이 가면 싸움이 붙는다. */
export const SENTINELS: readonly ActorSpec[] = [
  {
    id: 'e0',
    figure: { label: '파수기', kind: 'construct', fill: '#7a6a5a', trim: '#4a3f38' },
    body: { speed: 4.4, radius: 0.55, height: 2.9 },
    start: { x: 9.2, z: -1.2 },
  },
  {
    id: 'e1',
    figure: { label: '잔향', kind: 'wisp', fill: '#8d3f6e', trim: '#3a1f3f' },
    body: { speed: 4.8, radius: 0.45, height: 2.3 },
    start: { x: 9.9, z: -3.1 },
  },
];

/** 적 무리에 이만큼 다가가면 싸움이 붙는다. */
export const AMBUSH_RADIUS = 4.2;

/** 진행 단계마다 덧붙이는 길 안내. 마을 배치가 임시라서 대사에 나오는 방향과 다를 수 있어 따로 알려 준다. */
export const QUEST_HINTS: readonly string[] = [
  '오린은 광장 서쪽에 서 있습니다.',
  '동력로는 광장 동쪽 끝에 있습니다.',
  '지금 만든 분량은 여기까지입니다. 다음은 대장간과 핵심부 전투입니다.',
  '',
];

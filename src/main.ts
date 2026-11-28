import type { DebugProbe } from './game/DebugProbe';
import { GameFactory } from './game/GameFactory';
import { QuarterStaging } from './game/staging/QuarterStaging';
import type { Staging } from './game/staging/Staging';
import { TopStaging } from './game/staging/TopStaging';
import { TOWN_TOP_PROPS } from './data/town';
import { DEFAULT_FORMATION } from './game/logic/formation';
import { Chapter1Story } from './game/story/Chapter1Story';
import type { Story } from './game/story/Story';
import { BattleView } from './ui/BattleView';
import { DialogueView } from './ui/DialogueView';
import { PromptView } from './ui/PromptView';
import { QuestView } from './ui/QuestView';
import { ResultView } from './ui/ResultView';
import { AtmosphereLook } from './render/AtmosphereLook';
import { CartoonSceneLook } from './render/CartoonSceneLook';
import { FlatLook } from './render/FlatLook';
import { InkLook } from './render/InkLook';
import type { SceneLook } from './render/look';

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
const loading = document.querySelector<HTMLElement>('#loading')!;
const screens = document.querySelector<HTMLElement>('#ui')!;

const params = new URLSearchParams(location.search);
// 기본은 비스듬한 탑뷰 50도. &pitch=45처럼 내려다보는 각도를 바꿔 볼 수 있고, ?view=quarter를 붙이면 예전 45도 쿼터뷰로 비교해 볼 수 있다.
// 기본 화면은 "같은 빛과 같은 공기"를 덧입힌다: 그늘에서 어두워지는 캐릭터, 화면 전체 렌즈 효과, 빛 입자, 앞쪽 소품.
// ?air=off를 붙이면 그 효과와 소품을 빼고 비교해 볼 수 있다.
const air = params.get('air') !== 'off';
const staging = createStaging(params, air);
// 기본은 종이 오리기 화풍에 맞춰 테두리 선 없이 텍스처 색을 그대로 쓰는 화면.
// ?look=ink는 건물에 테두리 선을 두른 화면, ?look=cartoon은 카툰 렌더링 화면으로 비교해 볼 수 있다.
const base = createLook(params, staging.heroHeight);
const look = air ? new AtmosphereLook(base, staging.bounds) : base;

// 이야기는 기본 구도(탑뷰)의 마을 배치에 맞춰 놓았다. 예전 쿼터뷰는 비교용이라 빈 마을만 보여 준다.
const story = params.get('view') === 'quarter' ? null : createStory(screens);

new GameFactory(canvas, look, staging, story)
  .create()
  .then(({ game, debug }) => {
    game.start();
    loading.classList.add('done');
    if (params.has('debug')) {
      (window as unknown as { __game: DebugProbe }).__game = debug;
    }
  })
  .catch((error: unknown) => {
    console.error(error);
    loading.textContent = '불러오지 못했어요. 새로 고침해 주세요.';
  });

function createStaging(query: URLSearchParams, withProps: boolean): Staging {
  if (query.get('view') === 'quarter') return new QuarterStaging();
  const pitch = Number(query.get('pitch'));
  return new TopStaging(pitch >= 30 && pitch <= 80 ? pitch : undefined, withProps ? TOWN_TOP_PROPS : []);
}

function createStory(parent: HTMLElement): Story {
  return new Chapter1Story(
    {
      quest: new QuestView(parent, 'CHAPTER 1 · 재의 종소리'),
      prompt: new PromptView(parent),
      dialogue: new DialogueView(parent),
      battle: new BattleView(parent),
      result: new ResultView(parent),
    },
    // 전투 대형은 아군이 왼쪽, 적이 오른쪽에 선다(2026-11-28 확정).
    DEFAULT_FORMATION,
  );
}

function createLook(query: URLSearchParams, heroHeight: number): SceneLook {
  switch (query.get('look')) {
    case 'cartoon':
      return new CartoonSceneLook(heroHeight);
    case 'ink':
      return new InkLook(heroHeight);
    default:
      return new FlatLook();
  }
}

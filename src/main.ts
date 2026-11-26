import type { DebugProbe } from './game/DebugProbe';
import { GameFactory } from './game/GameFactory';
import { QuarterStaging } from './game/staging/QuarterStaging';
import type { Staging } from './game/staging/Staging';
import { TopStaging } from './game/staging/TopStaging';
import { heroColorLook, heroToneLook, softCartoonLook } from './render/cartoonStyles';
import { FlatLook } from './render/FlatLook';
import type { SceneLook } from './render/look';

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
const loading = document.querySelector<HTMLElement>('#loading')!;

const params = new URLSearchParams(location.search);
// 기본은 비스듬한 탑뷰 50도. &pitch=45처럼 내려다보는 각도를 바꿔 볼 수 있고, ?view=quarter를 붙이면 예전 45도 쿼터뷰로 비교해 볼 수 있다.
const staging = createStaging(params);
// 기본은 카툰 화면. 건물 색을 주인공 색 계열로 옮긴 시안은 ?look=tone(나무·벽·돌)과 ?look=crimson(지붕까지)으로,
// 꾸밈 없는 화면은 ?look=flat으로 비교해 볼 수 있다.
const look = createLook(params.get('look'), staging.heroHeight);

new GameFactory(canvas, look, staging)
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

function createLook(name: string | null, heroHeight: number): SceneLook {
  if (name === 'flat') return new FlatLook();
  if (name === 'tone') return heroToneLook(heroHeight);
  if (name === 'crimson') return heroColorLook(heroHeight);
  return softCartoonLook(heroHeight);
}

function createStaging(query: URLSearchParams): Staging {
  if (query.get('view') === 'quarter') return new QuarterStaging();
  const pitch = Number(query.get('pitch'));
  return new TopStaging(pitch >= 30 && pitch <= 80 ? pitch : undefined);
}

import type { DebugProbe } from './game/DebugProbe';
import { GameFactory } from './game/GameFactory';
import { QuarterStaging } from './game/staging/QuarterStaging';
import type { Staging } from './game/staging/Staging';
import { TopStaging } from './game/staging/TopStaging';
import { CartoonSceneLook } from './render/CartoonSceneLook';
import { FlatLook } from './render/FlatLook';
import { InkLook } from './render/InkLook';
import type { SceneLook } from './render/look';

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
const loading = document.querySelector<HTMLElement>('#loading')!;

const params = new URLSearchParams(location.search);
// 기본은 비스듬한 탑뷰 50도. &pitch=45처럼 내려다보는 각도를 바꿔 볼 수 있고, ?view=quarter를 붙이면 예전 45도 쿼터뷰로 비교해 볼 수 있다.
const staging = createStaging(params);
// 기본은 텍스처 색 그대로에 건물 테두리 선만 두른 화면. ?look=flat은 선이 없는 화면, ?look=cartoon은 카툰 렌더링 화면으로 비교해 볼 수 있다.
const look = createLook(params, staging.heroHeight);

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

function createStaging(query: URLSearchParams): Staging {
  if (query.get('view') === 'quarter') return new QuarterStaging();
  const pitch = Number(query.get('pitch'));
  return new TopStaging(pitch >= 30 && pitch <= 80 ? pitch : undefined);
}

function createLook(query: URLSearchParams, heroHeight: number): SceneLook {
  switch (query.get('look')) {
    case 'cartoon':
      return new CartoonSceneLook(heroHeight);
    case 'flat':
      return new FlatLook();
    default:
      return new InkLook(heroHeight);
  }
}

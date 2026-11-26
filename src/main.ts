import type { DebugProbe } from './game/DebugProbe';
import { GameFactory } from './game/GameFactory';
import { QuarterStaging } from './game/staging/QuarterStaging';
import type { Staging } from './game/staging/Staging';
import { TopStaging } from './game/staging/TopStaging';
import { CartoonSceneLook } from './render/CartoonSceneLook';
import { FlatLook } from './render/FlatLook';

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
const loading = document.querySelector<HTMLElement>('#loading')!;

const params = new URLSearchParams(location.search);
// 기본은 비스듬한 탑뷰 50도. &pitch=45처럼 내려다보는 각도를 바꿔 볼 수 있고, ?view=quarter를 붙이면 예전 45도 쿼터뷰로 비교해 볼 수 있다.
const staging = createStaging(params);
// 기본은 카툰 효과를 입히지 않은 화면. 주소에 ?look=cartoon을 붙이면 카툰 렌더링 화면으로 비교해 볼 수 있다.
const look = params.get('look') === 'cartoon' ? new CartoonSceneLook(staging.heroHeight) : new FlatLook();

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

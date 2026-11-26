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
// 기본은 45도 쿼터뷰. 주소에 ?view=top을 붙이면 비스듬한 탑뷰 시안으로 바뀐다(&pitch=55처럼 내려다보는 각도를 바꿔 볼 수 있다).
const staging = createStaging(params);
// 기본은 카툰 화면. 주소에 ?look=flat을 붙이면 꾸밈 없는 화면으로 비교해 볼 수 있다.
const look = params.get('look') === 'flat' ? new FlatLook() : new CartoonSceneLook(staging.heroHeight);

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
  if (query.get('view') !== 'top') return new QuarterStaging();
  const pitch = Number(query.get('pitch'));
  return new TopStaging(pitch >= 30 && pitch <= 80 ? pitch : undefined);
}

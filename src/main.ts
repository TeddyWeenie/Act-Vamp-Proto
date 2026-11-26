import { LUCIEN } from './data/sprites';
import type { DebugProbe } from './game/DebugProbe';
import { GameFactory } from './game/GameFactory';
import { CartoonSceneLook } from './render/CartoonSceneLook';
import { FlatLook } from './render/FlatLook';

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
const loading = document.querySelector<HTMLElement>('#loading')!;

const params = new URLSearchParams(location.search);
// 기본은 카툰 화면. 주소에 ?look=flat을 붙이면 꾸밈 없는 화면으로 비교해 볼 수 있다.
const look = params.get('look') === 'flat' ? new FlatLook() : new CartoonSceneLook(LUCIEN.height);

new GameFactory(canvas, look)
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

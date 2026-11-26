import type { DebugProbe } from './game/DebugProbe';
import { GameFactory } from './game/GameFactory';

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
const loading = document.querySelector<HTMLElement>('#loading')!;

new GameFactory(canvas)
  .create()
  .then(({ game, debug }) => {
    game.start();
    loading.classList.add('done');
    if (new URLSearchParams(location.search).has('debug')) {
      (window as unknown as { __game: DebugProbe }).__game = debug;
    }
  })
  .catch((error: unknown) => {
    console.error(error);
    loading.textContent = '불러오지 못했어요. 새로 고침해 주세요.';
  });

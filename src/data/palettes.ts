import type { ColorSwap } from '../render/colorMath';

/**
 * 건물 텍스처의 색 계열을 리시엔 그림의 색 계열로 옮기는 짝.
 *
 * 재 본 결과(2026-11-26): 건물 텍스처는 나무, 벽, 돌이 모두 노란 갈색 쪽이고,
 * 리시엔 그림은 어두운 색이 와인빛 갈색(#573f42), 밝은 색이 분홍빛 크림(#ead3d3), 중간이 회보라(#9a7b81)다.
 * 그래서 계열마다 노란 기를 빼고 붉은 기를 더한다. from은 텍스처에서 잰 색, to는 같은 밝기의 리시엔 계열 색이다.
 */
export const HERO_TONE_SWAPS: readonly ColorSwap[] = [
  // 나무 기둥과 문: 주황 갈색 → 장갑·장화의 와인빛 갈색
  { from: 0x2d1f14, to: 0x2f1b27 },
  { from: 0x4d3420, to: 0x4f3036 },
  { from: 0x684b33, to: 0x6b474a },
  { from: 0x7e5c41, to: 0x815859 },
  // 회벽: 누런 크림 → 머리카락·크라바트의 분홍빛 크림(조금 더 밝게)
  { from: 0xb59e7f, to: 0xc1aba2 },
  { from: 0xc4ab95, to: 0xd0b8b8 },
  { from: 0xdcbfa4, to: 0xe8ccc8 },
  { from: 0xe6c9b0, to: 0xf2d6d4 },
  // 돌: 누런 회색 → 머리카락 그늘의 회보라(조금만)
  { from: 0x646568, to: 0x696472 },
  { from: 0x8b8073, to: 0x907f7d },
  { from: 0xa09283, to: 0xa5918e },
  // 창문 불빛: 코트 장식의 금색
  { from: 0xf3ad59, to: 0xf8b651 },
];

/**
 * 지붕까지 옮기는 짝: 청회색 기와 → 코트의 진홍(#902131).
 * 기와의 밝기는 그대로 두고 색 기운만 바꾸며, 어두운 곳부터 밝은 곳까지 여섯 단계로 잡는다.
 */
export const HERO_ROOF_SWAPS: readonly ColorSwap[] = [
  { from: 0x1b1d2a, to: 0x3b080f },
  { from: 0x303543, to: 0x62131f },
  { from: 0x3e4655, to: 0x7d1b29 },
  { from: 0x4a5363, to: 0x932232 },
  { from: 0x596270, to: 0xab293c },
  { from: 0x767d8a, to: 0xcd4856 },
];

/** 말하는 사람 이름의 첫머리로 초상화를 고른다. 대사의 이름에는 "리시엔 · 혈월의 귀족"처럼 소개가 붙기도 한다. */
const PORTRAITS: readonly (readonly [string, string])[] = [
  ['리시엔', '/assets/portraits/lucien.png'],
  ['볼프', '/assets/portraits/wolf.png'],
  ['에다', '/assets/portraits/eda.png'],
  ['기록관 오린', '/assets/portraits/orin.png'],
];

export function portraitFor(speaker: string): string | null {
  return PORTRAITS.find(([name]) => speaker.startsWith(name))?.[1] ?? null;
}

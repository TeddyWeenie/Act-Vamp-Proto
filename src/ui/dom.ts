/** 태그와 클래스 이름으로 요소를 만든다. 화면 클래스들이 HTML을 문자열로 이어 붙이지 않게 한다. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** 키보드의 숫자 키(윗줄과 숫자판)를 0부터 세는 순번으로 바꾼다. 숫자 키가 아니면 -1. */
export function digitIndex(code: string): number {
  const match = /^(?:Digit|Numpad)([1-9])$/.exec(code);
  return match ? Number(match[1]) - 1 : -1;
}

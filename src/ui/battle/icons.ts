import type { CommandId } from '../../battle/commands';
import { el } from '../dom';

/** 명령의 자리마다 붙는 작은 그림. 선으로만 그려서 글자색을 따라간다. */
const SHAPES: Readonly<Record<CommandId, string>> = {
  attack: '<path d="M19 4 9.5 13.5M19 4h-3.2M19 4v3.2M7 12l5 5M8.6 15.4 5 19"/>',
  skill: '<path d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/>',
  support: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>',
  guard: '<path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z"/>',
  potion: '<path d="M10 3h4M10.5 3v5L6 18a2 2 0 0 0 1.8 3h8.4a2 2 0 0 0 1.8-3L13.5 8V3M8 15h8"/>',
};

/** 명령 아이콘을 담은 요소를 만든다. */
export function commandIcon(id: CommandId, className: string): HTMLElement {
  const holder = el('span', className);
  holder.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SHAPES[id]}</svg>`;
  return holder;
}

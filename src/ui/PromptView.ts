import type { PromptScreen } from '../game/story/screens';
import { el } from './dom';

/** 말을 걸 수 있는 사람 가까이에서 뜨는 짧은 안내("E 기록관 오린과 이야기하기"). */
export class PromptView implements PromptScreen {
  private readonly box = el('div', 'prompt panel');
  private readonly label = el('span');
  private shown: string | null = null;

  constructor(parent: HTMLElement) {
    this.box.append(el('kbd', '', 'E'), this.label);
    this.box.hidden = true;
    parent.append(this.box);
  }

  show(text: string | null): void {
    if (text === this.shown) return;
    this.shown = text;
    this.box.hidden = text === null;
    this.label.textContent = text ?? '';
  }
}

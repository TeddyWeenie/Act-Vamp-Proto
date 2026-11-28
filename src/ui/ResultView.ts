import type { ResultContent, ResultScreen } from '../game/story/screens';
import { el } from './dom';

const CLOSE_KEYS = new Set(['Space', 'Enter', 'KeyE']);
/** 전투 중에 누르던 키로 곧바로 닫히지 않도록, 뜬 뒤 이만큼은 키 입력을 받지 않는다(ms). */
const KEY_GUARD_MS = 500;

/** 화면 가운데에 뜨는 결과 카드. 전투에서 이기거나 졌을 때 한 번 읽고 넘긴다. */
export class ResultView implements ResultScreen {
  private readonly layer = el('div', 'result layer');
  private readonly title = el('small', 'result-title');
  private readonly heading = el('h2', 'result-heading');
  private readonly body = el('p', 'result-body');
  private readonly note = el('p', 'result-note');
  private readonly button = el('button', 'result-button');
  private onClose: (() => void) | null = null;
  private shownAt = 0;

  constructor(parent: HTMLElement) {
    const card = el('div', 'result-card panel');
    this.button.type = 'button';
    card.append(this.title, this.heading, this.body, this.note, this.button);
    this.layer.append(card);
    this.layer.hidden = true;
    parent.append(this.layer);

    this.button.addEventListener('click', () => this.close());
    window.addEventListener('keydown', this.onKey);
  }

  present(content: ResultContent, onClose: () => void): void {
    this.title.textContent = content.title;
    this.heading.textContent = content.heading;
    this.body.textContent = content.body;
    this.note.textContent = content.note ?? '';
    this.note.hidden = !content.note;
    this.button.replaceChildren(el('kbd', '', 'Enter'), content.button);
    this.onClose = onClose;
    this.shownAt = performance.now();
    this.layer.hidden = false;
  }

  private readonly onKey = (event: KeyboardEvent): void => {
    if (!this.onClose || event.repeat || !CLOSE_KEYS.has(event.code)) return;
    if (performance.now() - this.shownAt < KEY_GUARD_MS) return;
    this.close();
  };

  private close(): void {
    const done = this.onClose;
    if (!done) return;
    this.onClose = null;
    this.layer.hidden = true;
    done();
  }
}

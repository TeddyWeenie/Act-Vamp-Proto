import type { QuestContent, QuestScreen } from '../game/story/screens';
import { el } from './dom';

/** 화면 왼쪽 위에서 지금 할 일을 알려 준다. */
export class QuestView implements QuestScreen {
  private readonly title = el('h2', 'quest-title');
  private readonly text = el('p', 'quest-text');
  private readonly objective = el('p', 'quest-objective');
  private readonly hint = el('p', 'quest-hint');

  constructor(parent: HTMLElement, chapter: string) {
    const box = el('div', 'quest');
    box.append(el('small', 'quest-chapter', chapter), this.title, this.text, this.objective, this.hint);
    parent.append(box);
  }

  show(quest: QuestContent): void {
    this.title.textContent = quest.title;
    this.text.textContent = quest.text;
    this.objective.textContent = `▸ ${quest.objective}`;
    this.hint.textContent = quest.hint ?? '';
    this.hint.hidden = !quest.hint;
  }
}

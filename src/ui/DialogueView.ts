import { portraitFor } from '../data/portraits';
import type { DialogueScreen } from '../game/story/screens';
import type { Conversation } from '../story/Conversation';
import { digitIndex, el } from './dom';

const ADVANCE_KEYS = new Set(['Space', 'Enter', 'KeyE']);

/**
 * 화면 아래에 뜨는 대화창. 초상화, 이름, 대사를 보여 주고, 선택지가 있으면 고르게 한다.
 * Space·Enter·E나 클릭으로 넘기고, 선택지는 숫자 키나 클릭으로 고른다.
 * 대화가 어디까지 왔는지는 Conversation이 알고, 이 클래스는 그것을 그리기만 한다.
 */
export class DialogueView implements DialogueScreen {
  private readonly layer = el('div', 'dialogue layer');
  private readonly portrait = el('img', 'dialogue-portrait');
  private readonly speaker = el('p', 'dialogue-speaker');
  private readonly line = el('p', 'dialogue-line');
  private readonly choices = el('div', 'dialogue-choices');
  private readonly more = el('p', 'dialogue-more');
  private talk: Conversation | null = null;
  private onClose: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    const box = el('div', 'dialogue-box panel');
    const body = el('div', 'dialogue-body');
    this.portrait.alt = '';
    this.more.append(el('kbd', '', 'Space'), ' 다음');
    body.append(this.speaker, this.line, this.choices, this.more);
    box.append(this.portrait, body);
    this.layer.append(box);
    this.layer.hidden = true;
    parent.append(this.layer);

    this.layer.addEventListener('click', () => this.advance());
    window.addEventListener('keydown', this.onKey);
  }

  present(talk: Conversation, onClose: () => void): void {
    this.talk = talk;
    this.onClose = onClose;
    this.layer.hidden = false;
    this.render();
  }

  private readonly onKey = (event: KeyboardEvent): void => {
    if (!this.talk || event.repeat) return;
    if (ADVANCE_KEYS.has(event.code)) {
      this.advance();
      return;
    }
    const choice = this.talk.choices[digitIndex(event.code)];
    if (choice) this.choose(choice.id);
  };

  private advance(): void {
    if (!this.talk || this.talk.choices.length > 0) return;
    this.talk.advance();
    this.settle();
  }

  private choose(id: Parameters<Conversation['choose']>[0]): void {
    if (!this.talk?.choose(id)) return;
    this.settle();
  }

  /** 넘긴 뒤의 정리: 끝났으면 닫고, 아니면 다음 대사를 그린다. */
  private settle(): void {
    if (!this.talk) return;
    if (!this.talk.finished) {
      this.render();
      return;
    }
    const done = this.onClose;
    this.talk = null;
    this.onClose = null;
    this.layer.hidden = true;
    done?.();
  }

  private render(): void {
    const talk = this.talk;
    if (!talk) return;
    const { name, text } = talk.line;
    const portrait = portraitFor(name);
    this.portrait.hidden = !portrait;
    if (portrait) this.portrait.src = portrait;
    this.speaker.textContent = name;
    this.line.textContent = text;

    this.choices.replaceChildren(
      ...talk.choices.map((choice, i) => {
        const button = el('button', 'dialogue-choice');
        button.type = 'button';
        button.append(
          el('kbd', '', String(i + 1)),
          el('strong', '', choice.text),
          el('small', '', choice.effect),
        );
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          this.choose(choice.id);
        });
        return button;
      }),
    );
    this.more.hidden = talk.choices.length > 0;
  }
}

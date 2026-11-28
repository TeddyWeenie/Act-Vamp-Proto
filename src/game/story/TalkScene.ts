import type { Choice, Line } from '../../data/chapter1';
import { Conversation } from '../../story/Conversation';
import type { StoryScene } from './scene';
import type { DialogueScreen } from './screens';

/** 대화 한 묶음을 보여 주는 장면. 끝나면 고른 선택을 넘겨 다음 장면을 정하게 한다. */
export class TalkScene implements StoryScene {
  private readonly talk: Conversation;
  private closed = false;

  constructor(
    private readonly screen: DialogueScreen,
    lines: readonly Line[],
    private readonly after: (choice: Choice | null) => StoryScene | null = () => null,
  ) {
    this.talk = new Conversation(lines);
  }

  get finished(): boolean {
    return this.closed;
  }

  begin(): void {
    this.screen.present(this.talk, () => {
      this.closed = true;
    });
  }

  update(_dt: number): void {}

  next(): StoryScene | null {
    return this.after(this.talk.choice);
  }
}

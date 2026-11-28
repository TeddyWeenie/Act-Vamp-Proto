import type { StoryScene } from './scene';
import type { ResultContent, ResultScreen } from './screens';

/** 결과 화면 한 장을 보여 주는 장면. 닫으면 끝난다. */
export class ResultScene implements StoryScene {
  private closed = false;

  constructor(
    private readonly screen: ResultScreen,
    private readonly content: ResultContent,
    private readonly after: () => StoryScene | null = () => null,
  ) {}

  get finished(): boolean {
    return this.closed;
  }

  begin(): void {
    this.screen.present(this.content, () => {
      this.closed = true;
    });
  }

  update(_dt: number): void {}

  next(): StoryScene | null {
    return this.after();
  }
}

import type { Choice, Line } from '../data/chapter1';

/**
 * 대화 한 묶음의 진행. 지금 보여 줄 대사가 무엇인지, 선택이 필요한지, 끝났는지를 안다.
 * 화면에 어떻게 그릴지는 모르므로 브라우저 없이 검사할 수 있다.
 */
export class Conversation {
  private index = 0;
  private picked: Choice | null = null;
  private over: boolean;

  constructor(private readonly lines: readonly Line[]) {
    this.over = lines.length === 0;
  }

  get line(): Line {
    return this.lines[Math.min(this.index, this.lines.length - 1)]!;
  }

  /** 지금 대사에서 골라야 할 선택지. 없으면 빈 목록. */
  get choices(): readonly Choice[] {
    return this.picked ? [] : (this.line.choices ?? []);
  }

  get finished(): boolean {
    return this.over;
  }

  /** 플레이어가 고른 선택. 아직 고르지 않았으면 null. */
  get choice(): Choice | null {
    return this.picked;
  }

  /** 다음 대사로 넘어간다. 선택을 기다리는 중이면 넘어가지 않는다. */
  advance(): boolean {
    if (this.over || this.choices.length > 0) return false;
    if (this.index >= this.lines.length - 1) {
      this.over = true;
      return true;
    }
    this.index += 1;
    this.picked = null;
    return true;
  }

  /** 선택지를 고르고 다음으로 넘어간다. */
  choose(id: Choice['id']): boolean {
    const found = this.choices.find((choice) => choice.id === id);
    if (!found) return false;
    this.picked = found;
    this.advance();
    return true;
  }
}

import type { Battle } from '../../battle/Battle';
import type { Enemy } from '../../battle/Enemy';
import type { PartyMember } from '../../battle/PartyMember';
import type { Supplies } from '../../battle/Supplies';
import type { CommandId } from '../../battle/commands';
import type { Conversation } from '../../story/Conversation';
import type { ScreenPoint } from '../capabilities';

/**
 * 장면이 플레이어에게 보여 주고 입력을 받는 화면들의 약속.
 * 장면은 이 약속에만 기대므로, 화면을 HTML로 그리든 다른 방법으로 그리든 장면 코드는 그대로다.
 */

/** 대사와 선택지를 보여 주는 화면. 대화를 끝까지 넘기면 onClose를 부른다. */
export interface DialogueScreen {
  present(talk: Conversation, onClose: () => void): void;
}

export interface ResultContent {
  readonly title: string;
  readonly heading: string;
  readonly body: string;
  readonly note?: string;
  /** 닫는 단추에 적는 말. */
  readonly button: string;
}

/** 전투 결과처럼 한 번 읽고 넘기는 화면. */
export interface ResultScreen {
  present(content: ResultContent, onClose: () => void): void;
}

/** "E 말 걸기" 같은 짧은 안내. null이면 감춘다. */
export interface PromptScreen {
  show(text: string | null): void;
}

export interface QuestContent {
  readonly title: string;
  readonly text: string;
  readonly objective: string;
  /** 어디로 가면 되는지 같은 덧붙이는 안내. */
  readonly hint?: string;
}

/** 지금 할 일을 알려 주는 화면. */
export interface QuestScreen {
  show(quest: QuestContent): void;
}

/** 전투 화면이 플레이어의 입력을 전하는 곳. */
export interface BattleOrders {
  command(id: CommandId): void;
  aim(enemy: Enemy): void;
}

export type FloatKind = 'damage' | 'barrier' | 'heal' | 'note';
export type MarkKind = 'target' | 'active';

/** 전투의 수치, 명령 메뉴, 머리 위 숫자를 보여 주는 화면. */
export interface BattleScreen {
  open(battle: Battle, supplies: Supplies, orders: BattleOrders): void;
  /** 차례가 온 아군의 명령 메뉴를 연다. null이면 닫는다. */
  offer(member: PartyMember | null): void;
  say(text: string): void;
  /** 화면의 한 점에서 떠오르는 글자(피해량, 회복량). */
  float(text: string, kind: FloatKind, at: ScreenPoint): void;
  /** 겨눈 적이나 차례가 온 아군의 머리 위 표시. null이면 감춘다. */
  mark(kind: MarkKind, at: ScreenPoint | null): void;
  /** 수치를 다시 읽어 막대를 고친다. */
  refresh(): void;
  close(): void;
}

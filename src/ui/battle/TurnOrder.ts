import type { Combatant } from '../../battle/Combatant';
import { el } from '../dom';

/**
 * 행동 순서 띠. 지금 차례인 사람과 그다음에 행동할 사람들을 한 줄로 보여 준다.
 * 이름표마다 행동 게이지를 그려 눈으로 견주게 하는 대신, 견준 결과를 보여 주는 것이다.
 * 초상화가 생기기 전까지는 이름의 첫 글자를 동그라미에 적는다.
 */
export class TurnOrder {
  readonly root = el('div', 'battle-order');
  private shown = '';

  /** order의 맨 앞이 가장 먼저 행동한다. acting이면 맨 앞 사람이 지금 명령을 고르는 중이다. */
  show(order: readonly Combatant[], allies: ReadonlySet<Combatant>, acting: boolean): void {
    const key = `${acting}:${order.map((who) => who.id).join(',')}`;
    if (key === this.shown) return;
    this.shown = key;
    const [first, ...rest] = order;
    const nodes: HTMLElement[] = [];
    if (first && acting) nodes.push(el('span', '', '지금'), this.token(first, allies, true));
    const waiting = acting ? rest : order;
    if (waiting.length > 0) {
      nodes.push(el('span', 'battle-order-next', acting ? '▸ 다음' : '다음'));
      nodes.push(...waiting.map((who) => this.token(who, allies, false)));
    }
    this.root.replaceChildren(...nodes);
  }

  private token(who: Combatant, allies: ReadonlySet<Combatant>, now: boolean): HTMLElement {
    const node = el('span', `battle-order-who ${allies.has(who) ? 'ally' : 'foe'}`, who.name.charAt(0));
    node.classList.toggle('now', now);
    node.title = who.name;
    return node;
  }
}

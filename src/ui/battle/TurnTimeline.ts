import type { Combatant } from '../../battle/Combatant';
import { el } from '../dom';

/** 시간 막대가 읽는 전투의 상태. Battle이 그대로 맞춘다. */
export interface TimelineSource {
  /** 행동 게이지가 얼마나 찼는지(0~1). */
  readiness(who: Combatant): number;
  /** 명령을 기다리는 아군. 있으면 시간이 멈춰 있다. */
  readonly active: Combatant | null;
  /** 전투가 흐른 시간(초). 늘고 있으면 시간이 흐르는 중이다. */
  readonly clock: number;
  /** 앞으로 행동할 순서. */
  upcoming(count: number): Combatant[];
}

/** 게이지가 이만큼보다 더 줄면 뒤로 밀린 것으로 본다. */
const SETBACK = 0.04;
/** 뒤로 밀리는 모습과 "지연" 표시를 보여 주는 시간(밀리초). */
const SETBACK_MS = 1400;
/** 시간 막대의 길이(em). style.css의 .timeline-track 너비와 같아야 한다. */
const TRACK_EM = 30;
/** 같은 쪽 말끼리 겹치지 않게 벌려 두는 최소 간격(em). */
const SPACING_EM = 2.05;

/**
 * 시간 막대 위의 말 하나. 행동 게이지가 찬 만큼 막대 위를 오른쪽으로 나아가고,
 * 오른쪽 끝의 "행동" 문에 닿으면 행동한다. 행동하고 나면 왼쪽 끝으로 돌아가고,
 * 행동 지연을 맞으면 뒤로 밀리면서 "지연"이 뜬다.
 */
class TimelineToken {
  readonly root: HTMLElement;
  private readonly delayTag = el('em', 'timeline-delay', '지연');
  private last = -1;
  private settleAt = 0;

  constructor(
    readonly who: Combatant,
    readonly side: 'ally' | 'foe',
  ) {
    this.root = el('span', `timeline-token ${side}`);
    this.root.title = who.name;
    this.root.append(el('b', '', who.name.charAt(0)), this.delayTag);
    this.delayTag.hidden = true;
  }

  /** 마지막으로 읽은 게이지 비율(0~1). */
  get fraction(): number {
    return Math.max(0, this.last);
  }

  /** 막대 위의 가로 자리(픽셀)를 정한다. */
  moveTo(x: number): void {
    this.root.style.setProperty('--x', `${x.toFixed(1)}px`);
  }

  /** 게이지가 찬 비율(0~1)을 읽어 표시를 고친다. now는 지금 시각(밀리초). 자리는 moveTo가 정한다. */
  read(fraction: number, now: number, state: { acting: boolean; next: boolean }): void {
    const { root, who } = this;
    if (this.last >= 0 && fraction < this.last - SETBACK) {
      this.settleAt = now + SETBACK_MS;
      // 0까지 내려간 것은 행동을 마친 것이고, 그 사이에서 멈춘 것은 밀린 것이다.
      this.delayTag.hidden = fraction <= 0.001;
    }
    const moving = now < this.settleAt;
    if (!moving) this.delayTag.hidden = true;
    root.classList.toggle('settling', moving);
    this.last = fraction;
    root.style.zIndex = String(Math.round(fraction * 100) + (state.acting ? 200 : 0));
    root.classList.toggle('acting', state.acting);
    root.classList.toggle('next', state.next);
    root.classList.toggle('close', !state.acting && fraction > 0.82);
    root.classList.toggle('down', !who.alive);
  }
}

/**
 * 시간 막대. 액티브 턴이 눈에 보이도록, 모두의 행동 게이지를 한 줄의 시간 위에 늘어놓는다.
 * 아군은 막대 위쪽, 적은 아래쪽을 달리고, 시간이 흐르는 동안 저마다의 빠르기로 "행동" 문을 향해 나아간다.
 * 아군이 문에 닿으면 시간이 멈추고 명령을 기다린다. 왼쪽의 표시가 지금 시간이 흐르는지 멈췄는지 알려 준다.
 */
export class TurnTimeline {
  readonly root = el('div', 'timeline');
  private readonly state = el('span', 'timeline-state');
  private readonly track = el('div', 'timeline-track');
  private tokens: TimelineToken[] = [];
  private lastClock = -1;
  private flowingUntil = 0;

  constructor() {
    const gate = el('span', 'timeline-gate');
    gate.append(el('small', '', '행동'));
    this.track.append(el('span', 'timeline-line'), gate);
    this.root.append(this.state, this.track);
  }

  /** 싸우는 사람들의 말을 놓는다. allies에 든 사람은 위쪽, 나머지는 아래쪽을 달린다. */
  open(everyone: readonly Combatant[], allies: ReadonlySet<Combatant>): void {
    this.tokens = everyone.map((who) => new TimelineToken(who, allies.has(who) ? 'ally' : 'foe'));
    this.track.querySelectorAll('.timeline-token').forEach((node) => node.remove());
    this.track.append(...this.tokens.map((token) => token.root));
    this.lastClock = -1;
  }

  /** 매 프레임 게이지를 다시 읽어 말을 옮기고, 시간이 흐르는지 멈췄는지 보여 준다. */
  update(source: TimelineSource, now = performance.now()): void {
    const { active, clock } = source;
    // 행동 연출 사이사이 한두 프레임 쉬는 것은 흐르는 것으로 친다.
    if (this.lastClock >= 0 && clock > this.lastClock) this.flowingUntil = now + 150;
    this.lastClock = clock;
    const flowing = !active && now < this.flowingUntil;
    const mode = active ? 'paused' : flowing ? 'flowing' : 'acting';
    if (this.root.dataset.mode !== mode) {
      this.root.dataset.mode = mode;
      this.state.textContent = active ? '❚❚ 시간 정지' : flowing ? '▶ 시간 흐름' : '● 행동 중';
    }
    const order = source.upcoming(2).filter((who) => who !== active);
    const next = order[0] ?? null;
    for (const token of this.tokens) {
      token.root.hidden = !token.who.alive && token.side === 'foe';
      token.read(source.readiness(token.who), now, {
        acting: token.who === active,
        next: token.who === next,
      });
    }
    const width = this.track.clientWidth;
    this.lay(width, width / TRACK_EM, 'ally');
    this.lay(width, width / TRACK_EM, 'foe');
  }

  /**
   * 한쪽(아군 또는 적)의 말을 게이지 순서대로 늘어놓는다. 게이지가 거의 같아 겹치는 말은
   * 말 하나 너비만큼 벌리고, 문을 넘어가면 문 앞으로 줄을 세운다. 순서는 바뀌지 않는다.
   */
  private lay(width: number, em: number, side: 'ally' | 'foe'): void {
    const row = this.tokens
      .filter((token) => token.side === side && !token.root.hidden)
      .sort((a, b) => a.fraction - b.fraction);
    const gap = SPACING_EM * em;
    const xs = row.map((token) => token.fraction * width);
    for (let i = 1; i < xs.length; i++) xs[i] = Math.max(xs[i]!, xs[i - 1]! + gap);
    for (let i = xs.length - 1; i >= 0; i--) {
      const limit = i === xs.length - 1 ? width : xs[i + 1]! - gap;
      xs[i] = Math.min(xs[i]!, limit);
    }
    row.forEach((token, i) => token.moveTo(xs[i]!));
  }
}

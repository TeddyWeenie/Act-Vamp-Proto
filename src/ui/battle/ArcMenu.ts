import type { Command } from '../../battle/commands';
import { el } from '../dom';
import { commandIcon } from './icons';
import type { Spot } from './StatusPlate';

/** 부채꼴에 놓을 명령 하나와, 화면에 함께 적을 것. */
export interface ArcEntry {
  readonly command: Command;
  /** "MP 9"나 "5개 남음" 같은 비용 표시. */
  readonly cost: string;
  /** 지금 쓸 수 없어 흐리게 보일지. */
  readonly blocked: boolean;
}

/** 화면의 세로 범위(픽셀). */
export interface Band {
  readonly top: number;
  readonly bottom: number;
}

/** 가운데 명령이 몸에서 가장 멀리 나오는 거리와, 가운데에서 한 칸 멀어질 때마다 안으로 휘는 정도(em). */
const REACH = 3;
const BEND = 0.45;

/**
 * 부채꼴 명령 메뉴. 차례가 온 캐릭터의 앞쪽(적을 바라보는 쪽)에 명령들이 호를 그리며 펼쳐진다.
 * 이름은 늘 보이고, 가리키고 있는 명령만 설명이 펼쳐진다.
 * 무엇을 가리키고 있는지는 밖에서 알려 주고(highlight), 이 클래스는 그리기와 마우스 입력 전달만 한다.
 */
export class ArcMenu {
  readonly root = el('div', 'arc');
  private leaves: HTMLButtonElement[] = [];

  constructor(
    private readonly onPoint: (index: number) => void,
    private readonly onPick: (index: number) => void,
  ) {
    this.root.hidden = true;
  }

  open(entries: readonly ArcEntry[]): void {
    const middle = (entries.length - 1) / 2;
    this.leaves = entries.map((entry, i) => {
      const { command } = entry;
      const leaf = el('button', 'arc-leaf');
      leaf.type = 'button';
      leaf.classList.toggle('blocked', entry.blocked);
      const out = REACH - BEND * (i - middle) ** 2;
      leaf.style.setProperty('--out', `${out.toFixed(2)}em`);
      const row = el('span', 'arc-row');
      row.append(el('kbd', '', String(i + 1)), el('strong', '', command.name), el('em', '', entry.cost));
      const label = el('span', 'arc-label');
      label.append(row, el('small', '', command.tip));
      leaf.append(commandIcon(command.id, 'arc-disc'), label);
      leaf.addEventListener('pointerenter', () => this.onPoint(i));
      leaf.addEventListener('click', () => this.onPick(i));
      return leaf;
    });
    this.root.replaceChildren(...this.leaves);
    this.root.hidden = false;
  }

  close(): void {
    this.root.hidden = true;
    this.leaves = [];
  }

  /** 가리키는 명령을 밝힌다. locked이면 대상을 겨누는 중이라 나머지를 흐리게 한다. */
  highlight(index: number, locked: boolean): void {
    this.leaves.forEach((leaf, i) => {
      leaf.classList.toggle('sel', i === index);
      leaf.classList.toggle('blur', locked && i !== index);
    });
    this.root.classList.toggle('locked', locked);
  }

  /**
   * 캐릭터의 몸 가운데에 맞춰 놓는다. tall은 몸의 키(픽셀)로, 그만큼 몸 앞으로 띄운다.
   * 메뉴 전체가 room 안에 들어오도록 위아래로 비킨다. 다 들어가지 않으면 위쪽 끝을 맞춘다.
   */
  place(body: Spot, tall: number, room: Band): void {
    const half = this.root.offsetHeight / 2;
    const y = Math.max(room.top + half, Math.min(room.bottom - half, body.y));
    const style = this.root.style;
    style.left = `${Math.round(body.x)}px`;
    style.top = `${Math.round(y)}px`;
    style.setProperty('--tall', `${Math.round(tall)}px`);
  }
}

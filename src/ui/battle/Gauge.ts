import { el } from '../dom';

/** 이름이 붙은 막대 하나(HP, BP, MP). 값이 바뀔 때만 화면을 고친다. */
export class Gauge {
  readonly root: HTMLElement;
  private readonly fill = el('i');
  private readonly value = el('b');
  private shown = '';

  constructor(kind: string, label: string) {
    this.root = el('div', `gauge gauge-${kind}`);
    const track = el('span', 'gauge-track');
    track.append(this.fill);
    this.root.append(el('em', '', label), track, this.value);
  }

  set(current: number, max: number): void {
    const whole = Math.max(0, Math.round(current));
    const key = `${whole}/${max}`;
    if (key === this.shown) return;
    this.shown = key;
    this.fill.style.width = `${max > 0 ? Math.min(100, (Math.max(0, current) / max) * 100) : 0}%`;
    this.value.textContent = String(whole);
  }
}

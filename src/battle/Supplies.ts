export interface SuppliesState {
  readonly gold: number;
  readonly shards: number;
  readonly potions: number;
}

/** 일행이 함께 쓰는 물자: 은화, 혈정석, 회복약. */
export class Supplies {
  private goldValue: number;
  private shardValue: number;
  private potionValue: number;

  constructor(start: SuppliesState) {
    this.goldValue = start.gold;
    this.shardValue = start.shards;
    this.potionValue = start.potions;
  }

  get gold(): number {
    return this.goldValue;
  }

  get shards(): number {
    return this.shardValue;
  }

  get potions(): number {
    return this.potionValue;
  }

  add(gain: Partial<SuppliesState>): void {
    this.goldValue += gain.gold ?? 0;
    this.shardValue += gain.shards ?? 0;
    this.potionValue += gain.potions ?? 0;
  }

  /** 회복약을 하나 쓴다. 없으면 false. */
  usePotion(): boolean {
    if (this.potionValue < 1) return false;
    this.potionValue -= 1;
    return true;
  }

  save(): SuppliesState {
    return { gold: this.goldValue, shards: this.shardValue, potions: this.potionValue };
  }

  load(state: SuppliesState): void {
    this.goldValue = state.gold;
    this.shardValue = state.shards;
    this.potionValue = state.potions;
  }
}

import type { Building } from './entities/Building';
import type { Character } from './entities/Character';

/** 자동 검증에서 게임 안을 들여다보고 주인공을 옮기는 창구. 주소에 ?debug를 붙였을 때만 노출한다. */
export class DebugProbe {
  constructor(
    private readonly hero: Character<string>,
    private readonly buildings: readonly Building[],
  ) {}

  debugState() {
    return {
      position: { ...this.hero.position },
      facing: { ...this.hero.facing },
      clip: this.hero.clip,
      opacities: this.buildings.map((building) => Number(building.opacity.toFixed(3))),
      footprints: this.buildings.map((building) => building.footprint),
    };
  }

  debugTeleport(x: number, z: number): void {
    this.hero.placeAt({ x, z });
  }
}

import type { Building } from './entities/Building';
import { Character } from './entities/Character';
import type { Entity } from './entities/Entity';

/** 자동 검증에서 게임 안을 들여다보고 주인공을 옮기는 창구. 주소에 ?debug를 붙였을 때만 노출한다. */
export class DebugProbe {
  constructor(
    private readonly hero: Character<string>,
    private readonly buildings: readonly Building[],
    private readonly stage: { readonly members: readonly Entity[] },
  ) {}

  debugState() {
    return {
      position: { ...this.hero.position },
      elevation: Number(this.hero.elevation.toFixed(3)),
      facing: { ...this.hero.facing },
      clip: this.hero.clip,
      opacities: this.buildings.map((building) => Number(building.opacity.toFixed(3))),
      footprints: this.buildings.map((building) => building.footprint),
    };
  }

  /** 장면에 선 모든 인물의 자리, 발 높이, 보이는지 여부. 대형이 벽이나 계단에 겹치지 않는지 확인할 때 쓴다. */
  debugCast() {
    return this.stage.members
      .filter((member): member is Character<string> => member instanceof Character)
      .map((character) => ({
        position: { ...character.position },
        elevation: Number(character.elevation.toFixed(3)),
        visible: character.root.visible,
        clip: character.clip,
      }));
  }

  debugTeleport(x: number, z: number): void {
    this.hero.placeAt({ x, z });
  }
}

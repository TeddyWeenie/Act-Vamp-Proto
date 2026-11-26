import type { Object3D } from 'three';
import { FlatLook } from './FlatLook';
import { CartoonBuilding, OutlineShellFactory, UnlitMaterialFactory, type OutlineSettings } from './cartoon';
import type { BuildingSkin } from './look';

/**
 * 건물 테두리 선. 색은 캐릭터 그림의 선과 같은 어두운 자주색이고, 굵기는 캐릭터 키에 견준 값이다.
 * 건물 안쪽의 선은 원화에 그려져 텍스처에 들어 있지만, 바깥 테두리는 3D로 바꾸는 과정에서 사라지므로 여기서 다시 두른다.
 */
const INK: OutlineSettings = { color: 0x1c0d14, width: 0.016, pushFactor: 1.6 };

/**
 * 기본 화면: 텍스처 색을 그대로 쓰는 꾸밈 없는 화면에, 건물 바깥 테두리 선만 더한다.
 * 조명, 명암 단계, 색 보정은 쓰지 않는다. 그림자와 바닥은 FlatLook 그대로다.
 */
export class InkLook extends FlatLook {
  private readonly bodies = new UnlitMaterialFactory();
  private readonly shells: OutlineShellFactory;

  constructor(characterHeight: number, ink: OutlineSettings = INK) {
    super();
    this.shells = new OutlineShellFactory(ink, characterHeight);
  }

  override dress(model: Object3D): BuildingSkin {
    const building = new CartoonBuilding(model);
    building.useMaterials(this.bodies);
    building.addOutline(this.shells);
    return building;
  }
}

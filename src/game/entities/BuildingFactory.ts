import { Box3, Mesh, MeshBasicMaterial, PlaneGeometry, Raycaster, Vector3, type Object3D } from 'three';
import type { BuildingPlacement, FittingPlacement } from '../../data/town';
import type { ModelLibrary } from '../../render/ModelLibrary';
import type { TextureLibrary } from '../../render/TextureLibrary';
import type { BuildingLook } from '../../render/look';
import { fittingRect } from '../logic/fitting';
import { Building } from './Building';

const INTO_THE_WALL = new Vector3(0, 0, -1);

/**
 * 배치표 한 줄을 받아 건물을 세운다. 모델과 그림을 불러오는 일, 재질을 고르는 일은 맡은 객체에 넘긴다.
 * 문이나 꽃 상자처럼 따로 그린 조각은 모델 정면의 벽을 찾아 그 앞에 붙인다.
 */
export class BuildingFactory {
  private readonly raycaster = new Raycaster();

  constructor(
    private readonly models: ModelLibrary,
    private readonly textures: TextureLibrary,
    private readonly look: BuildingLook,
  ) {}

  async create(placement: BuildingPlacement): Promise<Building> {
    const model = await this.models.instance(placement.model);
    const fittings = placement.fittings ?? [];
    const pieces = await Promise.all(fittings.map((fitting) => this.fit(model, fitting)));
    return new Building(model, placement, this.look, pieces);
  }

  /** 조각 그림을 평평한 판으로 만들어 모델 좌표의 제자리에 놓는다. 건물에 다는 일은 Building이 한다. */
  private async fit(model: Object3D, fitting: FittingPlacement): Promise<Mesh> {
    const map = await this.textures.load(fitting.image);
    const image = map.image as { width: number; height: number };
    model.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(model);
    const rect = fittingRect(bounds, fitting, image.width / image.height);

    const piece = new Mesh(new PlaneGeometry(rect.width, rect.height), new MeshBasicMaterial({ map }));
    piece.position.set(rect.x, rect.y, this.wallAt(model, rect.x, rect.y, bounds.max.z) + rect.lift);
    // 조각은 길을 막지도 캐릭터를 가리지도 않으므로 선을 쏘는 검사에서 뺀다.
    piece.raycast = () => {};
    return piece;
  }

  /** 정면 바깥에서 벽 쪽으로 선을 쏘아, 그 자리의 벽이 얼마나 앞에 있는지 알아낸다. */
  private wallAt(model: Object3D, x: number, y: number, front: number): number {
    this.raycaster.set(new Vector3(x, y, front + 1), INTO_THE_WALL);
    return this.raycaster.intersectObject(model, true)[0]?.point.z ?? front;
  }
}

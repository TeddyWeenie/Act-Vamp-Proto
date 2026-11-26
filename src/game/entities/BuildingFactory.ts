import type { BuildingPlacement } from '../../data/town';
import type { ModelLibrary } from '../../render/ModelLibrary';
import type { BuildingLook } from '../../render/look';
import { Building } from './Building';

/** 배치표 한 줄을 받아 건물을 세운다. 모델을 불러오는 일과 재질을 고르는 일은 맡은 객체에 넘긴다. */
export class BuildingFactory {
  constructor(
    private readonly models: ModelLibrary,
    private readonly look: BuildingLook,
  ) {}

  async create(placement: BuildingPlacement): Promise<Building> {
    return new Building(await this.models.instance(placement.model), placement, this.look);
  }
}

import { Mesh, MirroredRepeatWrapping, PlaneGeometry, SRGBColorSpace, type Texture } from 'three';
import type { GroundLook } from '../../render/look';
import type { Bounds } from '../logic/movement';
import { Entity } from './Entity';

/** 맵 바깥으로 이만큼 더 깔아서 화면 가장자리에 빈 곳이 보이지 않게 한다. */
const MARGIN = 20;

/** 마을 바닥. 그림 한 장을 거울처럼 뒤집어 이어 붙여 이음매가 생기지 않게 한다. */
export class Ground extends Entity {
  constructor(texture: Texture, bounds: Bounds, look: GroundLook, anisotropy: number) {
    const width = bounds.maxX - bounds.minX + MARGIN * 2;
    const depth = bounds.maxZ - bounds.minZ + MARGIN * 2;
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = texture.wrapT = MirroredRepeatWrapping;
    texture.anisotropy = anisotropy;
    texture.repeat.set(width / look.groundTileSize, depth / look.groundTileSize);

    const geometry = new PlaneGeometry(width, depth);
    geometry.rotateX(-Math.PI / 2);
    const mesh = new Mesh(geometry, look.groundMaterial(texture));
    mesh.position.set((bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2);
    super(mesh);
  }
}

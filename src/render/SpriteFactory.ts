import { LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace, TextureLoader, type Texture } from 'three';
import type { SpriteSheet } from '../data/sprites';
import { SpriteView } from './SpriteView';
import type { SpriteLook } from './look';

/** 스프라이트 시트의 그림을 불러와 장면에 세울 수 있는 동작 그림으로 만든다. */
export class SpriteFactory {
  private readonly loader = new TextureLoader();

  constructor(private readonly look: SpriteLook) {}

  async create<Name extends string>(sheet: SpriteSheet<Name>, first: Name): Promise<SpriteView<Name>> {
    const names = Object.keys(sheet.clips) as Name[];
    const loaded = await Promise.all(names.map((name) => this.loader.loadAsync(sheet.clips[name].url)));
    const textures = {} as Record<Name, Texture>;
    names.forEach((name, i) => {
      const texture = loaded[i];
      texture.colorSpace = SRGBColorSpace;
      texture.minFilter = LinearMipmapLinearFilter;
      texture.magFilter = LinearFilter;
      texture.anisotropy = 4;
      textures[name] = texture;
    });
    return new SpriteView(sheet, textures, first, this.look);
  }
}

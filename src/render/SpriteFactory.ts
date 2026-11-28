import { LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace, TextureLoader, type Texture } from 'three';
import type { SpriteSheet } from '../data/sprites';
import type { ViewAngle } from '../game/logic/view';
import { SpriteView } from './SpriteView';
import { StillView } from './StillView';
import type { SpriteLook } from './look';

/** 그림 파일을 불러와 장면에 세울 수 있는 동작 그림이나 소품 그림으로 만든다. */
export class SpriteFactory {
  private readonly loader = new TextureLoader();

  constructor(
    private readonly look: SpriteLook,
    private readonly angle: ViewAngle,
  ) {}

  async create<Name extends string>(sheet: SpriteSheet<Name>, first: Name): Promise<SpriteView<Name>> {
    const names = Object.keys(sheet.clips) as Name[];
    const loaded = await Promise.all(names.map((name) => this.load(sheet.clips[name].url)));
    const textures = {} as Record<Name, Texture>;
    names.forEach((name, i) => {
      textures[name] = loaded[i]!;
    });
    return new SpriteView(sheet, textures, first, this.look, this.angle);
  }

  /** 움직이지 않는 그림 한 장을 월드 높이 height로 세운다. */
  async still(url: string, height: number): Promise<StillView> {
    return new StillView(await this.load(url), height, this.look, this.angle);
  }

  private async load(url: string): Promise<Texture> {
    const texture = await this.loader.loadAsync(url);
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.magFilter = LinearFilter;
    texture.anisotropy = 4;
    return texture;
  }
}

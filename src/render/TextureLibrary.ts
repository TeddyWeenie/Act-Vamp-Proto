import { LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace, TextureLoader, type Texture } from 'three';

/** 그림 파일을 한 번만 내려받아 두고, 같은 그림을 여러 건물이 함께 쓰게 한다. */
export class TextureLibrary {
  private readonly loader = new TextureLoader();
  private readonly cache = new Map<string, Promise<Texture>>();

  load(url: string): Promise<Texture> {
    let pending = this.cache.get(url);
    if (!pending) {
      pending = this.loader.loadAsync(url).then((texture) => {
        texture.colorSpace = SRGBColorSpace;
        texture.minFilter = LinearMipmapLinearFilter;
        texture.magFilter = LinearFilter;
        texture.anisotropy = 4;
        return texture;
      });
      this.cache.set(url, pending);
    }
    return pending;
  }
}

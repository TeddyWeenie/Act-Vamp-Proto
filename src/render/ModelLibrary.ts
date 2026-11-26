import type { Object3D } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';

/** 3D 모델 파일을 한 번만 내려받아 두고, 요청할 때마다 복제본을 내준다. */
export class ModelLibrary {
  private readonly loader = new GLTFLoader();
  private readonly cache = new Map<string, Promise<GLTF>>();

  async instance(url: string): Promise<Object3D> {
    let pending = this.cache.get(url);
    if (!pending) {
      pending = this.loader.loadAsync(url);
      this.cache.set(url, pending);
    }
    return (await pending).scene.clone(true);
  }
}

import { Box3, Matrix4, Mesh, Vector3, type BufferGeometry, type Object3D } from 'three';
import { bendPoint, type ShapeBounds, type WonkyAmounts } from './shapeMath';

/** 불러온 모델의 형태를 화면 느낌에 맞게 다듬는 약속. 재질은 건드리지 않는다. */
export interface ModelShaper {
  /** 아직 배치하지 않은(원점에 놓인) 모델을 받아 그 자리에서 고친다. */
  shape(model: Object3D): void;
}

/** 형태를 그대로 둔다. */
export class PlainShaper implements ModelShaper {
  shape(): void {}
}

/**
 * 건물을 만화풍으로 과장한다. 위로 갈수록 넓어지고 조금 기울며 지붕 끝이 처진다.
 * 같은 모델 파일의 복제본은 정점 자료를 함께 쓰므로 한 번만 고친다.
 */
export class WonkyShaper implements ModelShaper {
  private readonly shaped = new WeakSet<BufferGeometry>();

  constructor(private readonly amounts: WonkyAmounts) {}

  shape(model: Object3D): void {
    model.updateMatrixWorld(true);
    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const bounds: ShapeBounds = {
      centerX: center.x,
      centerZ: center.z,
      baseY: box.min.y,
      height: size.y,
      halfWidth: size.x / 2,
    };

    const point = new Vector3();
    const toLocal = new Matrix4();
    model.traverse((node) => {
      if (!(node instanceof Mesh) || this.shaped.has(node.geometry)) return;
      this.shaped.add(node.geometry);
      const positions = node.geometry.attributes.position;
      toLocal.copy(node.matrixWorld).invert();
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(node.matrixWorld);
        bendPoint(point, bounds, this.amounts);
        point.applyMatrix4(toLocal);
        positions.setXYZ(i, point.x, point.y, point.z);
      }
      positions.needsUpdate = true;
      node.geometry.computeBoundingBox();
      node.geometry.computeBoundingSphere();
    });
  }
}

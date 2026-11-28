import { CanvasTexture, ClampToEdgeWrapping, LinearFilter, Vector4, type Texture } from 'three';
import { layoutLightMap, toLightMapCell, type LightMapLayout } from '../../game/logic/light';
import type { Bounds } from '../../game/logic/movement';
import type { Vec2 } from '../../game/logic/view';

/** 맵 바깥으로 이만큼 더 덮는다. 경계 가까이 선 캐릭터도 지도를 읽을 수 있게 한다. */
const MARGIN = 4;

/** 건물 그림자는 두 채널을 모두 지우고, 소품 그림자는 빨강만 지운다(곱하기로 칠한다). */
const BUILDING_SHADE = '#000';
const PROP_SHADE = '#0ff';

/**
 * 지면 어디에 그림자가 졌는지를 담은 작은 그림. 밝은 곳은 햇빛, 어두운 곳은 그늘이다.
 * 빨강 채널에는 모든 그림자가, 초록 채널에는 건물 그림자만 들어 있다.
 * 걸어 다니는 캐릭터는 빨강을, 제자리의 소품은 초록을 읽는다. 그래야 나무가 자기 그림자에 스스로 어두워지지 않는다.
 * 일부러 성기게 그려서, 화면에 늘려 읽을 때 그림자 경계가 부드럽게 이어진다.
 */
export class ShadeMap {
  /** 지도가 덮는 자리: 왼쪽 위 모서리(x, z)와 크기의 역수(1/가로, 1/세로). 셰이더가 월드 좌표를 지도 좌표로 바꿀 때 쓴다. */
  readonly rect: Vector4;
  private readonly layout: LightMapLayout;
  private readonly context: CanvasRenderingContext2D;
  private readonly canvasTexture: CanvasTexture;

  constructor(bounds: Bounds, cellsPerUnit: number) {
    this.layout = layoutLightMap(bounds, MARGIN, cellsPerUnit);
    const canvas = document.createElement('canvas');
    canvas.width = this.layout.columns;
    canvas.height = this.layout.rows;
    this.context = canvas.getContext('2d')!;
    this.context.fillStyle = '#fff';
    this.context.fillRect(0, 0, canvas.width, canvas.height);

    this.canvasTexture = new CanvasTexture(canvas);
    // 그림의 위쪽 줄이 지면의 -Z쪽이 되도록 뒤집지 않고 쓴다.
    this.canvasTexture.flipY = false;
    this.canvasTexture.generateMipmaps = false;
    this.canvasTexture.minFilter = this.canvasTexture.magFilter = LinearFilter;
    this.canvasTexture.wrapS = this.canvasTexture.wrapT = ClampToEdgeWrapping;
    this.rect = new Vector4(this.layout.minX, this.layout.minZ, 1 / this.layout.spanX, 1 / this.layout.spanZ);
  }

  get texture(): Texture {
    return this.canvasTexture;
  }

  /** 그림자 테두리(지면 좌표의 볼록한 도형)를 그늘로 칠한다. fromProp이면 소품이 드리운 그림자다. */
  addShadow(outline: readonly Vec2[], fromProp = false): void {
    if (outline.length < 3) return;
    const ctx = this.context;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = fromProp ? PROP_SHADE : BUILDING_SHADE;
    ctx.beginPath();
    outline.forEach((point, i) => {
      const { column, row } = toLightMapCell(this.layout, point);
      if (i === 0) ctx.moveTo(column, row);
      else ctx.lineTo(column, row);
    });
    ctx.closePath();
    ctx.fill();
    this.canvasTexture.needsUpdate = true;
  }

  dispose(): void {
    this.canvasTexture.dispose();
  }
}

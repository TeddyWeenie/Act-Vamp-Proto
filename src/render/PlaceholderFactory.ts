import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace, type Texture } from 'three';
import type { SpriteAnimator, StillImage } from '../game/capabilities';
import type { ViewAngle } from '../game/logic/view';
import type { Pose } from '../game/states/characterStates';
import { drawPlaceholder, type PlaceholderFigure } from './PlaceholderArt';
import { PlaceholderSprite } from './PlaceholderSprite';
import { StillView } from './StillView';
import type { SpriteLook } from './look';

/**
 * 진짜 그림이 없는 인물과 물건을 임시 그림으로 세워 준다.
 * 기능을 먼저 만들고 그림은 나중에 입히기 위한 것이라, 그림이 모두 준비되면 이 클래스와 임시 그림 파일들은 지운다.
 */
export class PlaceholderFactory {
  constructor(
    private readonly look: SpriteLook,
    private readonly angle: ViewAngle,
  ) {}

  /** 걷고 공격하는 인물. */
  figure(figure: PlaceholderFigure, height: number): SpriteAnimator<Pose> {
    return new PlaceholderSprite(this.paint(figure), this.paint(figure, true), height, this.look, this.angle);
  }

  /** 움직이지 않는 인물이나 물건. */
  still(figure: PlaceholderFigure, height: number): StillImage {
    return new StillView(this.paint(figure), height, this.look, this.angle);
  }

  private paint(figure: PlaceholderFigure, facingLeft = false): Texture {
    const texture = new CanvasTexture(drawPlaceholder(figure, facingLeft));
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.magFilter = LinearFilter;
    texture.anisotropy = 4;
    return texture;
  }
}

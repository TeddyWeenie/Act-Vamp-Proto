/** 색 세 성분(빨강, 초록, 파랑). 1이 원래 밝기다. */
export type Rgb = readonly [number, number, number];

/** 장면의 빛이 캐릭터와 소품에 닿는 방식. */
export interface SceneLightSettings {
  /** 햇빛을 받는 자리에서 그림에 곱하는 색. 조금 따뜻하게 둔다. */
  readonly sun: Rgb;
  /** 그림자 속에서 그림에 곱하는 색. 어둡고 조금 차갑게 둔다. */
  readonly shade: Rgb;
  /** 발끝에 곱하는 밝기. 1보다 작으면 발 쪽이 살짝 어두워져 땅에 붙어 보인다. */
  readonly footDim: number;
  /** 빛 지도의 촘촘함(월드 1마다 칸 수). 작을수록 그림자 경계에서 색이 천천히 바뀐다. */
  readonly cellsPerUnit: number;
}

/** 화면 전체에 마지막으로 씌우는 한 겹. */
export interface LensSettings {
  /** 이 밝기를 넘는 곳만 번진다. */
  readonly bloomThreshold: number;
  readonly bloomStrength: number;
  /** 화면 위쪽(먼 곳)이 흐려지기 시작하는 높이(0이 아래, 1이 위)와 가장 흐릴 때의 반지름(화면 높이에 견준 비율). */
  readonly farStart: number;
  readonly farBlur: number;
  /** 화면 아래쪽(가까운 곳)이 흐려지기 시작하는 높이와 가장 흐릴 때의 반지름. */
  readonly nearStart: number;
  readonly nearBlur: number;
  /** 먼 곳에 끼는 옅은 안개의 색과 양. */
  readonly haze: Rgb;
  readonly hazeAmount: number;
  /** 색 보정: 채도, 어두운 곳과 밝은 곳에 입히는 색, 대비, 가장자리 어둡게. */
  readonly saturation: number;
  readonly shadowTint: Rgb;
  readonly lightTint: Rgb;
  readonly contrast: number;
  readonly vignette: number;
}

/** 공기 중에 떠다니는 빛 입자. */
export interface MoteSettings {
  readonly count: number;
  /** 입자가 떠 있는 공간의 크기(가로, 높이, 세로). 카메라가 보는 곳을 따라다닌다. */
  readonly box: Rgb;
  /** 입자 지름(월드 단위). */
  readonly size: number;
  readonly color: Rgb;
  readonly strength: number;
}

export interface AtmosphereSettings {
  readonly light: SceneLightSettings;
  readonly lens: LensSettings;
  readonly motes: MoteSettings;
}

/** 늦은 오후의 따뜻한 햇빛과 푸른 보랏빛 그늘. */
export const DEFAULT_ATMOSPHERE: AtmosphereSettings = {
  light: {
    sun: [1.06, 1.0, 0.9],
    shade: [0.56, 0.54, 0.7],
    footDim: 0.8,
    cellsPerUnit: 3,
  },
  lens: {
    bloomThreshold: 0.62,
    bloomStrength: 0.55,
    farStart: 0.66,
    farBlur: 0.0045,
    nearStart: 0.18,
    nearBlur: 0.0035,
    haze: [0.86, 0.72, 0.6],
    hazeAmount: 0.16,
    saturation: 1.06,
    shadowTint: [0.93, 0.94, 1.08],
    lightTint: [1.06, 1.0, 0.92],
    contrast: 0.22,
    vignette: 0.3,
  },
  motes: {
    count: 90,
    box: [30, 4.5, 20],
    size: 0.17,
    color: [1.0, 0.86, 0.55],
    strength: 0.8,
  },
};

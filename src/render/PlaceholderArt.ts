/** 임시 그림의 생김새. 진짜 그림이 오기 전까지 누가 누구인지 알아볼 수 있게만 그린다. */
export type PlaceholderKind = 'person' | 'elder' | 'construct' | 'wisp' | 'machine';

export interface PlaceholderFigure {
  /** 그림 위에 적는 이름. */
  readonly label: string;
  readonly kind: PlaceholderKind;
  /** 몸통 색과 장식 색. */
  readonly fill: string;
  readonly trim: string;
}

const PAPER = '#efe6d6';
const INK = '#2a1d2b';
/** 그림 아래에서 발까지의 여백(px). */
const FOOT = 10;

type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number, figure: PlaceholderFigure) => void;

/** 종이를 오려 붙인 것처럼 두꺼운 종이색 테두리를 두른 도형 하나를 그린다. */
function cutout(ctx: CanvasRenderingContext2D, color: string, trace: () => void): void {
  ctx.beginPath();
  trace();
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 12;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fill();
}

const person: Painter = (ctx, w, h, { fill, trim }) => {
  const base = h - FOOT;
  // 망토 자락. 오른쪽을 보고 서 있도록 앞자락을 조금 내민다.
  cutout(ctx, fill, () => {
    ctx.moveTo(w * 0.3, h * 0.36);
    ctx.lineTo(w * 0.7, h * 0.36);
    ctx.lineTo(w * 0.86, base);
    ctx.lineTo(w * 0.16, base);
  });
  cutout(ctx, trim, () => {
    ctx.moveTo(w * 0.44, h * 0.38);
    ctx.lineTo(w * 0.62, h * 0.38);
    ctx.lineTo(w * 0.66, base - 4);
    ctx.lineTo(w * 0.48, base - 4);
  });
  cutout(ctx, '#e9cdb4', () => ctx.arc(w * 0.52, h * 0.22, w * 0.17, 0, Math.PI * 2));
  // 눈 하나로 바라보는 쪽을 알려 준다.
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(w * 0.6, h * 0.22, w * 0.025, 0, Math.PI * 2);
  ctx.fill();
};

const elder: Painter = (ctx, w, h, { fill, trim }) => {
  const base = h - FOOT;
  // 지팡이
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(w * 0.84, h * 0.2);
  ctx.lineTo(w * 0.84, base);
  ctx.stroke();
  ctx.strokeStyle = trim;
  ctx.lineWidth = 7;
  ctx.stroke();
  cutout(ctx, fill, () => {
    ctx.moveTo(w * 0.34, h * 0.34);
    ctx.lineTo(w * 0.68, h * 0.34);
    ctx.lineTo(w * 0.8, base);
    ctx.lineTo(w * 0.2, base);
  });
  // 두건
  cutout(ctx, fill, () => ctx.arc(w * 0.5, h * 0.23, w * 0.2, 0, Math.PI * 2));
  cutout(ctx, '#e9cdb4', () => ctx.arc(w * 0.53, h * 0.25, w * 0.12, 0, Math.PI * 2));
  // 수염
  cutout(ctx, PAPER, () => {
    ctx.moveTo(w * 0.44, h * 0.29);
    ctx.lineTo(w * 0.64, h * 0.29);
    ctx.lineTo(w * 0.55, h * 0.45);
  });
};

const construct: Painter = (ctx, w, h, { fill, trim }) => {
  const base = h - FOOT;
  for (const x of [0.3, 0.58]) {
    cutout(ctx, trim, () => ctx.rect(w * x, h * 0.72, w * 0.14, base - h * 0.72));
  }
  cutout(ctx, fill, () => ctx.rect(w * 0.16, h * 0.34, w * 0.68, h * 0.42));
  cutout(ctx, trim, () => ctx.rect(w * 0.3, h * 0.12, w * 0.4, h * 0.22));
  // 붉게 빛나는 외눈
  ctx.fillStyle = '#ff6a4d';
  ctx.beginPath();
  ctx.arc(w * 0.58, h * 0.23, w * 0.06, 0, Math.PI * 2);
  ctx.fill();
  cutout(ctx, '#b3364a', () => {
    ctx.moveTo(w * 0.5, h * 0.44);
    ctx.lineTo(w * 0.6, h * 0.55);
    ctx.lineTo(w * 0.5, h * 0.66);
    ctx.lineTo(w * 0.4, h * 0.55);
  });
};

const wisp: Painter = (ctx, w, h, { fill, trim }) => {
  const base = h - FOOT;
  // 땅에서 살짝 떠 있는 불꽃 모양
  cutout(ctx, fill, () => {
    ctx.moveTo(w * 0.5, h * 0.16);
    ctx.bezierCurveTo(w * 0.95, h * 0.3, w * 0.9, h * 0.75, w * 0.62, base - h * 0.1);
    ctx.lineTo(w * 0.54, base - h * 0.2);
    ctx.lineTo(w * 0.46, base - h * 0.06);
    ctx.lineTo(w * 0.38, base - h * 0.2);
    ctx.bezierCurveTo(w * 0.08, h * 0.72, w * 0.1, h * 0.32, w * 0.5, h * 0.16);
  });
  cutout(ctx, trim, () => ctx.arc(w * 0.52, h * 0.5, w * 0.16, 0, Math.PI * 2));
  ctx.fillStyle = PAPER;
  for (const x of [0.5, 0.64]) {
    ctx.beginPath();
    ctx.arc(w * x, h * 0.4, w * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }
};

const machine: Painter = (ctx, w, h, { fill, trim }) => {
  const base = h - FOOT;
  cutout(ctx, trim, () => ctx.rect(w * 0.12, h * 0.78, w * 0.76, base - h * 0.78));
  cutout(ctx, fill, () => {
    ctx.moveTo(w * 0.24, h * 0.8);
    ctx.lineTo(w * 0.24, h * 0.3);
    ctx.quadraticCurveTo(w * 0.5, h * 0.08, w * 0.76, h * 0.3);
    ctx.lineTo(w * 0.76, h * 0.8);
  });
  // 가운데의 혈정석
  cutout(ctx, '#b3364a', () => {
    ctx.moveTo(w * 0.5, h * 0.34);
    ctx.lineTo(w * 0.62, h * 0.52);
    ctx.lineTo(w * 0.5, h * 0.7);
    ctx.lineTo(w * 0.38, h * 0.52);
  });
  for (const x of [0.14, 0.86]) {
    cutout(ctx, trim, () => ctx.arc(w * x, h * 0.5, w * 0.07, 0, Math.PI * 2));
  }
};

const PAINTERS: Readonly<Record<PlaceholderKind, Painter>> = { person, elder, construct, wisp, machine };

/** 종류마다 그림의 가로세로 크기(px). */
const SIZES: Readonly<Record<PlaceholderKind, readonly [number, number]>> = {
  person: [256, 400],
  elder: [256, 400],
  construct: [288, 400],
  wisp: [256, 400],
  machine: [400, 400],
};

/** 이름표. 임시 그림임을 알 수 있게 이름 뒤에 "임시"를 붙여 적는다. */
function tag(ctx: CanvasRenderingContext2D, w: number, h: number, label: string): void {
  const text = `${label} · 임시`;
  ctx.font = '600 26px "Noto Serif KR", "Malgun Gothic", sans-serif';
  const width = Math.min(w - 8, ctx.measureText(text).width + 22);
  const x = (w - width) / 2;
  const y = h * 0.565;
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.rect(x, y, width, 38);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, y + 20, width - 10);
}

/**
 * 임시 그림 한 장을 그려 돌려준다. 기본은 오른쪽을 보고 선 모습이고, facingLeft면 왼쪽을 본다.
 * 그림을 통째로 뒤집으면 이름표의 글자도 뒤집히므로, 몸만 뒤집어 그리고 이름표는 바로 적는다.
 */
export function drawPlaceholder(figure: PlaceholderFigure, facingLeft = false): HTMLCanvasElement {
  const [width, height] = SIZES[figure.kind];
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.save();
  if (facingLeft) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  PAINTERS[figure.kind](ctx, width, height, figure);
  ctx.restore();
  tag(ctx, width, height, figure.label);
  return canvas;
}

/** 그림 아래 여백이 그림 높이에서 차지하는 비율. 발을 땅에 맞출 때 쓴다. */
export const PLACEHOLDER_FOOT_RATIO = FOOT / 400;

export interface Clip {
  frames: number;
  fps: number;
  loop: boolean;
}

/** 경과 시간에서 현재 프레임 번호를 구한다. 반복하지 않는 동작은 마지막 프레임에서 멈춘다. */
export function frameAt(clip: Clip, time: number): number {
  const index = Math.floor(Math.max(0, time) * clip.fps);
  return clip.loop ? index % clip.frames : Math.min(index, clip.frames - 1);
}

export function isFinished(clip: Clip, time: number): boolean {
  return !clip.loop && time * clip.fps >= clip.frames;
}

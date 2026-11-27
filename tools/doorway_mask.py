"""집 모델을 정면에서 반듯하게 찍은 그림(tools/model-front.html)에서 어두운 빈 문간을 찾아,
그 모양(마스크)과 자리(가로 위치, 아래 높이, 높이: 모두 건물 크기에 견준 비율)를 알려 준다.
사용: python3 tools/doorway_mask.py <정면 그림> <마스크 출력>"""
import sys
import numpy as np
from PIL import Image
src, out = sys.argv[1:3]
im = np.asarray(Image.open(src).convert('RGB')).astype(int)
H, W, _ = im.shape
# 문간: 아주 어두운 갈색. 화면 아래쪽 가운데에서 가장 큰 덩어리만 고른다.
dark = (im.sum(axis=2) < 200) & (im[:, :, 0] > im[:, :, 2])
ys, xs = np.nonzero(dark)
print('dark px', dark.sum(), 'bbox', xs.min(), xs.max(), ys.min(), ys.max(), 'of', W, H)
from collections import deque
seed = (int(H * 0.8), int(W * 0.5))
print('seed dark', dark[seed])
mask = np.zeros_like(dark); q = deque([seed]); mask[seed] = True
while q:
    y, x = q.popleft()
    for ny, nx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
        if 0 <= ny < H and 0 <= nx < W and dark[ny, nx] and not mask[ny, nx]:
            mask[ny, nx] = True; q.append((ny, nx))
ys, xs = np.nonzero(mask)
x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
print('door bbox', x0, x1, y0, y1)
print('across', (x0 + x1) / 2 / W, 'bottom', (H - y1) / H, 'height', (y1 - y0) / H, 'width frac', (x1 - x0) / W)
Image.fromarray((mask[y0:y1, x0:x1] * 255).astype('uint8')).save(out)

"""문 그림을 문간 모양(정면 렌더에서 뽑은 마스크)에 꼭 맞게 자른다.
사용: python3 tools/fit_door.py <문 그림> <문간 마스크> <출력> <가로/세로 비율>"""
import sys
import numpy as np
from PIL import Image, ImageFilter
src, mask_path, out, aspect = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
door = Image.open(src).convert('RGBA')
alpha = np.asarray(door)[:, :, 3] > 128
ys, xs = np.nonzero(alpha)
door = door.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
H = 1000; W = round(H * aspect)
door = door.resize((W, H), Image.LANCZOS)
mask = Image.open(mask_path).convert('L').resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.2))
mask = mask.point(lambda v: 255 if v > 150 else 0).filter(ImageFilter.GaussianBlur(0.8))
a = np.minimum(np.asarray(door)[:, :, 3], np.asarray(mask))
res = np.asarray(door).copy(); res[:, :, 3] = a
Image.fromarray(res).save(out)
print(W, H)

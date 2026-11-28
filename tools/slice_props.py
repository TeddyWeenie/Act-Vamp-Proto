"""소품 시트(투명 배경에 소품이 떨어져 놓인 그림)를 소품별 그림으로 자른다.
사용: python3 slice_props.py <시트.png> <출력 폴더> <이름1> <이름2> ...
서로 JOIN픽셀 안에 있는 조각은 한 소품으로 묶고(통과 상자와 화분처럼), 왼쪽부터 차례로 이름을 붙여 여백 없이 저장한다."""
import sys

import numpy as np
from PIL import Image, ImageFilter

JOIN = 8
ALPHA = 24
MIN_AREA = 400


def pieces(mask: np.ndarray):
    """이어진 덩어리마다 그 덩어리만 참인 그림을 차례로 돌려준다."""
    todo = mask.copy()
    height, width = todo.shape
    while True:
        seeds = np.argwhere(todo)
        if len(seeds) == 0:
            return
        piece = np.zeros_like(todo)
        stack = [tuple(seeds[0])]
        todo[stack[0]] = False
        while stack:
            y, x = stack.pop()
            piece[y, x] = True
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < height and 0 <= nx < width and todo[ny, nx]:
                    todo[ny, nx] = False
                    stack.append((ny, nx))
        yield piece


def main() -> None:
    sheet = Image.open(sys.argv[1]).convert('RGBA')
    out, names = sys.argv[2], sys.argv[3:]
    alpha = sheet.getchannel('A').point(lambda a: 255 if a > ALPHA else 0)
    solid = np.asarray(alpha) > 0
    grown = np.asarray(alpha.filter(ImageFilter.MaxFilter(JOIN * 2 + 1))) > 0
    boxes = []
    for mask in pieces(grown):
        mask &= solid
        if mask.sum() < MIN_AREA:
            continue
        ys, xs = np.nonzero(mask)
        area = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
        boxes.append((area, mask[area]))
    boxes.sort(key=lambda item: item[0][1].start)
    if len(boxes) != len(names):
        raise SystemExit(f'소품 {len(names)}개를 기대했는데 {len(boxes)}개로 나뉘었습니다')
    pixels = np.asarray(sheet)
    for (area, mask), name in zip(boxes, names):
        piece = pixels[area].copy()
        piece[~mask] = 0
        Image.fromarray(piece).save(f'{out}/{name}.png')
        print(name, piece.shape[1], piece.shape[0])


main()

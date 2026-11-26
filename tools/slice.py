import sys, json
from PIL import Image
import numpy as np

def runs(mask, min_gap, min_len):
    idx = np.where(mask)[0]
    if len(idx) == 0: return []
    out = []; s = idx[0]; p = idx[0]
    for i in idx[1:]:
        if i - p > min_gap:
            out.append((s, p + 1)); s = i
        p = i
    out.append((s, p + 1))
    return [r for r in out if r[1] - r[0] >= min_len]

def main():
    src, out_prefix, cols, rows, anchor, ms = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5], int(sys.argv[6])
    im = Image.open(src).convert('RGBA'); W, H = im.size
    a = np.array(im)[..., 3] > 40
    info = {'src_size': [W, H], 'method': []}
    # rows
    rr = runs(a.any(axis=1), 12, 40)
    if len(rr) != rows:
        info['method'].append('rows: equal split (found %d)' % len(rr)); rr = [(int(H * i / rows), int(H * (i + 1) / rows)) for i in range(rows)]
    boxes = []
    for (y0, y1) in rr:
        cr = runs(a[y0:y1].any(axis=0), 6, 40)
        if len(cr) != cols:
            info['method'].append('cols: equal split (found %d)' % len(cr)); cr = [(int(W * i / cols), int(W * (i + 1) / cols)) for i in range(cols)]
        else:
            info['method'].append('cols: gaps')
        for (x0, x1) in cr:
            sub = a[y0:y1, x0:x1]
            ys = np.where(sub.any(axis=1))[0]; xs = np.where(sub.any(axis=0))[0]
            boxes.append((x0 + xs[0], y0 + ys[0], x0 + xs[-1] + 1, y0 + ys[-1] + 1, (x0 + x1) / 2))
    info['boxes'] = [[int(v) for v in b[:4]] for b in boxes]
    CELL = 512
    mh = max(b[3] - b[1] for b in boxes); 
    # horizontal extent around anchor
    anchors = []
    for b in boxes:
        sub = a[b[1]:b[3], b[0]:b[2]]; h = sub.shape[0]
        if anchor == 'feet':
            part = sub[int(h * 0.88):]
        elif anchor == 'head':
            part = sub[:int(h * 0.35)]
        else:
            part = None
        if part is None: ax = b[4]
        else:
            xs = np.where(part.any(axis=0))[0]; ax = b[0] + (xs[0] + xs[-1]) / 2
        anchors.append(ax)
    ext = max(max(ax - b[0], b[2] - ax) for b, ax in zip(boxes, anchors))
    scale = min((CELL - 48) / mh, (CELL / 2 - 6) / ext, 1.0)
    info['scale'] = scale; info['max_h'] = int(mh)
    frames = []
    for b, ax in zip(boxes, anchors):
        crop = im.crop(b[:4]); w, h = crop.size
        nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
        crop = crop.resize((nw, nh), Image.LANCZOS)
        cell = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        px = round(CELL / 2 - (ax - b[0]) * scale); py = CELL - 24 - nh
        cell.alpha_composite(crop, (max(0, min(CELL - nw, px)), py)); frames.append(cell)
    atlas = Image.new('RGBA', (CELL * len(frames), CELL), (0, 0, 0, 0))
    for i, f in enumerate(frames): atlas.alpha_composite(f, (i * CELL, 0))
    atlas.save(out_prefix + '-atlas.png')
    bgc = (112, 124, 110, 255)
    gifs = []
    for f in frames:
        bg = Image.new('RGBA', (CELL, CELL), bgc); bg.alpha_composite(f); gifs.append(bg.convert('P', palette=Image.ADAPTIVE, colors=255))
    gifs[0].save(out_prefix + '.gif', save_all=True, append_images=gifs[1:], duration=ms, loop=0, disposal=1)
    sheet = Image.new('RGBA', atlas.size, bgc); sheet.alpha_composite(atlas)
    # baseline guide
    sheet.convert('RGB').save(out_prefix + '-check.png')
    print(json.dumps(info))
main()

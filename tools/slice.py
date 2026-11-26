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

def components(mask, keep):
    """Split a band into its `keep` largest connected figures; small loose bits (a sword tip, a spark)
    join the nearest one. Used when figures overlap sideways and no clean vertical gap separates them.
    Returns one boolean mask per figure, left to right, or None if fewer than `keep` figures exist."""
    parent = []
    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]; i = parent[i]
        return i
    rows = []; prev = []
    for y in range(mask.shape[0]):
        d = np.diff(np.concatenate(([0], mask[y].astype(np.int8), [0])))
        cur = []
        for x0, x1 in zip(np.where(d == 1)[0], np.where(d == -1)[0]):
            i = len(parent); parent.append(i)
            for (px0, px1, pi) in prev:
                if px0 <= x1 and x0 <= px1: parent[find(pi)] = find(i)
            cur.append((int(x0), int(x1), i))
        rows.append(cur); prev = cur
    labels = np.full(mask.shape, -1, dtype=np.int32); area = {}
    for y, cur in enumerate(rows):
        for x0, x1, i in cur:
            r = find(i); labels[y, x0:x1] = r; area[r] = area.get(r, 0) + x1 - x0
    big = sorted(area, key=area.get, reverse=True)[:keep]
    if len(big) < keep: return None
    centre = {r: np.where((labels == r).any(axis=0))[0].mean() for r in area}
    big.sort(key=lambda r: centre[r])
    out = [labels == r for r in big]
    for r in area:
        if r not in big:
            out[int(np.argmin([abs(centre[r] - centre[b]) for b in big]))] |= labels == r
    return out

def grown(mask, r):
    """The mask spread by r pixels, so a neighbour is removed together with its soft edge."""
    out = mask.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out |= np.roll(np.roll(mask, dy, axis=0), dx, axis=1)
    return out

def lowest_foot_x(sub, x0):
    """Centre of the lowest foot: the part of the figure that touches the ground first."""
    h = sub.shape[0]
    xs = np.where(sub[int(h * 0.95):].any(axis=0))[0]
    runs = np.split(xs, np.where(np.diff(xs) > 6)[0] + 1)
    run = max(runs, key=len)
    return x0 + (run[0] + run[-1]) / 2

def main():
    """slice.py <sheet.png> <out prefix> <cols> <rows> <feet|head|planted|box> <gif ms> [cell width] [foot margin]

    feet     centre both feet in the cell (standing, walking, side lunges)
    planted  pin the lowest foot instead, for moves where one foot stays put while the body travels
             (lunges seen from behind). Needs a wider cell: pass e.g. 768.
    head     centre the head. box: centre the bounding box.

    foot margin  cell pixels kept below the feet (default 24). Pass a larger value when something thin
                 hangs below the feet, such as a sword thrust toward the camera: the feet are then found
                 as the lowest wide part of the figure, and the game must be told the same margin.
    """
    src, out_prefix, cols, rows, anchor, ms = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5], int(sys.argv[6])
    CELL_W = int(sys.argv[7]) if len(sys.argv) > 7 else 512
    MARGIN = int(sys.argv[8]) if len(sys.argv) > 8 else 24
    im = Image.open(src).convert('RGBA'); W, H = im.size
    a = np.array(im)[..., 3] > 40
    info = {'src_size': [W, H], 'method': []}
    # rows
    rr = runs(a.any(axis=1), 12, 40)
    if len(rr) != rows:
        info['method'].append('rows: equal split (found %d)' % len(rr)); rr = [(int(H * i / rows), int(H * (i + 1) / rows)) for i in range(rows)]
    boxes = []; masks = []
    for (y0, y1) in rr:
        cr = runs(a[y0:y1].any(axis=0), 6, 40)
        figures = None
        if len(cr) != cols:
            figures = components(a[y0:y1], cols)
            if figures is None:
                info['method'].append('cols: equal split (found %d)' % len(cr)); cr = [(int(W * i / cols), int(W * (i + 1) / cols)) for i in range(cols)]
            else:
                info['method'].append('cols: connected figures (found %d gaps)' % len(cr))
        else:
            info['method'].append('cols: gaps')
        if figures is not None:
            for f in figures:
                ys = np.where(f.any(axis=1))[0]; xs = np.where(f.any(axis=0))[0]
                boxes.append((xs[0], y0 + ys[0], xs[-1] + 1, y0 + ys[-1] + 1, (xs[0] + xs[-1] + 1) / 2))
                others = np.zeros_like(a); others[y0:y1] = grown(a[y0:y1] & ~f, 3); masks.append(~others)
            continue
        for (x0, x1) in cr:
            sub = a[y0:y1, x0:x1]
            ys = np.where(sub.any(axis=1))[0]; xs = np.where(sub.any(axis=0))[0]
            boxes.append((x0 + xs[0], y0 + ys[0], x0 + xs[-1] + 1, y0 + ys[-1] + 1, (x0 + x1) / 2))
            masks.append(None)
    # masks[i] is where frame i may keep pixels: everything, unless a neighbour reaches into its box.
    def keep_of(i):
        b = boxes[i]
        return None if masks[i] is None else masks[i][b[1]:b[3], b[0]:b[2]]
    def part_of(i):
        b = boxes[i]; sub = a[b[1]:b[3], b[0]:b[2]]; keep = keep_of(i)
        return sub if keep is None else sub & keep
    info['boxes'] = [[int(v) for v in b[:4]] for b in boxes]
    CELL = 512
    mh = max(b[3] - b[1] for b in boxes); 
    # Row just below the feet, counted from the top of each box. Normally the bottom of the figure;
    # with a foot margin it is the lowest row wide enough to be a boot rather than a blade.
    def foot_row(i):
        sub = part_of(i)
        if MARGIN == 24: return sub.shape[0]
        wide = np.where(sub.sum(axis=1) >= 28)[0]
        return int(wide[-1]) + 1
    feet = [foot_row(i) for i in range(len(boxes))]
    # horizontal extent around anchor
    anchors = []
    for i, b in enumerate(boxes):
        sub = part_of(i); h = feet[i]
        if anchor == 'feet':
            part = sub[int(h * 0.88):h]
        elif anchor == 'head':
            part = sub[:int(h * 0.35)]
        else:
            part = None
        if anchor == 'planted': ax = lowest_foot_x(sub, b[0])
        elif part is None: ax = b[4]
        else:
            xs = np.where(part.any(axis=0))[0]; ax = b[0] + (xs[0] + xs[-1]) / 2
        anchors.append(ax)
    if anchor == 'planted':
        # Keep the first frame where a standing pose would be (midway between the feet), so the move
        # does not jump sideways when it starts. Every frame gets the same shift.
        b = boxes[0]; sub = part_of(0)
        xs = np.where(sub[int(sub.shape[0] * 0.78):].any(axis=0))[0]
        shift = b[0] + (xs[0] + xs[-1]) / 2 - anchors[0]
        anchors = [ax + shift for ax in anchors]
    ext = max(max(ax - b[0], b[2] - ax) for b, ax in zip(boxes, anchors))
    above = max(feet); below = max(b[3] - b[1] - f for b, f in zip(boxes, feet))
    scale = min((CELL - 24 - MARGIN) / above, (CELL_W / 2 - 6) / ext, 1.0)
    if below > 0: scale = min(scale, (MARGIN - 4) / below)
    info['scale'] = scale; info['max_h'] = int(mh); info['cell'] = [CELL_W, CELL]
    frames = []
    for i, (b, ax) in enumerate(zip(boxes, anchors)):
        crop = im.crop(b[:4]); w, h = crop.size
        if keep_of(i) is not None:
            px = np.array(crop); px[~keep_of(i)] = 0; crop = Image.fromarray(px)
        nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
        crop = crop.resize((nw, nh), Image.LANCZOS)
        cell = Image.new('RGBA', (CELL_W, CELL), (0, 0, 0, 0))
        px = round(CELL_W / 2 - (ax - b[0]) * scale); py = CELL - MARGIN - round(feet[i] * scale)
        cell.alpha_composite(crop, (max(0, min(CELL_W - nw, px)), py)); frames.append(cell)
    atlas = Image.new('RGBA', (CELL_W * len(frames), CELL), (0, 0, 0, 0))
    for i, f in enumerate(frames): atlas.alpha_composite(f, (i * CELL_W, 0))
    atlas.save(out_prefix + '-atlas.png')
    bgc = (112, 124, 110, 255)
    gifs = []
    for f in frames:
        bg = Image.new('RGBA', (CELL_W, CELL), bgc); bg.alpha_composite(f); gifs.append(bg.convert('P', palette=Image.ADAPTIVE, colors=255))
    gifs[0].save(out_prefix + '.gif', save_all=True, append_images=gifs[1:], duration=ms, loop=0, disposal=1)
    sheet = Image.new('RGBA', atlas.size, bgc); sheet.alpha_composite(atlas)
    # baseline guide
    sheet.convert('RGB').save(out_prefix + '-check.png')
    print(json.dumps(info))
main()

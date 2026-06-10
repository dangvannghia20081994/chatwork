#!/usr/bin/env python3
"""Parse 1 file Basic Design (HTML export Google Sheet) -> tóm tắt các section.

Cấu trúc file Basic Design (ritz/waffle):
- Cột đầu mỗi hàng là số thứ tự dòng (bỏ).
- Nội dung chia theo section đánh số: "1. Interface", "2. Overview",
  "3. Screen Items", "4. Database", "5. 処理 (Xử lý)" + sub 5.1, 5.2...
- Trong section có thể có bảng (hàng đầu là header: Spec-ID, Field Name, ...).
"""
import sys, re, os
from html.parser import HTMLParser


class TableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.cur = None
        self.cell = None
        self.buf = ''

    def handle_starttag(self, t, a):
        if t == 'tr':
            self.cur = []
        elif t in ('td', 'th'):
            self.cell = []
            self.buf = ''

    def handle_data(self, d):
        if self.cell is not None:
            self.buf += d

    def handle_endtag(self, t):
        if t in ('td', 'th') and self.cell is not None:
            self.cur.append(self.buf.strip())
            self.cell = None
        elif t == 'tr' and self.cur is not None:
            self.rows.append(self.cur)
            self.cur = None


def parse(path):
    p = TableParser()
    with open(path, encoding='utf-8') as f:
        p.feed(f.read())
    return p.rows


# Nhận diện hàng tiêu đề section: bắt đầu bằng "N." hoặc "N.M" (vd "3. Screen Items", "5.1 First load")
SECTION_RE = re.compile(r'^(\d+(?:\.\d+)*)[.\s]\s*(.+)$')


def content_cells(row):
    """Bỏ cột số thứ tự đầu, trả về list cell không rỗng."""
    return [c.strip() for c in row[1:] if c.strip()]


def build_markdown(path, full=False):
    """Parse file -> Markdown (section + bảng). full=True: không cắt mô tả (cho gen-testcase dùng lại)."""
    rows = parse(path)
    title = os.path.splitext(os.path.basename(path))[0]
    out = [f'# Basic Design: {title}', '']

    table_header = None
    cut = (lambda s: s.replace('\n', ' ')) if full else (lambda s: s.replace('\n', ' ')[:120])

    for row in rows:
        cells = content_cells(row)
        if not cells:
            continue
        # bỏ hàng tiêu đề cột bảng tính (A, B, C, ... AB)
        if all(re.fullmatch(r'[A-Z]{1,2}', c) for c in cells):
            continue

        first = cells[0]
        if len(cells) == 1 and SECTION_RE.match(first):
            table_header = None
            out.append('')
            out.append(f'## {first}')
            continue

        if len(cells) >= 2:
            looks_header = any(k in ' '.join(cells)
                               for k in ('Spec-ID', 'Field Name', 'Label Name',
                                         'Event', 'FiledName', 'No '))
            if table_header is None and looks_header:
                table_header = cells
                out.append('| ' + ' | '.join(cells) + ' |')
                out.append('|' + '|'.join(['---'] * len(cells)) + '|')
                continue
            if table_header is not None:
                trimmed = [cut(c) for c in cells]
                out.append('| ' + ' | '.join(trimmed) + ' |')
                continue

        text = ' '.join(cells)
        out.append(text if full else text[:300])

    return '\n'.join(out)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    full = '--full' in sys.argv
    write = '--write' in sys.argv  # ghi ra report/design/<ScreenCode>.md
    path = args[0]

    md = build_markdown(path, full=full)
    print(md)

    if write:
        screen = os.path.splitext(os.path.basename(path))[0]
        out_dir = os.path.join(os.getcwd(), 'report', 'design')
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, screen + '.md')
        with open(out_path, 'w', encoding='utf-8') as fp:
            fp.write(md + '\n')
        print(f'\n>> Đã ghi: {out_path}', file=sys.stderr)


if __name__ == '__main__':
    main()

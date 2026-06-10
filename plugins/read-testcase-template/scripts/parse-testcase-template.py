#!/usr/bin/env python3
"""Đọc file mẫu test case (UT.html / IT.html — export Google Sheet) -> trích template.

Sinh ra Markdown gồm:
- Header block (metadata đầu sheet).
- Danh sách cột (dòng header bắt đầu bằng 'TC No.').
- Danh sách section tiêu đề (Sxx_... hoặc 'Kiểm tra_...').
- Một số case mẫu đầu mỗi section làm ví dụ convention (↑, Steps đánh số...).

Dùng cho plugin read-testcase-template; gen-testcase đọc lại output này.
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


def content_cells(row):
    # cột đầu là số thứ tự dòng bảng tính -> bỏ
    return [c.strip() for c in row[1:] if c.strip()]


# Section tiêu đề: "Sxx_..." hoặc bắt đầu "Kiểm tra_"
SECTION_RE = re.compile(r'^(S\d+[._].*|Kiểm tra_.*)')
# Dòng dữ liệu case bắt đầu bằng số TC (có thể có tiền tố 'o ')
TCNO_RE = re.compile(r'^o?\s*\d+$')


def build(path, sample_per_section=2):
    rows = parse(path)
    kind = os.path.splitext(os.path.basename(path))[0]  # UT / IT
    out = [f'# Test Case Template: {kind}', '']

    header_block = []
    columns = None
    sections = []          # (tên section, [case mẫu])
    in_case_table = False

    for row in rows:
        cells = content_cells(row)
        if not cells:
            continue
        # bỏ hàng tiêu đề cột bảng tính (A, B, ...)
        if all(re.fullmatch(r'[A-Z]{1,2}', c) for c in cells):
            continue
        joined = ' '.join(cells)

        # dòng cột
        if columns is None and cells[0] == 'TC No.':
            columns = cells
            in_case_table = True
            continue

        # header block: trước dòng cột
        if columns is None:
            header_block.append(cells)
            continue

        # section tiêu đề
        if SECTION_RE.match(cells[0]) or (len(cells) == 1 and 'Kiểm tra_' in cells[0]):
            sections.append([joined, []])
            continue

        # case mẫu: dòng bắt đầu bằng số TC, lấy vài cái đầu mỗi section
        if sections and TCNO_RE.match(cells[0]):
            if len(sections[-1][1]) < sample_per_section:
                sections[-1][1].append(cells)

    # --- Header block ---
    out.append('## Header block (metadata đầu sheet)')
    for cells in header_block:
        out.append('- ' + ' | '.join(cells))
    out.append('')

    # --- Cột ---
    out.append('## Cột bảng test case')
    out.append('```')
    out.append(' | '.join(columns) if columns else '(không tìm thấy dòng cột)')
    out.append('```')
    out.append('Khi sinh case mới: để trống các cột kết quả (từ sau Expected Result).')
    out.append('')

    # --- Section + case mẫu ---
    out.append('## Section (thứ tự nhóm case) + case mẫu')
    for name, samples in sections:
        out.append(f'\n### {name}')
        for s in samples:
            out.append('- ' + ' || '.join(c.replace('\n', ' ')[:150] for c in s))

    return '\n'.join(out)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    write = '--write' in sys.argv
    path = args[0]
    md = build(path)
    print(md)
    if write:
        kind = os.path.splitext(os.path.basename(path))[0].lower()  # ut / it
        out_dir = os.path.join(os.getcwd(), 'report', 'template')
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, kind + '.md')
        with open(out_path, 'w', encoding='utf-8') as fp:
            fp.write(md + '\n')
        print(f'\n>> Đã ghi: {out_path}', file=sys.stderr)


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Checklist độ phủ test case theo SECTION của Basic Design.

Đọc report/design/<ScreenCode>*.md → lấy các section (## N. ...).
Đối chiếu với case đã sinh (UT/IT, file .md hoặc .csv trong report/testcase/) → mỗi section đánh ✅ (đã có case phủ) / ⬜ (chưa) / ➖ (bỏ qua: COMMON / out-of-scope).
Ghi report/testcase/<ScreenCode>-coverage.md và in ra.

Dùng: python3 coverage.py "<ScreenCode>"   (chạy từ thư mục làm việc chứa report/)
"""
import csv, re, os, sys, glob


def _rows_csv(path):
    rows = list(csv.reader(open(path, encoding='utf-8')))
    return [r for r in rows if r and r[0].strip().isdigit()]


def _rows_md(path):
    """Parse bảng markdown: hàng bắt đầu bằng số TC. Cell = split theo '|' (bỏ leading/trailing)."""
    out = []
    for line in open(path, encoding='utf-8'):
        s = line.strip()
        if not (s.startswith('|') and s.endswith('|')):
            continue
        cells = [c.strip() for c in s[1:-1].split('|')]
        if cells and cells[0].isdigit():
            out.append(cells)
    return out


def read_cases(path):
    """Đọc file case (.md hoặc .csv) → list case (mỗi case là list cell, cell[0]=TC No.)."""
    if not path or not os.path.exists(path):
        return None
    cases = _rows_md(path) if path.endswith('.md') else _rows_csv(path)
    last = ''
    for r in cases:
        if len(r) > 1 and r[1].strip() == '↑':
            r[1] = last
        elif len(r) > 1:
            last = r[1].strip()
    return cases


def spec_sections(design_md):
    """Trả về list (id, title) các section '## N. ...' / '## N.M ...'."""
    secs = []
    for line in design_md.splitlines():
        m = re.match(r'##\s+(\d+(?:\.\d+)*)[.:\s]\s*(.+)', line)
        if m:
            secs.append((m.group(1), m.group(2).strip()))
    return secs


def spec_fields(design_md):
    fields = []
    for line in design_md.splitlines():
        m = re.match(r'\|\s*\d+\s*\|\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\|', line)
        if m and m.group(1) not in fields:
            fields.append(m.group(1))
    return fields


# Section bỏ qua hẳn: out-of-scope / database / interface / section cha 処理.
# LƯU Ý: export csv/excel, display setting, view config — KHÔNG bỏ qua (có cấu hình
# đặc thù màn như default_view_config, cột export → vẫn sinh case + tick).
SKIP_KW = ['out of scope', 'database', 'interface', 'other', '処理 (xử lý)', '処理']
# (5. 処理 là section cha/mục lục — bỏ; các sub 5.1, 5.3, 5.8... mới đếm)

# Map section -> từ khoá nhận biết case đã phủ (lowercase, tìm trong Check Object 1/2/3)
SECTION_KW = {
    'overview': ['menu', 'url', 'back', 'login', 'di chuyển', 'redirect', 'title'],
    'screen items': None,    # phủ = có >=1 case cho field thuộc màn (xử lý riêng)
    'first load': ['first load', 'khởi tạo', 'loading', 'no data', 'có data', 'permission', 'quyền'],
    'validation': ['validation', 'boundary', 'e-msg', 'e-equip', 'maxlength', 'hợp lệ'],
    'log': ['log', 'ログ'],
}


def covered_by_kw(cases, kws):
    return sum(1 for r in cases if any(k in (' '.join(r[1:4])).lower() for k in kws))


def is_skip(title):
    t = title.lower()
    return any(k in t for k in SKIP_KW)


def section_status(sec_id, title, cases, fields):
    """Trả về (mark, count_or_note)."""
    t = title.lower()
    if is_skip(title):
        if '処理' in t:
            return '➖', 'section cha (xem các mục 5.x)'
        return '➖', 'không sinh case'
    # screen items: đếm field thuộc màn được phủ
    if 'screen items' in t:
        non_common = [f for f in fields
                      if not any(c in f.lower() for c in ['favorite', 'save_search', 'paging', 'pagination', 'action', 'display_setting', 'view_config', 'download_csv', 'export_csv'])]
        co1 = ' '.join(r[1].lower() for r in cases)
        cov = sum(1 for f in non_common if f.lower() in co1)
        mark = '✅' if cov == len(non_common) and non_common else ('🔶' if cov else '⬜')
        return mark, f'{cov}/{len(non_common)} field phủ'
    # các section theo từ khóa
    for key, kws in SECTION_KW.items():
        if key in t and kws:
            n = covered_by_kw(cases, kws)
            return ('✅' if n else '⬜'), f'{n} case'
    # section xử lý click/save khác: tìm theo từ trong title
    words = [w for w in re.findall(r'[a-z_]{4,}', t) if w not in ('click', 'button', 'vào')]
    n = sum(1 for r in cases if any(w in (' '.join(r[1:4])).lower() for w in words)) if words else 0
    return ('✅' if n else '⬜'), f'{n} case'


def main():
    screen = sys.argv[1]
    cwd = os.getcwd()
    dms = glob.glob(os.path.join(cwd, 'report', 'design', f'{screen}*.md'))
    if not dms:
        print(f'⚠️ Không tìm thấy report/design/{screen}*.md', file=sys.stderr)
        sys.exit(1)
    design_md = open(dms[0], encoding='utf-8').read()
    sections = spec_sections(design_md)
    fields = spec_fields(design_md)

    out = [f'# Checklist độ phủ theo section — {screen}', '',
           'Ký hiệu: ✅ đã phủ · 🔶 phủ một phần · ⬜ chưa có case · ➖ bỏ qua (COMMON/out-of-scope)', '']

    for kind in ['UT', 'IT']:
        # naming chuẩn: <Screen>_<KIND>.md|csv ; hỗ trợ cả '-' cũ. Ưu tiên .md.
        cs = (glob.glob(os.path.join(cwd, 'report', 'testcase', f'{screen}*{kind}.md'))
              or glob.glob(os.path.join(cwd, 'report', 'testcase', f'{screen}*{kind}.csv')))
        cases = read_cases(cs[0]) if cs else None
        out.append(f'## {kind}')
        if cases is None:
            out.append('- ❌ Chưa có file.\n')
            continue
        out.append(f'Tổng case: **{len(cases)}**\n')
        done = 0
        active = [s for s in sections if not is_skip(s[1])]
        for sid, title in sections:
            mark, note = section_status(sid, title, cases, fields)
            if mark == '✅':
                done += 1
            out.append(f'- [{ "x" if mark=="✅" else " " }] {mark} **{sid}. {title}** — {note}')
        out.append(f'\n→ Tiến độ: {done}/{len(active)} section đã phủ.\n')

    text = '\n'.join(out)
    print(text)
    out_path = os.path.join(cwd, 'report', 'testcase', f'{screen}-coverage.md')
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as fp:
        fp.write(text + '\n')
    print(f'\n>> Đã ghi: {out_path}', file=sys.stderr)


if __name__ == '__main__':
    main()

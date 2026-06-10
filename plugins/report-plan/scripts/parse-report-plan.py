#!/usr/bin/env python3
"""Parse Rezil sprint HTML export (Overview/Expect/Actual) và báo cáo cho 1 ngày."""
import sys, re, os
from html.parser import HTMLParser
from collections import defaultdict


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


def find_header(rows, must_have):
    for i, r in enumerate(rows):
        if must_have in r:
            return i, r
    return None, None


def num(s):
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def load_tasks(path, date):
    """Trả về list dict: {id, assignee, remaining} cho cột `date`."""
    rows = parse(path)
    hi, hdr = find_header(rows, 'ID')
    date_col = hdr.index(date) if date in hdr else None
    id_col = hdr.index('ID')
    asg_col = hdr.index('Assignee')
    out = []
    for r in rows[hi + 1:]:
        if len(r) <= max(id_col, asg_col):
            continue
        tid = r[id_col]
        if not tid:
            continue
        rem = num(r[date_col]) if date_col is not None and date_col < len(r) else None
        out.append({'id': tid, 'assignee': r[asg_col], 'remaining': rem})
    return out


def ticket_key(task_id):
    m = re.match(r'([A-Z]+-\d+)', task_id)
    return m.group(1) if m else task_id


def load_member_summary(path, date):
    """Đọc block 'II) Member Summary' -> {assignee: net_hours} cho cột `date`."""
    rows = parse(path)
    start = None
    for i, r in enumerate(rows):
        if any('Member Summary' in c for c in r):
            start = i
            break
    if start is None:
        return {}
    # header có 'Assignee' + cột ngày
    hi, hdr = None, None
    for i in range(start, min(start + 6, len(rows))):
        if 'Assignee' in rows[i] and date in rows[i]:
            hi, hdr = i, rows[i]
            break
    if hi is None:
        return {}
    asg_col = hdr.index('Assignee')
    date_col = hdr.index(date)
    out = {}
    for r in rows[hi + 1:]:
        if len(r) <= max(asg_col, date_col):
            continue
        name = r[asg_col]
        if not name or name == 'Grand Total':
            if name == 'Grand Total':
                break
            continue
        out[name] = num(r[date_col])
    return out


def load_overview_row(path, label, date):
    """Lấy giá trị 1 hàng (vd 'Actual', '% Done') trong block I) Daily Report tại cột date."""
    rows = parse(path)
    hi, hdr = None, None
    for i, r in enumerate(rows):
        if 'Type' in r and date in r:
            hi, hdr = i, r
            break
    if hi is None:
        return None
    ci = hdr.index(date)
    for r in rows[hi + 1:hi + 15]:
        if label in r and ci < len(r):
            return r[ci]
    return None


def sprint_no(folder):
    m = re.search(r'Sprint\s*(\d+)', folder)
    return m.group(1) if m else '?'


def build_report(folder, date):
    """Trả về (text báo cáo Chatwork, có_member_âm)."""
    members = load_member_summary(f'{folder}/Overview.html', date)
    negatives = sorted([(n, h) for n, h in members.items() if h is not None and h < 0],
                       key=lambda x: x[1])

    exp = load_tasks(f'{folder}/Expect.html', date)
    act = load_tasks(f'{folder}/Actual.html', date)
    exp_map = {t['id']: t for t in exp}
    by_member_tasks = defaultdict(list)
    for a in act:
        e = exp_map.get(a['id'])
        ar, er = a['remaining'], (e['remaining'] if e else None)
        if ar is None and er is None:
            continue
        diff = (ar or 0) - (er or 0)
        by_member_tasks[a['assignee']].append(
            {'id': a['id'], 'act': ar, 'exp': er, 'diff': diff})

    pct_done = load_overview_row(f'{folder}/Overview.html', '% Done', date)
    pct_exp = load_overview_row(f'{folder}/Overview.html', '% Expect', date)
    rem_act = load_overview_row(f'{folder}/Overview.html', 'Actual', date)
    rem_exp = load_overview_row(f'{folder}/Overview.html', 'Expect', date)

    def f(v):
        return v if v is not None else '?'

    # nhận xét trước/sau kế hoạch dựa trên Remaining (Actual < Expect = trước KH)
    note = ''
    a_n, e_n = num(rem_act), num(rem_exp)
    if a_n is not None and e_n is not None:
        note = ' (đang trước kế hoạch)' if a_n <= e_n else ' (đang sau kế hoạch)'

    lines = []
    lines.append(f'[info][title]Báo cáo tiến độ Sprint {sprint_no(folder)} ngày {date}[/title]')
    lines.append(f'Tổng quan: Done {f(pct_done)} / Expect {f(pct_exp)}{note}')
    lines.append(f'Remaining: Actual {f(rem_act)}h / Expect {f(rem_exp)}h')
    lines.append('')
    if not negatives:
        lines.append('■ Hôm nay không có member nào âm giờ.')
    else:
        lines.append('■ Member âm giờ (cần chú ý):')
        for name, hours in negatives:
            lines.append(f'- {name}: {hours:.0f}h')
            tasks = [t for t in by_member_tasks.get(name, []) if (t['diff'] or 0) > 0.05]
            tasks.sort(key=lambda t: -t['diff'])
            if not tasks:
                lines.append(f'  + (chưa xác định được task) - chưa xong do …')
            for t in tasks:
                # 'MINSP-007 Emergency Response - 1. BE' -> bỏ phần ID lặp, giữ mô tả task
                desc = re.sub(r'^[A-Z]+-\d+\s*', '', t['id'])
                lines.append(f"  + {ticket_key(t['id'])} {desc} -{t['diff']:.0f}h chưa xong do …")
    lines.append('[/info]')
    return '\n'.join(lines), bool(negatives)


def main():
    folder = sys.argv[1]
    date = sys.argv[2]
    text, has_neg = build_report(folder, date)

    # Ghi ra report/<YYYY-MM-DD>.txt trong thư mục làm việc hiện tại (project của người dùng)
    out_dir = os.path.join(os.getcwd(), 'report')
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, date.replace('/', '-') + '.txt')
    with open(out_path, 'w', encoding='utf-8') as fp:
        fp.write(text + '\n')

    print(text)
    print(f'\n>> Đã ghi: {out_path}', file=sys.stderr)
    if has_neg:
        print('>> Còn placeholder "do …" — cần điền lý do trước khi gửi.', file=sys.stderr)


if __name__ == '__main__':
    main()

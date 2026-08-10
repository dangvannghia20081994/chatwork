# AGENT_RULES

## Allowed

- Read Jira
- Read repository
- Create branch (`git switch -c <branch>` **before** the first edit — never edit/commit on `develop`)
- Edit code
- Run tests
- Build
- Commit (verify `git branch --show-current` ≠ `develop`/`main` first)
- Push — always `git push -u origin HEAD`; a bare `git push` on a branch with no upstream can land on `develop`
- Force-push your own branch (feature/fix, `release/*`) or a tag when needed
- Create PR
- Update Jira

## Forbidden

- Merge PR
- Deploy production
- Force-push `develop` / `main` (protected branches)
- Delete branches
- Rotate secrets
- Modify CI/CD without approval

## Failure Policy

If build/test fails:
- Stop.
- Report.
- Do not create PR.

## Rebase & tích hợp code (rezil-esms / rezil-esms-lib / rezil-esms-mobile / rezil-esms-portal)

Rút ra từ điều tra REZIL-3046: nhánh `feature/mvp2-b` sống ~2 tháng, bị force-push nhiều lần
→ mất 9 vùng code ở 5 mốc rebase. Không lần nào compiler/typecheck báo lỗi.

### A. Trước khi rebase

1. **Không rebase nhánh dài / nhánh nhiều người cùng làm.** Nhánh có >1 người commit hoặc
   sống >1 tuần → dùng `git merge develop` thay vì rebase. Rebase chỉ dùng cho nhánh cá nhân,
   ngắn ngày, chưa ai pull.
2. **Ghi lại tip cũ trước khi rebase** để verify sau: `git rev-parse HEAD > /tmp/old_tip`
   (hoặc `git branch backup/<tên>-$(date +%m%d)` — rẻ và cứu được nhiều lần).
3. **Rebase định kỳ, đừng dồn.** 242 commit replay 1 lượt là điều kiện chắc chắn sót hunk.
   Nhánh dài thì đồng bộ base theo nhịp cố định (2–3 ngày/lần).
4. TUYỆT ĐỐI KHÔNG force-push `develop` / `main`. Force-push nhánh của mình thì được.

### B. Khi resolve conflict — luật quan trọng nhất

1. **Conflict rơi vào CÙNG 1 DÒNG mà hai bên sửa HAI KHÍA CẠNH khác nhau → PHẢI GHÉP TAY.**
   Cấm `git checkout --ours/--theirs`, cấm lấy nguyên khối một bên.

   Ví dụ thật (REZIL-2814, mất code không có cảnh báo):
   ```
   bên A đổi nội dung : {siteLocationName || 'ー'}  →  {siteLocationName ?? ''}
   bên B thêm style   : <td style="word-break: break-all;">
   resolve lấy bản A  : <td>{siteLocationName ?? ''}</td>          ← MẤT style của B
   bản ĐÚNG           : <td style="word-break: break-all;">{siteLocationName ?? ''}</td>
   ```
   Dạng hay mất nhất: `style=`, `class:`, attribute, CSS override, i18n label — build pass,
   typecheck pass, chỉ hỏng hiển thị.

2. **Đừng tin "commit của mình mới hơn thì an toàn".** Rebase replay theo THỨ TỰ NHÁNH,
   KHÔNG theo author-date. Commit viết trước vẫn có thể replay sau và thắng diff.
   Chính người chạy rebase cũng tự mất code của mình theo cách này.

3. Conflict ở file bị nhiều người sửa (FE Svelte page lớn, controller dùng chung) → resolve
   xong phải đọc lại toàn bộ vùng conflict, không chỉ vùng git đánh dấu.

### C. Sau khi rebase — bắt buộc verify, không được bỏ

1. Range-diff để xem có commit nào bị drop:
   ```bash
   OLD=<tip cũ>; NEW=HEAD; MB=$(git merge-base $OLD $NEW)
   git range-diff $MB..$OLD $MB..$NEW
   ```
   - `=` byte-identical → sạch, bỏ qua
   - `<` bị DROP HẲN → điều tra ngay (trừ khi commit đó đã vào develop qua PR riêng)
   - `!` bị viết lại → PHẢI đọc hunk thật, KHÔNG đoán (xem C.3)

2. Quét riêng dạng "mất attribute/style" — compiler không bắt được:
   ```bash
   git diff $OLD $NEW | grep -E '^-.*(style=|class:|word-break|text-align|aria-)'
   ```
   Mỗi dòng `-` phải có dòng `+` tương ứng chứa lại attribute đó.

3. Nếu nghi mất mà không chắc: **đếm signature tại từng tip**, đừng suy luận từ range-diff.
   ```bash
   git reflog show origin/<branch> --date=iso | awk '{print $1}' > /tmp/t
   git reflog show origin/<branch> --date=iso | grep -oE '\{[^}]+\}' | tr -d '{}' > /tmp/d
   paste /tmp/t /tmp/d | tac > /tmp/chrono          # cũ → mới
   while read rev dt; do
     n=$(git show "$rev:<path/to/file>" 2>/dev/null | grep -cE '<signature>')
     echo "$rev $dt count=$n"
   done < /tmp/chrono                                # count tụt về 0 ở đâu = mốc gây mất
   ```
   Kết quả nhị phân (còn/mất), không phụ thuộc cách đọc diff. Range-diff chỉ dùng SAU đó
   để biết mốc đó viết lại bao nhiêu commit và committer là ai (= người đã chạy rebase).

4. **Không tin phân tích static** khi khôi phục code UI. Re-apply nguyên văn code cũ có thể là
   NO-OP nếu vùng xung quanh đã redesign. Case REZIL-2669/2335: 4 selector gốc khớp **0 phần tử**
   trên DOM vì component sinh ra chúng đã thành orphan. Grep "class còn trong repo" là chưa đủ —
   phải kiểm tra component có được RENDER không, và verify bằng DOM thật
   (`document.querySelectorAll(...).length` + `getComputedStyle(...)`).

### D. Quy tắc git chung

1. Tạo branch TRƯỚC khi sửa file: sync base xong → `git switch -c <branch>` ngay.
   Không sửa/commit khi HEAD còn ở `develop`/`main`.
2. Trước mỗi commit: `git branch --show-current`, xác nhận khác base.
3. Push lần đầu: `git push -u origin HEAD`. KHÔNG `git push` trống, KHÔNG `git push origin`.
4. Sau push: `git rev-parse --abbrev-ref --symbolic-full-name @{u}` phải ra `origin/<branch>`.
   Nếu ra `origin/develop` → dừng, báo lại, không push tiếp.
5. Lỡ commit trên base (chưa push): `git switch -c <branch>` mang commit sang, rồi
   `git branch -f <base> origin/<base>`. KHÔNG dùng `git reset --hard`.
6. Lỡ push lên base: DỪNG NGAY, báo người dùng. Không tự revert/force-push base.

### E. Checklist ngắn (dán vào PR description khi có rebase)

- [ ] Đã ghi lại tip cũ / tạo backup branch trước rebase
- [ ] `git range-diff` — không có commit `<` bất thường, đã đọc hunk mọi commit `!`
- [ ] Đã grep dòng `-` mất `style=` / `class:` / attribute, mỗi dòng đều có `+` bù lại
- [ ] Build + typecheck pass (`npm run check` / `sbt compile`)
- [ ] Với thay đổi UI: đã verify trên DOM thật, không chỉ đọc code

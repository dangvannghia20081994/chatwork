# Project: my-agent

## Rule — Convention import Jira CSV

Áp dụng mỗi khi tạo hoặc sửa file CSV để bulk-import issue vào Jira (vd `import-jira.csv`).

### Cấu trúc cột
File CSV gồm đúng 5 cột, header dòng đầu:

```
Issue ID,Summary,Issue Type,Parent ID,Sprint
```

### Quy tắc

1. **Issue ID** — mọi row PHẢI có `Issue ID`, đánh số nguyên tăng dần liên tục, không bỏ trống.
2. **Parent ID**:
   - Epic: để trống.
   - Task: PHẢI trỏ về `Issue ID` của Epic cha (không để trống).
3. **Tên Task con = `<Epic Summary> - <loại>`** — Task phải mang đúng prefix/summary của Epic cha.
   - Đúng: Epic `MINSP-005 Annual Shutdown` → Task `MINSP-005 Annual Shutdown - BE`.
   - Sai: dùng prefix của Epic khác (vd để `MINSP-004 ...` dưới Epic `MINSP-005`).
4. **Mỗi Epic có đúng 9 Task con, theo thứ tự cố định**:
   1. `BE`
   2. `FE`
   3. `UT Testcase`
   4. `UT Execute`
   5. `UT Fix`
   6. `IT Testcase`
   7. `IT Execute`
   8. `IT Fix`
   9. `IT Retest`
5. **Không trùng Epic** — mỗi Epic chỉ xuất hiện 1 lần; không lặp `Summary` của Epic.
6. **Sprint** — Epic và toàn bộ Task con thuộc cùng 1 Epic dùng chung 1 Sprint ID; Task con kế thừa Sprint của Epic cha.

### Ví dụ chuẩn (1 Epic = 1 + 9 row)

```
Issue ID,Summary,Issue Type,Parent ID,Sprint
1,MINSP-004 Annual Live,Epic,,271
2,MINSP-004 Annual Live - BE,Task,1,271
3,MINSP-004 Annual Live - FE,Task,1,271
4,MINSP-004 Annual Live - UT Testcase,Task,1,271
5,MINSP-004 Annual Live - UT Execute,Task,1,271
6,MINSP-004 Annual Live - UT Fix,Task,1,271
7,MINSP-004 Annual Live - IT Testcase,Task,1,271
8,MINSP-004 Annual Live - IT Execute,Task,1,271
9,MINSP-004 Annual Live - IT Fix,Task,1,271
10,MINSP-004 Annual Live - IT Retest,Task,1,271
```

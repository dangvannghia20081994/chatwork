<!-- PR Title (dùng cho `gh pr create --title`, không thuộc body):
     [<phase>] <SCREEN-CODE> | REZIL-XXXX - <summary>
       <phase>: theo base branch
         - develop   -> [PreUAT-MVP2-A]
         - feature/mvp2-b -> [Sprint NN]
       <SCREEN-CODE>: mã màn hình. VD: EQUIP-003, ISSUE-001, MYPAGE-001
     VD: [PreUAT-MVP2-A] EQUIP-003 | REZIL-2297 - Update filter label and conditional 低圧回路 option
     (Commit message vẫn giữ ngắn: REZIL-XXXX - <summary>) -->

## Ticket
- URL: 

## AI Usage
- Tỷ lệ code được AI hỗ trợ: __%

## Checklist
- [x] Đã đọc và nắm rõ 100% yêu cầu của ticket
- [x] Đã self-review pull request này trước khi gửi
- [x] Code thay đổi tuân thủ [Backend Pattern Guide](https://github.com/hybrid-tech-rezil/rezil-docs/blob/develop/98.translation/99.rules/BACKEND_PATTERN_GUIDE_VN.md) / [Frontend Pattern Guide](https://github.com/hybrid-tech-rezil/rezil-docs/blob/develop/98.translation/99.rules/FRONTEND_PATTERN_GUIDE_VN.md)
- [ ] Đã chạy pass code quality (BE: `sbt scalafmtCheckAll "scalafix --check"`; FE: `npm run check`)
- [ ] Đã chạy pass code security (`./semgrep-rules/scan.sh`)

<!-- ⚠️ 2 mục [ ] trên là GATE BẮT BUỘC — TRÌNH TỰ: chạy lệnh -> pass -> MỚI tích [x] -> MỚI tạo PR.
     TUYỆT ĐỐI KHÔNG tự tích khi chưa chạy (không tick mù). Fail -> sửa, chạy lại tới khi pass rồi mới tích.
       1. FE: `npm run check`   (BE: `sbt scalafmtCheckAll "scalafix --check"`)
       2. Security: `./semgrep-rules/scan.sh`
     Cả 2 pass -> đổi [ ] thành [x] cho đúng thực tế -> `gh pr create`. Chỉ tích mục đã thực chạy & pass. -->

> Khi xác nhận các mục trên, tôi cam kết đã kiểm tra kỹ lưỡng và chịu trách nhiệm đối với các lỗi cơ bản hoặc lỗi lặp lại.

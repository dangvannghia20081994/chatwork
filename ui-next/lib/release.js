// Release console: drive the `github-ops` agent (gh CLI) to run the RELEASE_FLOW for the rezil
// repos — promote PRs (DEV1), create releases/tags, watch CI. Multi-turn (resume) so the agent's
// "confirm before a write action" rule plays out across turns in the conversation.
//
// Mirrors elearning's release-agent (claude -p --agent github-ops), but reuses this project's
// claudeSSE pump for parity with the rest of the UI.
import { NO_DEGRADE_SAFETY, WORDING_INSTR } from "./claude.js";

export const RELEASE_AGENT = "github-ops";

// Releases legitimately MERGE PRs (DEV1 promote) after an in-chat confirm, so `gh pr merge` is left
// ENABLED. Code edits (Edit/Write) are ALSO enabled: a release routinely needs to resolve
// cherry-pick conflicts, apply a small build fix, or sync CHANGELOG/version by editing files — the
// github-ops.md rules require an in-chat confirm before the commit/push that ships those edits.
// Everything destructive a release never needs is blocked. The agent's tools are Bash (gh/git) +
// file edits, so the real attack surface is Bash command patterns — keep that denylist tight.
// NOTE: pattern matching is prefix-based and not bulletproof (e.g. `gh api` can still call the API);
// the github-ops.md confirm rules + your in-chat approval remain the primary brakes.
export const RELEASE_DISALLOWED = [
  // No interactive prompts / notebook edits. Source-file Edit/Write are allowed (release conflict
  // resolution / build fixes / CHANGELOG sync); the commit/push that ships them still needs confirm.
  "AskUserQuestion",
  "NotebookEdit",
  // Auth / identity / config — never touched.
  "Bash(gh auth:*)",
  "Bash(git config:*)",
  // Repo settings / deletion.
  "Bash(gh repo delete:*)",
  "Bash(gh repo archive:*)",
  "Bash(gh repo edit:*)",
  "Bash(gh repo rename:*)",
  // CI secrets / variables.
  "Bash(gh secret:*)",
  "Bash(gh variable:*)",
  // Release / tag DELETION (create/edit allowed with confirm; delete never).
  "Bash(gh release delete:*)",
  "Bash(gh release delete-asset:*)",
  // Delete pushes + local history rewrite — backups exist, never rewrite/destroy.
  // NOTE: force-push is allowed for the DEV1 re-tag step (`git push --force origin refs/tags/<tag>`)
  // and for release branches (`release/*`). Prefix matching can't tell the target ref from the
  // pattern, so neither `--force` nor `--force-with-lease` is hard-blocked here — the system prompt
  // is the brake forbidding force-push of `develop`/`main`.
  "Bash(git push --delete:*)",
  "Bash(git push -d:*)",
  "Bash(git reset --hard:*)",
  "Bash(git clean:*)",
  "Bash(git rebase:*)",
  "Bash(git merge:*)",
  // Destructive shell escapes.
  "Bash(rm:*)",
  "Bash(sudo:*)",
  // Best-effort guard against gh api being used to delete.
  "Bash(gh api -X DELETE:*)",
  "Bash(gh api --method DELETE:*)",
  // Google Drive evidence upload runs through rclone (remote `gdrive-rezil`). mkdir/copy/lsf/lsjson
  // are what the flow needs; everything that deletes, moves, re-shares, or touches remote tokens is
  // blocked. `rclone link` is blocked on purpose: it grants "anyone with link" on a project file.
  "Bash(rclone delete:*)",
  "Bash(rclone deletefile:*)",
  "Bash(rclone purge:*)",
  "Bash(rclone rmdir:*)",
  "Bash(rclone rmdirs:*)",
  "Bash(rclone move:*)",
  "Bash(rclone moveto:*)",
  "Bash(rclone sync:*)",
  "Bash(rclone cleanup:*)",
  "Bash(rclone config:*)",
  "Bash(rclone link:*)",
];

// Console-specific config only — the DEV1 release PROCEDURE lives in the github-ops agent
// (~/.claude/agents/github-ops.md, also tracked at .claude/agents/), loaded via --agent. We only
// inject the current timestamp (the agent must not self-generate one) + console-mode rules here.
export function releaseSystemPrompt(nowStamp) {
  return [
    "Bạn đang chạy trong Release Console của AI agent — phiên qua web UI, ĐA LƯỢT (multi-turn).",
    "Tường thuật bằng TIẾNG VIỆT, gọn. Giữ tiếng Anh cho lệnh shell/gh, tên branch/tag, commit.",
    `Thời điểm hiện tại = ${nowStamp} (YYYYMMDD-HHMM). Dùng phần ngày YYYYMMDD cho hậu tố nhánh release;`,
    "KHÔNG tự sinh ngày-giờ.",
    "Bám SÁT quy trình Release/Deploy trong github-ops.md (DEV1: nhánh release DATED + subset cherry-pick",
    "+ push tag; lib TRƯỚC → admin/mobile/portal; đồng bộ dòng đầu CHANGELOG các repo trước khi tag; KHÔNG backup,",
    "KHÔNG promote-PR nhánh persistent). Mỗi đợt đi ĐỦ 4 repo kể cả portal: portal không có commit in-scope thì vẫn",
    "ghi rõ 1 dòng \"portal: không có commit in-scope\" và VẪN release portal (nhánh dated từ base, sync CHANGELOG",
    "sang X.Y.Z của đợt, tag) để version 4 repo không lệch — KHÔNG bỏ portal khỏi đợt tag.",
    "COMMIT MESSAGE CHANGELOG — CỐ ĐỊNH, KHÔNG tự sáng tạo: commit đụng `CHANGELOG.md` trên nhánh release có tiêu đề",
    "đúng 1 dòng `chore: update CHANGELOG for X.Y.Z` (X.Y.Z = version của đợt; KHÔNG prefix tag `dev1/`/`stg/`,",
    "KHÔNG kèm ngày, KHÔNG chữ `v`), không body, không Co-Authored-By. CẤM các biến thể tự đặt như",
    "`docs(changelog): update for X.Y.Z`, `docs: ...`, `Update changelog vX.Y.Z`, `Update CHANGELOG.md for X.Y.Z`,",
    "`Sync X.Y.Z`, `REZIL-XXXX - Update CHANGELOG ...`. Git history có nhiều style cũ lẫn nhau — KHÔNG copy style từ",
    "commit cũ. Commit bump trên `develop` giữ nguyên `chore: bump version to X.Y.Z`.",
    "ASSIGN LẠI KHI CẬP NHẬT JIRA — cùng bước đổi label, KHÔNG bỏ. Assign THEO TỪNG TICKET (một đợt có thể nhiều người,",
    "mỗi ticket một người): DEV1 → người YÊU CẦU BUILD ticket đó, TỰ ĐỌC COMMENT ticket để tìm, KHÔNG hỏi user trước:",
    "`getJiraIssue` với `fields: [\"comment\",\"reporter\",\"assignee\",\"labels\",\"status\"]` → duyệt comment từ MỚI NHẤT về cũ,",
    "lấy comment đầu tiên là yêu cầu build (mẫu thật: `SQA verified OK on server 207` + `Nhờ dev merge và build dev1`;",
    "nhận diện `build` kèm `dev1/stg/staging`, `nhờ dev merge`, `SQA verified OK` — bỏ qua comment PR / `Review: OK` /",
    "`Check OK trên 207`) → assignee = `author.accountId` của comment đó (có sẵn accountId, KHÔNG cần lookup).",
    "STG → REPORTER của từng ticket (`getJiraIssue` field `reporter.accountId`). Dựng bảng `ticket → assignee` kèm nguồn",
    "(id comment) trước, đưa vào cùng confirm với label; tổng kết in bảng đã ghi thật. Ticket không có comment nào khớp →",
    "dùng tên user đã nêu (tra `lookupJiraAccountId`), không có nữa thì để ticket đó lại và HỎI user, KHÔNG đoán.",
    "Theo §Assign lại sau deploy trong github-ops.md.",
    "COMMENT JIRA SAU DEPLOY — cùng bước trên, mỗi ticket 1 comment nội dung CỐ ĐỊNH: DEV1 → `Đã deploy DEV1`;",
    "STG → `Đã deploy STG`. Đúng 1 dòng đó, KHÔNG thêm version/tag/link/ngày/emoji, KHÔNG dấu vết AI, không comment trùng.",
    "Ticket bị skip (không transition được) thì KHÔNG comment. Theo §Comment sau deploy trong github-ops.md.",
    "BƯỚC CUỐI khi release DEV1 — 3 việc SONG SONG sau khi CI dev1 pass, đủ cả 3 mới xong đợt DEV1:",
    "(a) cập nhật Jira (Resolved + `labels = [dev1-deployed]` + assign lại người yêu cầu build từng ticket + comment `Đã deploy DEV1`, confirm trước);",
    "(b) TẠO/ĐIỀN tab deploy RIÊNG cho đợt DEV1 trên Google Sheet Deployment — DEV1 CŨNG phải có tab, không riêng STG, và",
    "KHÔNG dùng chung tab với STG dù cùng ngày (cùng ngày đã có tab của đợt khác → tab mới hậu tố `_1`/`_2`): copy tab",
    "`Template`, điền giá trị đợt DEV1 (ô `D5` Environment = `DEV1` — KHÔNG để `DEV1 + Staging` mặc định của Template;",
    "nhánh `release/dev1/...`, tag `dev1/v<X.Y.Z>`, version dev1, nhãn folder",
    "`dd/MM Deploy Dev1 UAT <Phase>`) + danh sách ticket + PIC; tab của ngày đó có rồi thì dùng lại, chỉ bù ô trống;",
    "(c) folder evidence Drive + 4 link ảnh vào ô cột `J` dòng activity 1. KHÔNG bump version sau DEV1.",
    "BƯỚC CUỐI khi release STG — 4 việc SONG SONG sau khi CI stg pass, đủ cả 4 mới coi là xong đợt:",
    "(a) cập nhật Jira các ticket của đợt (Resolved + `labels = [staging-deployed]` + ASSIGN LẠI cho REPORTER của từng ticket + comment `Đã deploy STG`, confirm trước);",
    "(b) bump version lên trên `develop` (chỉ STG, KHÔNG bump sau DEV1): commit `chore: bump version to X.Y.Z`,",
    "commit thường KHÔNG force-push `develop`, confirm trước. Commit bump này PHẢI sync luôn block `### Changed` của",
    "version vừa release vào CHANGELOG develop (develop chưa có vì lúc release chỉ append trên nhánh release) — chung 1 commit, không tách riêng;",
    "(c) tab deploy RIÊNG cho đợt STG trên Google Sheet Deployment — MỖI ĐỢT 1 TAB, DEV1 và STG KHÔNG dùng chung tab kể cả",
    "cùng ngày (danh sách ticket 2 đợt có thể khác nhau): `list_sheets` trước, cùng ngày đã có tab DEV1 thì tạo tab MỚI hậu tố",
    "`_1`/`_2` (tiền lệ `07/07_1`), KHÔNG ghi đè tab DEV1; chỉ dùng lại tab khi đó là tab của CHÍNH đợt STG này (đối chiếu ô",
    "`D5` + `D7`). Copy tab `Template` rồi điền thông tin đợt (`D5` = `Staging`) +",
    "danh sách ticket — theo §Google Sheet Deployment trong github-ops.md (spreadsheet `1ADSGwRCwLI2_Jn26WMYkMnFjQueudUN6PqipErtUimc`,",
    "MCP `mcp__gsheets-rezil__*`). Phần ngày của tên tab lấy từ mốc thời gian ở trên, KHÔNG tự sinh ngày;",
    "KHÔNG sửa tab `Template` và KHÔNG sửa tab của đợt khác. Xong thì báo link tab cho user.",
    "(d) folder evidence trên Google Drive: tạo folder đợt `dd／MM Deploy <Env> UAT <Phase>` trong folder gốc",
    "`16lz2OJe1oaNtmx_t3H4uk1hMlbbKiLLY` (nếu chưa có) → ghi link folder đợt vào ô `D10` của tab ĐỢT ĐÓ dạng",
    "`=HYPERLINK(\"https://drive.google.com/drive/folders/<ID>\",\"19/08 Deploy Staging UAT MVP2-B\")` — đọc lại ô đó,",
    "thấy `#ERROR!` thì ghi lại với `;` thay `,` cho khớp locale; DEV1+STG cùng ngày dùng chung FOLDER Drive nhưng tab riêng",
    "nên mỗi tab tự ghi `D10` của nó (cùng link folder, nhãn theo môi trường), KHÔNG đụng `D10` tab đợt kia",
    "→ folder con `DEV1`/`STG` → upload 4 ảnh CI success từ",
    "`~/deploy-evidence/<dd-MM>/<DEV1|STG>/` (`lib.png`, `admin.png`, `mobile.png`, `portal.png`) → ghi 4 link",
    "`https://drive.google.com/file/d/<ID>/view` vào ô cột `J` (`Evidence Images`) của dòng activity 1 (DEV1) hoặc",
    "activity 3 (STG) TRONG TAB CỦA ĐỢT ĐÓ — số dòng đổi theo số ticket của đợt nên phải dò bằng `find_in_spreadsheet` với",
    "query `Deploy toàn bộ các ticket lên Dev1` / `... lên Staging` rồi ghi cột `J` của đúng dòng đó,",
    "KHÔNG hardcode. Mỗi ảnh 1 dòng, URL THUẦN (không nhãn `lib:`/`admin:`..., không `=HYPERLINK`), thứ tự lib → admin → mobile → portal.",
    "Ô này PHẢI ghi bằng `batch_update` request `updateCells` + `textFormatRuns` (mỗi URL 1 run có `link.uri`, run rỗng ở dấu xuống dòng)",
    "— ghi bằng `update_cells`/`batch_update_cells` thì link chỉ là text, không click được. Mẫu JSON ở §Evidence Folder trong github-ops.md.",
    "Dùng `rclone` remote `gdrive-rezil` (KHÔNG dùng remote `gdrive` — account cá nhân cho backup; KHÔNG dùng service",
    "account, nó không có dung lượng Drive). Tên folder đợt dùng ký tự FULLWIDTH `／` (U+FF0F) như các đợt cũ nên lệnh",
    "`rclone mkdir` PHẢI kèm `--drive-encoding=None`. Thiếu ảnh → dừng và báo user, KHÔNG upload thiếu.",
    "Theo §Evidence Folder trên Google Drive trong github-ops.md.",
    "ĐƯỢC sửa code khi release cần (resolve conflict cherry-pick, fix build nhỏ, sync CHANGELOG/version) —",
    "nhưng KHÔNG làm feature/refactor ngoài scope; commit/push đưa các sửa đó đi vẫn phải confirm trước.",
    "Với mọi ACTION GHI (push nhánh/tag, `git tag -f`, merge PR, trigger workflow): DỪNG lại, nêu rõ lệnh +",
    "repo, hỏi user xác nhận, đợi lượt sau MỚI thực hiện — KHÔNG tự ý làm. DEV1 và STG đều được phép (STG BẮT BUỘC confirm trước). CẤM release PRODUCTION.",
    "Force-push được cho TAG (`refs/tags/...`) và nhánh release (`release/*`) khi cần (sau confirm), TUYỆT ĐỐI KHÔNG force-push `develop`/`main`. KHÔNG thêm mọi dấu vết AI",
    "vào PR title/body hay commit message.",
    NO_DEGRADE_SAFETY,
    WORDING_INSTR,
    "Kết thúc MỖI lượt bằng khối gợi ý, định dạng CHÍNH XÁC: một dòng `<<<SUGGEST>>>` rồi 2–3 dòng, mỗi dòng",
    "`- <gợi ý ngắn bấm để làm/hỏi tiếp>` (vd liệt kê ticket, tag lib, check CI). Tiếng Việt, không viết gì sau khối này.",
  ].join("\n");
}

export function buildReleaseArgv(message, sessionId, nowStamp, addDirs) {
  return [
    "-p", message,
    "--agent", RELEASE_AGENT,
    "--permission-mode", "bypassPermissions",
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--append-system-prompt", releaseSystemPrompt(nowStamp),
    ...addDirs.flatMap((d) => ["--add-dir", d]),
    "--disallowedTools", ...RELEASE_DISALLOWED,
    ...(sessionId ? ["--resume", sessionId] : []),
  ];
}

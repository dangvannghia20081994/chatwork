// Rebase console: drive the `git-rebaser` agent to rebase a branch onto its latest base, resolve
// conflicts, squash/reword history, and force-push (with lease) the result. Multi-turn (resume) so
// the agent's "confirm before a write action" rule plays out across turns — a rebase routinely
// pauses on conflicts and waits for the user before `--continue` or the force-push.
//
// Sibling of release.js (same claudeSSE pump); the key difference is `git rebase`/`git merge` stay
// ENABLED here (they're the whole point) while merge-PR and release-only actions are irrelevant.

export const REBASE_AGENT = "git-rebaser";

// The agent's only real surface is Bash (git) + read-only file tools. Rebase legitimately needs
// `git rebase` (+ its --continue/--abort), `git reset --soft` (squash) and `git push --force-with-lease`,
// so those are LEFT ENABLED — the git-rebaser.md confirm rules + your in-chat approval are the brake.
// Everything a rebase never needs (hard reset, clean, delete-push, merge PR, repo/secret mutation,
// auth/config) is blocked here.
// NOTE: prefix matching can't tell the target ref from the pattern, so `--force` on develop/main is
// NOT hard-blocked — the system prompt forbidding it is the primary guard (as in release.js).
export const REBASE_DISALLOWED = [
  "AskUserQuestion",
  "NotebookEdit",
  // Auth / identity / config — never touched.
  "Bash(gh auth:*)",
  "Bash(git config:*)",
  // Repo settings / deletion / secrets.
  "Bash(gh repo delete:*)",
  "Bash(gh repo archive:*)",
  "Bash(gh repo edit:*)",
  "Bash(gh secret:*)",
  "Bash(gh variable:*)",
  // A rebaser never merges PRs or releases.
  "Bash(gh pr merge:*)",
  "Bash(gh release:*)",
  // Hard reset / clean would silently destroy work — `reset --soft` (squash) stays allowed.
  "Bash(git reset --hard:*)",
  "Bash(git clean:*)",
  // Delete-push (branch/tag removal) — never.
  "Bash(git push --delete:*)",
  "Bash(git push -d:*)",
  // Destructive shell escapes.
  "Bash(rm:*)",
  "Bash(sudo:*)",
  "Bash(gh api -X DELETE:*)",
  "Bash(gh api --method DELETE:*)",
];

// Console-mode rules only — the rebase PROCEDURE lives in the git-rebaser agent
// (~/.claude/agents/git-rebaser.md), loaded via --agent. We inject the current timestamp (the agent
// must not self-generate one — used for backup-branch naming) + web-console conventions here.
export function rebaseSystemPrompt(nowStamp) {
  return [
    "Bạn đang chạy trong Rebase/Merge Console của AI agent — phiên qua web UI, ĐA LƯỢT (multi-turn).",
    "Tường thuật bằng TIẾNG VIỆT, gọn. Giữ tiếng Anh cho lệnh git/gh, tên branch/base, commit hash.",
    `Thời điểm hiện tại = ${nowStamp} (YYYYMMDD-HHMM). Dùng cho hậu tố nhánh tạm/backup (<branch>-<stamp>);`,
    "KHÔNG tự sinh ngày-giờ.",
    "Bám SÁT git-rebaser.md. ĐO diverge TRƯỚC (ahead/behind + nhánh dùng chung?) rồi CHỐT rebase hay MERGE —",
    "KHÔNG mặc định rebase: nhánh diverge nhiều / dùng chung (vd feature/mvp2*) thì MERGE develop vào nhánh",
    "(resolve 1 lần, không rewrite history, không force-push). Preview conflict bằng `git merge-tree --write-tree`.",
    "LUÔN thao tác trên NHÁNH TẠM (rebase-test/… hoặc merge-test/…), KHÔNG đụng nhánh gốc. Bật rerere + union",
    "driver cho CHANGELOG.md. Resolve theo BẢN CHẤT (develop thay logic → giữ develop; nhánh thêm feature mới →",
    "GỘP CẢ HAI; add/add hoặc xung đột migration đóng băng → ESCALATE, KHÔNG tự quyết). Sau resolve BUILD verify",
    "(sbt compile…) TRƯỚC khi commit/kết luận.",
    "Base KHÔNG mặc định `develop` — nhánh MVP2 thường từ `feature/mvp2`; không chắc base thì HỎI, KHÔNG đoán.",
    "Với MỌI action ghi (git rebase|merge / --continue|--abort, reset --soft squash, commit merge, git push --force-with-lease):",
    "DỪNG lại, nêu rõ lệnh + repo + branch, hỏi user xác nhận, đợi lượt sau MỚI thực hiện — KHÔNG tự ý làm.",
    "TUYỆT ĐỐI KHÔNG force-push `develop`/`main`/`master`. KHÔNG `gh pr merge` (ship PR). Không rebase nhánh dùng chung.",
    "KHÔNG làm feature/refactor ngoài phạm vi resolve conflict. KHÔNG thêm dấu vết AI vào commit message.",
    "Kết thúc MỖI lượt bằng khối gợi ý, định dạng CHÍNH XÁC: một dòng `<<<SUGGEST>>>` rồi 2–3 dòng, mỗi dòng",
    "`- <gợi ý ngắn bấm để làm/hỏi tiếp>` (vd xem diff conflict, abort rebase, force-push nhánh). Tiếng Việt, không viết gì sau khối này.",
  ].join("\n");
}

export function buildRebaseArgv(message, sessionId, nowStamp, addDirs) {
  return [
    "-p", message,
    "--agent", REBASE_AGENT,
    "--permission-mode", "bypassPermissions",
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--append-system-prompt", rebaseSystemPrompt(nowStamp),
    ...addDirs.flatMap((d) => ["--add-dir", d]),
    "--disallowedTools", ...REBASE_DISALLOWED,
    ...(sessionId ? ["--resume", sessionId] : []),
  ];
}

// Release console: drive the `github-ops` agent (gh CLI) to run the RELEASE_FLOW for the rezil
// repos — promote PRs (DEV1), create releases/tags, watch CI. Multi-turn (resume) so the agent's
// "confirm before a write action" rule plays out across turns in the conversation.
//
// Mirrors elearning's release-agent (claude -p --agent github-ops), but reuses this project's
// claudeSSE pump for parity with the rest of the UI.

export const RELEASE_AGENT = "github-ops";

// Releases legitimately MERGE PRs (DEV1 promote) after an in-chat confirm, so `gh pr merge` is left
// ENABLED. Everything destructive a release never needs is blocked. The agent's only tool is Bash
// (gh/git), so the real attack surface is Bash command patterns — keep that denylist tight.
// NOTE: pattern matching is prefix-based and not bulletproof (e.g. `gh api` can still call the API);
// the github-ops.md confirm rules + your in-chat approval remain the primary brakes.
export const RELEASE_DISALLOWED = [
  // No interactive / notebook / code edits — release touches GitHub via gh, never source code.
  "AskUserQuestion",
  "NotebookEdit",
  "Edit",
  "Write",
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
  // Force / delete pushes + local history rewrite — backups exist, never rewrite/destroy.
  // NOTE: raw `git push --force` / `-f` is intentionally NOT blocked — the DEV1 re-tag step needs
  // `git push --force origin refs/tags/<tag>`. Prefix matching can't tell tag- from branch-force-push,
  // so the system prompt is the brake limiting raw --force to refs/tags only. The branch force-push
  // form (`--force-with-lease origin <branch>`) stays blocked below, so branch force-push is hard-denied.
  "Bash(git push --force-with-lease:*)",
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
    "+ push tag; lib TRƯỚC → admin/mobile; đồng bộ dòng đầu CHANGELOG 3 repo trước khi tag; KHÔNG backup,",
    "KHÔNG promote-PR nhánh persistent).",
    "Với mọi ACTION GHI (push nhánh/tag, `git tag -f`, merge PR, trigger workflow): DỪNG lại, nêu rõ lệnh +",
    "repo, hỏi user xác nhận, đợi lượt sau MỚI thực hiện — KHÔNG tự ý làm. CHỈ DEV1, CẤM STG.",
    "Force-push CHỈ cho TAG (`refs/tags/...`), TUYỆT ĐỐI KHÔNG force-push nhánh. KHÔNG thêm mọi dấu vết AI",
    "vào PR title/body hay commit message.",
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

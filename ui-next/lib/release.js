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
  "Bash(git push --force:*)",
  "Bash(git push -f:*)",
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

// github-ops.md requires the caller to PASS IN the backup timestamp (it must not self-generate one).
// Headless runs have no Lucy to supply it, so we inject the current stamp via the system prompt.
export function releaseSystemPrompt(nowStamp) {
  return [
    "Bạn đang chạy trong Release Console của AI agent — phiên qua web UI, ĐA LƯỢT (multi-turn).",
    "Tường thuật bằng TIẾNG VIỆT, gọn. Giữ tiếng Anh cho lệnh shell/gh, tên branch/tag, commit.",
    `Thời điểm hiện tại = ${nowStamp}. Dùng ĐÚNG mốc này cho hậu tố backup branch -YYYYMMDD-HHMM`,
    "(github-ops yêu cầu caller cấp giờ, không tự sinh).",
    "Với mọi ACTION GHI (merge PR, tạo/sửa/xoá release-tag, trigger workflow): DỪNG lại, nêu rõ lệnh",
    "sắp chạy + repo, hỏi user xác nhận, rồi đợi lượt trả lời sau MỚI thực hiện — KHÔNG tự ý làm.",
    "Tuân thủ tuyệt đối github-ops.md & RELEASE_FLOW: CHỈ DEV1, CẤM STG; KHÔNG thêm mọi dấu vết AI",
    "vào PR title/body hay commit message.",
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

// Feature mode (REZIL): BD + Figma → spec → testcase → OpenAPI/Aspida → Scala LIB/BE → Svelte FE → PR.
// The design-first / testcase-first / contract-first workflow. Reads CLAUDE.md / WORKFLOW_FEATURE.md /
// prompts/feature_workflow.md from ROOT. Mirrors lib/auto.js; kept fully separate so the fix-bug
// workflow (lib/auto.js) is untouched.
import fs from "fs";
import path from "path";
import { ROOT, loadConfig } from "./config.js";
import { DISALLOWED_TOOLS } from "./claude.js";

function readRoot(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// Re-exported so the route can validate the ticket the same way auto mode does.
export function assertTicketKey(key) {
  if (!key || !/^REZIL-\d+$/.test(key)) {
    throw new Error(`Invalid ticket key "${key}". Expected REZIL-<number>.`);
  }
}

// Compact "config facts" so Claude can self-derive type/repo/screen from the ticket.
function configFacts() {
  const jira = loadConfig("jira");
  const gh = loadConfig("github");
  const repoLines = Object.entries(gh.repos)
    .map(([name, r]) => `  - ${name}: ${r.path} (base ${r.baseBranch}; ${r.role})`)
    .join("\n");
  const map = Object.entries(jira.branchTypeByIssueType)
    .map(([k, v]) => `${k}→${v}`)
    .join(", ");
  return [
    "## Project config (derive the rest from the ticket)",
    `Repos:\n${repoLines}`,
    `Default repo: ${gh.defaultRepo}. Base branch: feature/mvp2.`,
    `Issue type → branch type: ${map} (else ${jira.defaultBranchType}).`,
    "Screen code (e.g. ISSUE-001, EQUIP-003): take it from the ticket summary/fields.",
  ].join("\n");
}

export function assembleFeatureSystemPrompt() {
  const parts = [
    "## Role & rules (CLAUDE.md)\n" + readRoot("CLAUDE.md"),
    "## Feature workflow (WORKFLOW_FEATURE.md)\n" + readRoot("WORKFLOW_FEATURE.md"),
    "## Task template (prompts/feature_workflow.md)\n" + readRoot("prompts/feature_workflow.md"),
    "## Jira comment template (templates/jira_comment.md)\n" + readRoot("templates/jira_comment.md"),
    "## Migration template (templates/migration.md)\n" + readRoot("templates/migration.md"),
    "## PR body template (templates/pr_template.md)\n" + readRoot("templates/pr_template.md"),
    "## DB knowledge (memory/database.md)\n" + readRoot("memory/database.md"),
    "## Known recurring bugs (memory/common_bugs.md)\n" + readRoot("memory/common_bugs.md"),
    "## Coding style & quality gates (memory/coding_style.md)\n" + readRoot("memory/coding_style.md"),
    "## Architecture (memory/architecture.md)\n" + readRoot("memory/architecture.md"),
    configFacts(),
    [
      "## OUTPUT LANGUAGE (highest priority)",
      "Tường thuật/giải thích hiển thị cho người dùng PHẢI bằng TIẾNG VIỆT — mọi câu mô tả tiến trình,",
      "phân tích, kết luận, và khối ⛔ NEED-INFO đều viết tiếng Việt.",
      "GIỮ NGUYÊN tiếng Anh cho: commit message `REZIL-XXXX - <summary>`, tên branch, PR title theo",
      "convention, mã nguồn, đường dẫn file và lệnh shell. Các phase artifact (.ai-agent/generated/*.md)",
      "viết bằng tiếng Anh theo template trong workflow.",
      "Khi TƯỜNG THUẬT liệt kê dữ liệu có cấu trúc cho người dùng (phase + kết quả, quality gate, file",
      "đã sửa, map BD↔Figma...) → dùng BẢNG Markdown (GFM) cho dễ đọc; UI render markdown. CHỈ áp dụng",
      "cho tường thuật — TUYỆT ĐỐI KHÔNG dùng cho PR body / commit / Jira comment / artifact (giữ ĐÚNG template).",
      "",
      "## FEATURE MODE (highest priority)",
      "You build a NEW feature from design docs (BD + Figma) following the 16-phase workflow above.",
      "You are given a Jira ticket key and an optional free-form CONTEXT block (pasted BD text, Figma",
      "links, or repo-relative BD paths). First read the ticket (mcp__atlassian__getJiraIssue) and its",
      "remote links (mcp__atlassian__getJiraIssueRemoteIssueLinks) plus the CONTEXT to gather BD + Figma.",
      "You CANNOT open an auth-gated Figma file — use pasted text / fetchable links / screenshots only;",
      "where the UI is undetermined, record an Assumption (do NOT invent UI).",
      "",
      "## ARTIFACTS",
      "At the START of the run, git-ignore the artifact dir: append `.ai-agent/` to `.git/info/exclude`",
      "in each repo you touch. Write each phase's output to `.ai-agent/generated/NN-*.md` in the target",
      "repo working tree as the audit trail. Do NOT commit these files. The PR body carries only a digest.",
      "",
      "## INFO GATE (check at Phase 0–1, BEFORE writing any code)",
      "After reading ticket + remote links + CONTEXT, judge whether there is ENOUGH to build safely.",
      "If NOT — no usable BD, no acceptance criteria, Figma absent and UI undetermined, cannot scope the",
      "target repo, or the feature is too ambiguous/risky — then DO NOT create a branch and DO NOT edit",
      "anything. Instead output a block that STARTS with the exact token `⛔ NEED-INFO:` followed by a",
      "short list of what is missing / what you'd need, then STOP. Take no mutating actions (user decides).",
      "",
      "## IF ENOUGH INFO — run the 16 phases end-to-end, STOPPING at PR creation:",
      "Phase 0 Intake → 1 Read BD → 2 Structured spec → 3 UT cases → 4 IT cases → 5 Read Figma →",
      "6 Map BD↔Figma → 7 OpenAPI contract → 8 Aspida client → 9 Scala LIB → 10 Scala BE → 11 Svelte FE →",
      "12 UT impl+run → 13 IT impl+run → 14 Build/Lint/Typecheck → 15 Review → 16 PR/ticket.",
      "Design-first (no code before BD analysis), testcase-first (UT before code), contract-first (OpenAPI",
      "is the BE↔FE contract — changing it obliges updating BE + FE + Aspida + tests together).",
      "Never invent API/field/business rule/UI; missing info → Assumption. Domain rules live in LIB,",
      "not controllers. Never hardcode an API URL/fetch in FE when Aspida exists.",
      "MIGRATION (Phase 9/10 nếu có schema/data change): theo templates/migration.md — sinh file bằng",
      "`./etc/scripts/new-migration.sh <db> <folder> \"<desc>\"` (db=esms/inspection, folder=common/env-*),",
      "tên `V<YYYYMMDDHHMMSS>__<desc>.sql`. KHÔNG gõ tay version, KHÔNG sửa migration đã apply.",
      "",
      "## MULTI-REPO",
      "A feature spanning LIB + BE may produce a branch + PR in BOTH `rezil-esms-lib` and `rezil-esms`.",
      "Use the same branch convention <type>/YYYY-MM-REZIL-XXXX-<SCREEN-CODE>, base feature/mvp2, per repo.",
      "Land the LIB PR first if BE depends on it; cross-link the PRs in their bodies and the Jira comment.",
      "Single-repo when the change is single-repo.",
      "",
      "## QUALITY GATES (must pass before any PR)",
      "BE/LIB: `sbt scalafmtCheckAll \"scalafix --check\"`, `sbt test`, `sbt compile`. FE: `npm run check`,",
      "FE unit tests, `npm run build`. Regenerate the Aspida client and confirm it builds. Security:",
      "`./semgrep-rules/scan.sh`. If any gate FAILS: stop, report the failure, do NOT open the PR.",
      "",
      "## PR",
      "Per affected repo: title `[<phase>] <SCREEN-CODE> | REZIL-XXXX - <summary>`, base feature/mvp2.",
      "PHASE: lấy TỪ TICKET — tag `[...]` ở ĐẦU summary ticket (vd `[PreUAT- MVP2-A] ...` → `PreUAT-MVP2-A`,",
      "chuẩn hoá bỏ khoảng trắng thừa). Nếu summary KHÔNG có tag phase → dùng `UAT-MVP2-A`. Không suy từ base branch.",
      "PR BODY RULE (strict): body MUST be EXACTLY templates/pr_template.md, only filling placeholders",
      "(Ticket URL, AI Usage %, tick boxes that ACTUALLY passed). Do NOT add/remove/reorder any section;",
      "do NOT append a Changes/Tests/Risk/Assumptions digest, footer, or extra prose to the PR body —",
      "that digest lives ONLY in the .ai-agent/generated/* artifacts, never in the PR body. Use",
      "`gh pr create --body-file <the filled template file>` (NOT --body with hand-written text).",
      "Then comment the Jira ticket using EXACTLY templates/jira_comment.md: fill {{pr_link}} (full PR",
      "URL as MARKDOWN link `[<url>](<url>)`) and {{scope}}, DROP the # note lines, add nothing else.",
      "",
      "## HARD LIMITS",
      "NEVER merge a PR, NEVER deploy, NEVER touch secrets/CI, NEVER force-push `develop`/`main` (force-pushing your own feature branch is fine when needed).",
      "You MAY use the Task tool to delegate per-phase work to keep context small.",
      "This is non-interactive: do NOT ask the user questions. If scope is ambiguous, STATE your",
      "Assumption explicitly and proceed (unless the INFO GATE triggers).",
    ].join("\n"),
  ];
  return parts.join("\n\n---\n\n");
}

export function assembleFeatureUserPrompt(ticket, repo, context) {
  const ctx = (context || "").trim();
  return [
    `Build the feature for Jira ticket ${ticket}, primary repo "${repo.name}" (${repo.path}).`,
    `Read the ticket + its remote links (Atlassian) and the CONTEXT below for BD + Figma, then follow`,
    `WORKFLOW_FEATURE.md (16 phases) end-to-end up to creating the PR(s) (never merge/deploy).`,
    `A LIB+BE feature may also touch rezil-esms-lib — create a PR per affected repo.`,
    "",
    "## CONTEXT (BD / Figma — pasted text, links, or repo-relative paths)",
    ctx || "(none provided — rely on the ticket + its remote links; if BD is missing, hit the INFO GATE)",
  ].join("\n");
}

// Tools the feature run may use without a prompt (headless). Superset of AUTO_ALLOWED:
// adds Task (per-phase sub-agents), WebFetch/WebSearch (OpenAPI/Figma links), TodoWrite.
export const FEATURE_ALLOWED = [
  "Read", "Grep", "Glob", "Edit", "Write", "Bash", "Task", "TodoWrite", "WebSearch", "WebFetch",
  "mcp__atlassian__getJiraIssue",
  "mcp__atlassian__searchJiraIssuesUsingJql",
  "mcp__atlassian__getJiraIssueRemoteIssueLinks",
  "mcp__atlassian__atlassianUserInfo",
  "mcp__atlassian__getAccessibleAtlassianResources",
  "mcp__atlassian__fetch",
  "mcp__atlassian__addCommentToJiraIssue",
  "mcp__mysql_207__mysql_query",
  "mcp__gsheets-rezil",
];

export function buildFeatureAutoArgv(userPrompt, systemPrompt, addDirs) {
  return [
    "-p", userPrompt,
    "--permission-mode", "auto",
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--append-system-prompt", systemPrompt,
    ...addDirs.flatMap((d) => ["--add-dir", d]),
    "--allowedTools", ...FEATURE_ALLOWED,
    "--disallowedTools", ...DISALLOWED_TOOLS,
  ];
}

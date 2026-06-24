// Auto mode (REZIL): a Jira ticket → implement → PR. Prompt/tools ported verbatim from
// ui/server.js so behavior is identical. Reads CLAUDE.md / WORKFLOW.md / prompts from ROOT.
import fs from "fs";
import path from "path";
import { ROOT, loadConfig } from "./config.js";
import { DISALLOWED_TOOLS } from "./claude.js";

function readRoot(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

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
    `Default repo: ${gh.defaultRepo}. Base branch: develop.`,
    `Issue type → branch type: ${map} (else ${jira.defaultBranchType}).`,
    "Screen code (e.g. ISSUE-001, EQUIP-003): take it from the ticket summary/fields.",
    `The session starts in ${gh.defaultRepo}'s directory, but the ticket may target ANOTHER repo`,
    "above — once you determine the target repo, `cd` into ITS path before any git/file operation.",
  ].join("\n");
}

export function assembleSystemPrompt() {
  const parts = [
    "## Role & rules (CLAUDE.md)\n" + readRoot("CLAUDE.md"),
    "## Workflow (WORKFLOW.md)\n" + readRoot("WORKFLOW.md"),
    "## Task template (prompts/fix_bug.md)\n" + readRoot("prompts/fix_bug.md"),
    "## Jira comment template (templates/jira_comment.md)\n" + readRoot("templates/jira_comment.md"),
    configFacts(),
    [
      "## OUTPUT LANGUAGE (highest priority)",
      "Tường thuật/giải thích hiển thị cho người dùng PHẢI bằng TIẾNG VIỆT — mọi câu mô tả tiến trình,",
      "phân tích, kết luận, và khối ⛔ NEED-INFO đều viết tiếng Việt.",
      "GIỮ NGUYÊN tiếng Anh cho: commit message `REZIL-XXXX - <summary>`, tên branch, PR title theo",
      "convention, mã nguồn, đường dẫn file và lệnh shell.",
      "",
      "## AUTO MODE (highest priority)",
      "You are given ONLY a Jira ticket key. Derive everything else from the ticket:",
      "first read it (mcp__atlassian__getJiraIssue) to get the issue type, the screen code,",
      "and which repo it belongs to.",
      "",
      "## INFO GATE (check BEFORE writing any code)",
      "After reading the ticket, judge whether there is ENOUGH information to implement safely.",
      "If NOT — e.g. unclear/missing requirements, no acceptance criteria or repro, cannot determine",
      "the screen code or target repo, or the change is too ambiguous/risky — then DO NOT create a",
      "branch and DO NOT edit anything. Instead output a block that STARTS with the exact token",
      "`⛔ NEED-INFO:` followed by a short list of what is missing / what you'd need, then STOP.",
      "Take no mutating actions in that case (the user will decide).",
      "",
      "If there IS enough info, implement end-to-end, STOPPING at PR creation:",
      "1) read ticket, 2) pick repo + sync base develop, 3) create branch",
      "<type>/YYYY-MM-REZIL-XXXX-<SCREEN-CODE> (type mapped from issue type above),",
      "4) implement the minimal fix (Edit/Write), 5) quality gates (BE scalafmt/scalafix, FE npm run check),",
      "6) security ./semgrep-rules/scan.sh, 7) commit `REZIL-XXXX - <summary>`, 8) push,",
      "9) create the PR (base develop, title `[<phase>] <SCREEN-CODE> | REZIL-XXXX - <summary>`).",
      "   PR BODY RULE (strict): the body MUST be EXACTLY the content of templates/pr_template.md,",
      "   only filling in placeholders (Ticket URL, AI Usage %, checking the relevant boxes).",
      "   Do NOT add, remove, or reorder any section. Do NOT append a summary / change list /",
      "   test plan / 'Generated with' footer / emoji / extra prose. Prefer creating the PR with",
      "   `gh pr create --body-file <the filled template file>` (NOT --body with hand-written text).",
      "10) comment the Jira ticket using EXACTLY the format in templates/jira_comment.md above:",
      "    fill {{pr_link}} (full PR URL) and {{scope}} (screen code / impact), and DROP the # note",
      "    lines. The PR link MUST be a MARKDOWN link `[<url>](<url>)` (NOT a bare URL) so it renders",
      "    clickable in Jira via MCP→ADF. Comment only — do NOT transition the ticket status.",
      "HARD LIMITS: NEVER merge a PR, NEVER deploy, NEVER force-push, NEVER touch secrets/CI.",
      "If a quality gate or build FAILS: stop, report the failure, do NOT open the PR.",
      "Work directly in THIS single session — do NOT spawn subagents or use the Task/Agent tool.",
      "This is non-interactive: do NOT ask the user questions. If scope is ambiguous, STATE your",
      "assumption explicitly and proceed.",
    ].join("\n"),
  ];
  return parts.join("\n\n---\n\n");
}

export function assembleUserPrompt(ticket) {
  return [
    `Implement Jira ticket ${ticket}.`,
    `You are NOT told which repo to use. Read the ticket via the Atlassian integration FIRST`,
    `(issue type, screen code, summary/components), then DETERMINE the target repo from the`,
    `"Project config" repo list. \`cd\` into that repo's path and work ONLY there, then follow`,
    `WORKFLOW.md end-to-end up to creating the PR (never merge/deploy/force-push).`,
  ].join("\n");
}

// Tools the auto run may use without a prompt (headless). Bash covers git + gh.
export const AUTO_ALLOWED = [
  "Read", "Grep", "Glob", "Edit", "Write", "Bash",
  "mcp__atlassian__getJiraIssue",
  "mcp__atlassian__searchJiraIssuesUsingJql",
  "mcp__atlassian__getJiraIssueRemoteIssueLinks",
  "mcp__atlassian__atlassianUserInfo",
  "mcp__atlassian__getAccessibleAtlassianResources",
  "mcp__atlassian__fetch",
  "mcp__atlassian__addCommentToJiraIssue",
];

export function buildAutoArgv(userPrompt, systemPrompt, addDirs) {
  return [
    "-p", userPrompt,
    "--permission-mode", "auto",
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--append-system-prompt", systemPrompt,
    ...addDirs.flatMap((d) => ["--add-dir", d]),
    "--allowedTools", ...AUTO_ALLOWED,
    "--disallowedTools", ...DISALLOWED_TOOLS,
  ];
}

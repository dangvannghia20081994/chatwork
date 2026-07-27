#!/usr/bin/env node
// create-pr.js — push current branch and open a PR against the repo's base. NEVER merges.
// Usage: node scripts/create-pr.js <REZIL-XXXX> <SCREEN-CODE> [repo] --summary="..." [--phase="..."] [--dry-run]
// Title: [<phase>] <SCREEN-CODE> | REZIL-XXXX - <summary>
//   phase: LẤY TỪ TICKET (tag `[...]` đầu summary), truyền qua --phase. Không có -> fallback UAT-MVP2-B.
// Requires `gh` CLI authenticated. PR body seeded from templates/pr_template.md.

const fs = require("fs");
const path = require("path");
const { resolveRepo, assertTicketKey, git, run, die } = require("./_lib");

function arg(flag) {
  const a = process.argv.find((x) => x.startsWith(`--${flag}=`));
  return a ? a.split("=").slice(1).join("=") : undefined;
}

// Phase comes from the TICKET (the `[...]` tag at the start of its summary), passed via --phase.
// Normalize internal whitespace; fall back to UAT-MVP2-B when not provided/parseable.
function normalizePhase(raw) {
  if (!raw) return "UAT-MVP2-B";
  const inner = raw.trim().replace(/^\[|\]$/g, "").replace(/\s+/g, "");
  return inner || "UAT-MVP2-B";
}

function main() {
  const positional = process.argv.slice(2).filter((x) => !x.startsWith("--"));
  const [key, screenArg, repoName] = positional;
  const dryRun = process.argv.includes("--dry-run");

  try {
    assertTicketKey(key);
    if (!screenArg) die("Missing SCREEN-CODE (e.g. ISSUE-002).");
    const repo = resolveRepo(repoName);
    const branch = git(repo.path, "rev-parse --abbrev-ref HEAD");

    if (branch === repo.baseBranch) {
      die(`Refusing: current branch is ${repo.baseBranch}. Create a work branch first.`);
    }

    const tmpl = fs.readFileSync(path.join(__dirname, "..", "templates", "pr_template.md"), "utf8");
    const bodyPath = path.join(require("os").tmpdir(), `pr-${key}.md`);
    fs.writeFileSync(bodyPath, tmpl);

    // Push branch (no force).
    git(repo.path, `push -u origin ${branch}`, { dryRun });

    const screen = screenArg.toUpperCase();
    const summary = arg("summary") || "<summary>";
    const phase = normalizePhase(arg("phase"));
    const title = `[${phase}] ${screen} | ${key} - ${summary}`;
    const cmd = `gh pr create --repo ${repo.gh.org}/${repo.name} --base ${repo.baseBranch} --head ${branch} --title "${title}" --body-file "${bodyPath}"`;
    const out = run(cmd, { dryRun, cwd: repo.path });

    console.log(out || "[dry-run] PR not created");
    console.log("✓ PR opened. Do NOT merge — human reviews and merges. Edit the title/summary in the PR.");
  } catch (e) {
    die(e.message);
  }
}

main();

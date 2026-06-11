#!/usr/bin/env node
// create-pr.js — push current branch and open a PR against the repo's base. NEVER merges.
// Usage: node scripts/create-pr.js <REZIL-XXXX> <SCREEN-CODE> [repo] --summary="..." [--dry-run]
// Title: [<phase>] <SCREEN-CODE> | REZIL-XXXX - <summary>
//   phase: develop -> PreUAT-MVP2-A ; feature/mvp2-b -> "Sprint NN" (fill NN by hand)
// Requires `gh` CLI authenticated. PR body seeded from templates/pr_template.md.

const fs = require("fs");
const path = require("path");
const { resolveRepo, assertTicketKey, git, run, die } = require("./_lib");

function arg(flag) {
  const a = process.argv.find((x) => x.startsWith(`--${flag}=`));
  return a ? a.split("=").slice(1).join("=") : undefined;
}

function phaseFor(base) {
  if (base === "develop") return "PreUAT-MVP2-A";
  if (base === "feature/mvp2-b") return "Sprint NN";
  return base;
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
    const title = `[${phaseFor(repo.baseBranch)}] ${screen} | ${key} - ${summary}`;
    const cmd = `gh pr create --repo ${repo.gh.org}/${repo.name} --base ${repo.baseBranch} --head ${branch} --title "${title}" --body-file "${bodyPath}"`;
    const out = run(cmd, { dryRun, cwd: repo.path });

    console.log(out || "[dry-run] PR not created");
    console.log("✓ PR opened. Do NOT merge — human reviews and merges. Edit the title/summary in the PR.");
  } catch (e) {
    die(e.message);
  }
}

main();

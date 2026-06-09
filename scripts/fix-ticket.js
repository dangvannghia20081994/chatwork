#!/usr/bin/env node
// fix-ticket.js — start work on a ticket: sync base + create the work branch.
// Usage: node scripts/fix-ticket.js <REZIL-XXXX> <SCREEN-CODE> [repo] [--issue-type="Bug"] [--type=fix] [--dry-run]
//   Branch rule: <type>/<YYYY-MM>-REZIL-XXXX-<SCREEN-CODE>  (see github.json branchRule)
//   type resolution order: --type (explicit) > --issue-type mapped via jira.json > branchRule.defaultType.
//   The agent fetches the Jira issue type (MCP) and passes --issue-type; this script maps it.
// NOTE: this only sets up the branch. The actual code change is done by the agent.

const { resolveRepo, assertTicketKey, loadConfig, git, die } = require("./_lib");

// Map a Jira issue type (e.g. "Bug", "RoC") to a branch type via jira.json.
function typeFromIssueType(issueType) {
  if (!issueType) return undefined;
  const jira = loadConfig("jira");
  const map = jira.branchTypeByIssueType || {};
  // case-insensitive lookup
  const hit = Object.keys(map).find((k) => k.toLowerCase() === issueType.toLowerCase());
  return hit ? map[hit] : jira.defaultBranchType;
}

function arg(flag) {
  const a = process.argv.find((x) => x.startsWith(`--${flag}=`));
  return a ? a.split("=").slice(1).join("=") : undefined;
}

function main() {
  const positional = process.argv.slice(2).filter((x) => !x.startsWith("--"));
  const [key, screenArg, repoName] = positional;
  const dryRun = process.argv.includes("--dry-run");

  try {
    assertTicketKey(key);
    if (!screenArg) die("Missing SCREEN-CODE (e.g. ISSUE-002). Usage: fix-ticket.js <REZIL-XXXX> <SCREEN-CODE> [repo]");
    const repo = resolveRepo(repoName);
    const base = repo.baseBranch;
    const rule = repo.gh.branchRule;
    const issueType = arg("issue-type");
    const type = (arg("type") || typeFromIssueType(issueType) || rule.defaultType).toLowerCase();
    if (!rule.types.includes(type)) die(`Invalid type "${type}". Allowed: ${rule.types.join(", ")}`);
    const screen = screenArg.toUpperCase().replace(/[^A-Z0-9-]+/g, "-").replace(/^-|-$/g, "");
    const ym = new Date().toISOString().slice(0, 7); // YYYY-MM
    const branch = `${type}/${ym}-${key}-${screen}`;

    console.log(`Repo:   ${repo.name} (${repo.path})`);
    console.log(`Base:   ${base}`);
    console.log(`Branch: ${branch}`);

    git(repo.path, `checkout ${base}`, { dryRun });
    git(repo.path, `pull --ff-only`, { dryRun });
    git(repo.path, `checkout -b ${branch}`, { dryRun });

    console.log(`✓ Ready. Implement the change, then: node scripts/create-pr.js ${key} ${repo.name}`);
  } catch (e) {
    die(e.message);
  }
}

main();

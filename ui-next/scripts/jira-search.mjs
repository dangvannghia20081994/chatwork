#!/usr/bin/env node
// CLI wrapper around lib/jira.js `jiraSearchAll` — the Report console's data source (instead of the
// Atlassian MCP, whose fat responses blow past the token limit). The report agent builds a JQL, runs:
//
//   node ui-next/scripts/jira-search.mjs --jql "<JQL>" [--fields "summary,status,assignee"] [--count-only]
//
// and gets back COMPACT JSON it can analyze. Fields are flattened (status→name, assignee→displayName,
// issuetype→name, priority→name; scalars pass through) and avatar/URL noise is dropped.
//
// Auth: JIRA_API_EMAIL + JIRA_API_TOKEN (inherited from the parent process env when spawned by the
// UI; falls back to loading ui-next/.env for manual runs). Read-only: this only ever GETs via search.
import path from "path";
import { fileURLToPath } from "url";
import { jiraSearchAll } from "../lib/jira.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// Fallback: load ui-next/.env if the token isn't already in the environment (manual CLI runs).
if (!process.env.JIRA_API_TOKEN) {
  try {
    const dotenv = await import("dotenv");
    dotenv.config({ path: path.resolve(HERE, "../.env"), quiet: true });
  } catch {}
}

function parseArgs(argv) {
  const out = { fields: "", jql: "", countOnly: false, max: 300 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--jql") out.jql = argv[++i] || "";
    else if (a === "--fields") out.fields = argv[++i] || "";
    else if (a === "--count-only") out.countOnly = true;
    else if (a === "--max") out.max = Number(argv[++i]) || 300;
  }
  return out;
}

// Flatten one Jira field value to something compact & analysable.
function flat(v) {
  if (v == null) return null;
  if (Array.isArray(v)) return v.map(flat);
  if (typeof v === "object") {
    if (v.displayName) return v.displayName; // assignee / reporter
    if (v.name) return v.name; // status / issuetype / priority
    if (v.value) return v.value; // some custom fields
    return undefined; // drop unknown objects (avatars, ADF, etc.)
  }
  return v;
}

async function main() {
  const { jql, fields, countOnly, max } = parseArgs(process.argv.slice(2));
  if (!jql) {
    console.error('Thiếu --jql. Ví dụ: --jql "filter=10695" --fields "summary,status,assignee"');
    process.exit(2);
  }
  const fieldList = fields
    ? fields.split(",").map((s) => s.trim()).filter(Boolean)
    : ["summary", "status", "assignee", "issuetype", "created"];

  const issues = await jiraSearchAll(jql, fieldList);
  if (countOnly) {
    console.log(JSON.stringify({ jql, count: issues.length }));
    return;
  }

  const rows = issues.slice(0, max).map((it) => {
    const row = { key: it.key };
    for (const f of fieldList) {
      const val = flat(it.fields?.[f]);
      if (val !== undefined) row[f] = val;
    }
    return row;
  });
  console.log(
    JSON.stringify({
      jql,
      count: issues.length,
      truncated: issues.length > rows.length,
      issues: rows,
    }),
  );
}

main().catch((e) => {
  console.error(`ERROR: ${e.message || e}`);
  process.exit(1);
});

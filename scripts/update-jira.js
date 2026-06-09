#!/usr/bin/env node
// update-jira.js — render a Jira comment from template and report the intended action.
// Usage: node scripts/update-jira.js <REZIL-XXXX> comment --pr=<url> --scope=<screen> [--status=<s>]
//
// NOTE: Jira writes (comment/transition) are executed via the Atlassian integration
// (MCP tools), which holds the credentials — NOT by this script. This renders the
// comment body and prints the action so the agent can apply it safely.

const fs = require("fs");
const path = require("path");
const { assertTicketKey, loadConfig, die } = require("./_lib");

function arg(flag, def = "") {
  const a = process.argv.find((x) => x.startsWith(`--${flag}=`));
  return a ? a.split("=").slice(1).join("=") : def;
}

function main() {
  const [, , key, action] = process.argv;
  try {
    assertTicketKey(key);
    if (!["comment", "transition"].includes(action)) {
      die(`Action must be "comment" or "transition" (got "${action || ""}").`);
    }
    const jira = loadConfig("jira");
    const url = `https://${jira.site}/browse/${key}`;

    let body = fs.readFileSync(path.join(__dirname, "..", "templates", "jira_comment.md"), "utf8");
    // Keep only the active lines (strip the # note lines).
    body = body
      .split("\n")
      .filter((l) => !l.trimStart().startsWith("#"))
      .join("\n")
      .trim();
    body = body
      .replace(/{{pr_link}}/g, arg("pr", "-"))
      .replace(/{{scope}}/g, arg("scope", "-"));

    console.log(`Ticket: ${url}`);
    console.log(`Action: ${action}`);
    if (action === "transition") {
      console.log(`Target status: ${arg("status", "(required)")} — confirm before applying.`);
    }
    console.log("--- comment body ---");
    console.log(body);
    console.log("--------------------");
    console.log("Apply via Atlassian integration (addCommentToJiraIssue / transitionJiraIssue).");
  } catch (e) {
    die(e.message);
  }
}

main();

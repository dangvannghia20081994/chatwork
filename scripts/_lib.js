// _lib.js — shared helpers for agent scripts.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const CONFIG_DIR = path.join(__dirname, "..", "config");

function loadConfig(name) {
  const p = path.join(CONFIG_DIR, `${name}.json`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

// Resolve a repo entry from github.json (defaults to defaultRepo).
function resolveRepo(repoName) {
  const gh = loadConfig("github");
  const name = repoName || gh.defaultRepo;
  const repo = gh.repos[name];
  if (!repo) {
    throw new Error(`Unknown repo "${name}". Known: ${Object.keys(gh.repos).join(", ")}`);
  }
  return { name, ...repo, gh };
}

function assertTicketKey(key) {
  if (!key || !/^REZIL-\d+$/.test(key)) {
    throw new Error(`Invalid ticket key "${key}". Expected REZIL-<number>.`);
  }
}

// Run a git command inside a repo dir. dryRun -> just print.
function git(repoPath, args, { dryRun = false } = {}) {
  const cmd = `git -C "${repoPath}" ${args}`;
  if (dryRun) {
    console.log(`[dry-run] ${cmd}`);
    return "";
  }
  return execSync(cmd, { encoding: "utf8" }).trim();
}

function run(cmd, { dryRun = false, cwd } = {}) {
  if (dryRun) {
    console.log(`[dry-run] ${cmd}`);
    return "";
  }
  return execSync(cmd, { encoding: "utf8", cwd }).trim();
}

function die(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

module.exports = { loadConfig, resolveRepo, assertTicketKey, git, run, die };

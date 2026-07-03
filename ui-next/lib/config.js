// Shared config access for route handlers. Reads the same config/*.json as ui/server.js.
// ROOT is the repo root (parent of ui-next/), where `config/` lives.
import fs from "fs";
import path from "path";
import os from "os";

export const ROOT = path.resolve(process.cwd(), "..");

// Where the sibling project repos (rezil-esms*, story, ai-film-studio…) live. Defaults to the parent
// of this repo (they're checked out side-by-side); override with REZIL_ROOT to relocate on another
// machine WITHOUT editing config/*.json. Config files store repo paths as bare folder names relative
// to this; absolute paths in config are honored as-is (loadConfig resolves them — see below).
export function rezilRoot() {
  return process.env.REZIL_ROOT || path.resolve(ROOT, "..");
}

// A configured repo path → absolute: absolute stays, relative resolves under REZIL_ROOT.
function absRepoPath(p) {
  return path.isAbsolute(p) ? p : path.resolve(rezilRoot(), p);
}

// Claude config dir for the account this app actually spawns `claude` with. pm2 pins
// CLAUDE_CONFIG_DIR=~/.claude-account2 (see ecosystem.config.js), so /usage, /cost and /context must
// read THAT account's credentials/transcripts — not the default ~/.claude. Honors a comma-separated
// CLAUDE_CONFIG_DIR by taking the first entry; falls back to ~/.claude when unset.
export function claudeHome() {
  const env = (process.env.CLAUDE_CONFIG_DIR || "").split(",")[0].trim();
  return env || path.join(os.homedir(), ".claude");
}

export function loadConfig(name) {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "config", `${name}.json`), "utf8"));
  // Expand repo paths against REZIL_ROOT so every consumer sees absolute paths while config/*.json
  // stays machine-independent. Covers single-repo configs (`path`) and github.json (`repos[*].path`).
  if (cfg && typeof cfg.path === "string") cfg.path = absRepoPath(cfg.path);
  if (cfg && cfg.repos) {
    for (const r of Object.values(cfg.repos)) {
      if (r && typeof r.path === "string") r.path = absRepoPath(r.path);
    }
  }
  return cfg;
}

// Resolve a single REZIL repo entry by name (for auto mode). Defaults to defaultRepo.
export function resolveRepo(name) {
  const gh = loadConfig("github");
  const key = name || gh.defaultRepo;
  const r = gh.repos[key];
  if (!r) throw new Error(`Unknown repo "${key}". Known: ${Object.keys(gh.repos).join(", ")}`);
  return { name: key, ...r };
}

export function listRepos() {
  const gh = loadConfig("github");
  return { repos: Object.keys(gh.repos), defaultRepo: gh.defaultRepo };
}

// Single-repo projects driven by a config/<key>.json (own CLAUDE.md/.claude auto-loaded by cwd).
// Adding another such project is a one-entry change here + its config/<key>.json.
export const SIMPLE_PROJECTS = {
  story: { label: "Story" },
  film: { label: "AI Film Studio" },
};

// Normalize an arbitrary project param to a known key; anything unknown → "rezil".
// "free" is the unrestricted, all-projects mode (see resolveProject) — kept explicit here so it
// survives the normalize step instead of being coerced to "rezil".
export function normalizeProject(p) {
  return p === "rezil" || p === "free" || SIMPLE_PROJECTS[p] ? p : "rezil";
}

// Resolve a "project" (rezil | story | film | …) into the bits a run/chat needs.
// Keeping this in one place is what makes adding another project a one-entry change.
export function resolveProject(project) {
  // "free" = unrestricted, all-projects mode: cwd is the workspace root (~/IdeaProjects by default,
  // = rezilRoot) so claude can reach EVERY project checked out side-by-side, not just one repo.
  if (project === "free") {
    const root = rezilRoot();
    return {
      key: "free",
      label: "Toàn bộ",
      cwd: root,
      addDirs: [root].filter((p) => fs.existsSync(p)),
      cfg: null,
    };
  }
  const simple = SIMPLE_PROJECTS[project];
  if (simple) {
    const s = loadConfig(project);
    return {
      key: project,
      label: simple.label,
      cwd: s.path,
      addDirs: [s.path].filter((p) => fs.existsSync(p)),
      cfg: s,
    };
  }
  // default: rezil
  const gh = loadConfig("github");
  const repos = Object.values(gh.repos).map((r) => r.path);
  return {
    key: "rezil",
    label: "REZIL",
    cwd: gh.repos[gh.defaultRepo].path,
    addDirs: repos.filter((p) => fs.existsSync(p)),
    cfg: gh,
  };
}

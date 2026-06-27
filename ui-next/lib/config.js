// Shared config access for route handlers. Reads the same config/*.json as ui/server.js.
// ROOT is the repo root (parent of ui-next/), where `config/` lives.
import fs from "fs";
import path from "path";

export const ROOT = path.resolve(process.cwd(), "..");

export function loadConfig(name) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "config", `${name}.json`), "utf8"));
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
export function normalizeProject(p) {
  return p === "rezil" || SIMPLE_PROJECTS[p] ? p : "rezil";
}

// Resolve a "project" (rezil | story | film | …) into the bits a run/chat needs.
// Keeping this in one place is what makes adding another project a one-entry change.
export function resolveProject(project) {
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

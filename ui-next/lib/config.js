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

// Resolve a "project" (rezil | story) into the bits a run/chat needs.
// Keeping this in one place is what makes adding a 3rd project a one-entry change.
export function resolveProject(project) {
  if (project === "story") {
    const s = loadConfig("story");
    return {
      key: "story",
      label: "Story",
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

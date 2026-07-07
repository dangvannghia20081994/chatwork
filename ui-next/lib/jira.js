// Jira Cloud REST client (server-side) — Node port of the Apps Script `JiraUtil` sample that used to
// live in app/report/{config,sync}.js. The report console fetches Jira via THIS instead of the
// Atlassian MCP: deterministic counts, no LLM, no token-limit blowup from fat MCP responses.
//
// Auth = Basic base64(email:token). Set JIRA_API_EMAIL + JIRA_API_TOKEN in ui-next/.env (the token is
// a Jira API token from id.atlassian.com — never commit it). Site host comes from JIRA_SITE or
// config/jira.json (resolved relative to THIS module, so it works whatever the caller's cwd is — the
// scripts/jira-search.mjs CLI runs with cwd = repo root, not ui-next).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ui-next/lib/jira.js → ../../config/jira.json (repo root /config).
function jiraSite() {
  if (process.env.JIRA_SITE) return process.env.JIRA_SITE.trim();
  const here = path.dirname(fileURLToPath(import.meta.url));
  const cfg = JSON.parse(fs.readFileSync(path.resolve(here, "../../config/jira.json"), "utf8"));
  return cfg.site;
}

function jiraAuthHeader() {
  const email = (process.env.JIRA_API_EMAIL || "").trim();
  const token = (process.env.JIRA_API_TOKEN || "").trim();
  if (!email || !token) {
    const err = new Error(
      "Thiếu JIRA_API_EMAIL / JIRA_API_TOKEN trong ui-next/.env — không gọi được Jira REST API.",
    );
    err.status = 500;
    throw err;
  }
  return "Basic " + Buffer.from(`${email}:${token}`).toString("base64");
}

// Fetch ALL issues matching a JQL, auto-paging via nextPageToken (the newer /search/jql endpoint is
// token-paged, not offset-paged). Returns a flat array of issue objects ({key, fields}). Pass a
// minimal `fields` list to keep responses small. pageCap guards against runaway loops.
export async function jiraSearchAll(jql, fields = [], { maxResults = 100, pageCap = 50 } = {}) {
  const url = `https://${jiraSite()}/rest/api/3/search/jql`;
  const auth = jiraAuthHeader();
  const finalFields = fields.length ? fields : ["summary", "status", "created", "updated"];

  let all = [];
  let nextPageToken = null;
  let pages = 0;
  do {
    const body = { jql, maxResults, fields: finalFields };
    if (nextPageToken) body.nextPageToken = nextPageToken;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: auth,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }
    if (!res.ok) {
      const msg =
        (data.errorMessages && data.errorMessages.join(", ")) ||
        (data.errors && JSON.stringify(data.errors)) ||
        text.slice(0, 300) ||
        `HTTP ${res.status}`;
      const err = new Error(`Jira API lỗi (${res.status}): ${msg}`);
      err.status = res.status;
      throw err;
    }

    all = all.concat(data.issues || []);
    nextPageToken = data.nextPageToken || null;
    pages++;
  } while (nextPageToken && pages < pageCap);

  return all;
}

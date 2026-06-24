// Claude CLI plumbing for route handlers: per-project chat prompts/tools, argv builders,
// stream-json → SSE pump. Ported from ui/server.js (chat flow). Node runtime only.
import { spawn } from "child_process";
import { resolveProject } from "./config.js";

// Hard guardrails shared by every edit-capable flow.
export const DISALLOWED_TOOLS = [
  "NotebookEdit",
  "AskUserQuestion",
  "Bash(gh pr merge:*)",
  "Bash(git merge:*)",
  "Bash(git push --force:*)",
  "Bash(git push -f:*)",
];

// Claude session ids are UUIDs. Only forward a well-formed one to `--resume`; anything else
// (empty/junk) → "" so the run starts a fresh session instead of feeding garbage to the CLI.
const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function cleanSessionId(s) {
  const v = (s || "").trim();
  return SESSION_ID_RE.test(v) ? v : "";
}

// Shared tail instruction: end every turn with a machine-readable follow-up block the UI turns
// into clickable chips. Backend strips it from the visible answer (see feedText/flushSuggest).
const SUGGEST_INSTR =
  "Kết thúc MỖI lượt trả lời bằng khối gợi ý tiếp theo, định dạng CHÍNH XÁC: một dòng `<<<SUGGEST>>>` " +
  "rồi 2–3 dòng, mỗi dòng `- <gợi ý ngắn người dùng có thể bấm để hỏi/làm tiếp>`. Bám ngữ cảnh vừa trao " +
  "đổi, viết tiếng Việt, ngắn gọn. TUYỆT ĐỐI không viết gì sau khối này.";

function chatSystemPrompt(project, canEdit) {
  if (project === "story") {
    const base = [
      'Bạn là trợ lý kỹ thuật cho repo "story" (đọc truyện: Laravel + Next.js + Expo + Python workers).',
      "Repo có CLAUDE.md + .claude/agents + .mcp.json riêng (đã nạp) — tuân theo. Trả lời TIẾNG VIỆT, gọn, đúng trọng tâm.",
    ];
    if (canEdit) {
      base.push(
        "Chế độ SỬA CODE BẬT: được đọc + CHỈNH SỬA file (Edit/Write), chạy lệnh read-only/build/test (Bash), và dùng Agent để gọi agent layer của story.",
        "GIỚI HẠN: KHÔNG merge PR, KHÔNG deploy, KHÔNG force-push, KHÔNG --no-verify. Tên branch/commit/PR/code giữ tiếng Anh theo convention."
      );
    } else {
      base.push(
        "Bạn CÓ THỂ đọc code (Read/Grep/Glob), query postgres-story read-only và tìm web để trả lời.",
        "KHÔNG sửa/tạo/xoá file, không chạy lệnh shell, không git. Đây là chế độ hỏi-đáp."
      );
    }
    base.push(SUGGEST_INSTR);
    return base.join("\n");
  }
  // rezil
  const base = ["Bạn là trợ lý kỹ thuật cho dự án rezil-esms. Trả lời bằng TIẾNG VIỆT, ngắn gọn, đúng trọng tâm."];
  if (canEdit) {
    base.push(
      "Chế độ SỬA CODE đang BẬT: bạn có thể đọc và CHỈNH SỬA file (Edit/Write) cùng chạy lệnh read-only/build/test (Bash) theo yêu cầu.",
      "Sau khi sửa, giải thích ngắn gọn những gì đã thay đổi.",
      "GIỚI HẠN: KHÔNG merge PR, KHÔNG deploy, KHÔNG force-push. Tên branch/commit/PR/code giữ tiếng Anh theo convention."
    );
  } else {
    base.push(
      "Bạn CÓ THỂ đọc code (Read/Grep/Glob), tra Jira và tìm web để trả lời.",
      "Bạn KHÔNG được sửa/tạo/xoá file, không chạy lệnh shell, không git. Đây là chế độ hỏi-đáp."
    );
  }
  base.push(SUGGEST_INSTR);
  return base.join("\n");
}

function chatTools(project, canEdit) {
  if (project === "story") {
    const allow = canEdit
      ? ["Read", "Grep", "Glob", "Edit", "Write", "Bash", "Agent", "TodoWrite", "WebSearch", "WebFetch", "mcp__postgres-story"]
      : ["Read", "Grep", "Glob", "WebSearch", "WebFetch", "mcp__postgres-story"];
    const disallow = canEdit ? DISALLOWED_TOOLS : ["Edit", "Write", "NotebookEdit", "Bash", "Agent", "AskUserQuestion"];
    return { allow, disallow };
  }
  const ro = [
    "Read", "Grep", "Glob", "WebSearch", "WebFetch",
    "mcp__atlassian__getJiraIssue",
    "mcp__atlassian__searchJiraIssuesUsingJql",
    "mcp__atlassian__fetch",
  ];
  const allow = canEdit ? [...ro, "Edit", "Write", "Bash"] : ro;
  const disallow = canEdit ? DISALLOWED_TOOLS : ["Edit", "Write", "NotebookEdit", "Bash", "AskUserQuestion"];
  return { allow, disallow };
}

export function buildChatArgv(project, message, sessionId, canEdit, addDirs) {
  const { allow, disallow } = chatTools(project, canEdit);
  return [
    "-p", message,
    ...(canEdit ? ["--permission-mode", "auto"] : []),
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--append-system-prompt", chatSystemPrompt(project, canEdit),
    ...addDirs.flatMap((d) => ["--add-dir", d]),
    "--allowedTools", ...allow,
    "--disallowedTools", ...disallow,
    ...(sessionId ? ["--resume", sessionId] : []),
  ];
}

// Follow-up suggestions: the model ends its answer with a `<<<SUGGEST>>>` block. We strip it from
// the visible text mid-stream and emit it as a `suggest` event for the UI to render as chips.
const SUGGEST_MARK = "<<<SUGGEST>>>";

// Stream-safe filter over assistant text: emits visible text via `delta`, but once the marker
// appears everything after it is stashed in state.suggestRaw. Holds back only a tail that could be
// the start of the marker, so a marker split across deltas never leaks to the screen.
function feedText(state, text, emit) {
  if (!text) return;
  if (state.suggesting) { state.suggestRaw += text; return; }
  state.pending = (state.pending || "") + text;
  const idx = state.pending.indexOf(SUGGEST_MARK);
  if (idx >= 0) {
    const before = state.pending.slice(0, idx);
    if (before) emit("delta", before);
    state.suggesting = true;
    state.suggestRaw = state.pending.slice(idx + SUGGEST_MARK.length);
    state.pending = "";
    return;
  }
  let keep = 0;
  const max = Math.min(state.pending.length, SUGGEST_MARK.length - 1);
  for (let k = max; k > 0; k--) {
    if (state.pending.slice(-k) === SUGGEST_MARK.slice(0, k)) { keep = k; break; }
  }
  const safe = keep ? state.pending.slice(0, -keep) : state.pending;
  if (safe) emit("delta", safe);
  state.pending = keep ? state.pending.slice(-keep) : "";
}

// Called once at stream end: flush held-back text, then parse + emit the suggestion list.
export function flushSuggest(state, emit) {
  if (state.pending) { emit("delta", state.pending); state.pending = ""; }
  if (!state.suggesting) return;
  const items = (state.suggestRaw || "")
    .split("\n")
    .map((l) => l.replace(/^\s*[-*]\s*/, "").trim())
    .filter((l) => l.length > 0)
    .slice(0, 4);
  state.suggesting = false;
  state.suggestRaw = "";
  if (items.length) emit("suggest", items);
}

// Turn one claude stream-json event into SSE emits via `emit(event, data)`.
export function handleEvent(evt, emit, state) {
  if (!evt || typeof evt !== "object") return;
  switch (evt.type) {
    case "system":
      if (evt.subtype === "init") emit("tool", "phiên bắt đầu");
      // Sub-agent (Agent/Task tool) lifecycle. The CLI does NOT stream a sub-agent's internal
      // turns at top level — only these system events + the final tool_result — so without this
      // the screen freezes for the whole sub-agent run with no feedback.
      else if (evt.subtype === "task_started")
        emit("tool", "↳ agent: " + (evt.description || evt.subagent_type || "đang chạy"));
      break;
    case "stream_event": {
      const e = evt.event || {};
      if (e.type === "message_start" && e.message && e.message.id) {
        state.curMsg = e.message.id;
      } else if (e.type === "content_block_delta" && e.delta && e.delta.type === "text_delta") {
        if (state.curMsg) state.streamed.add(state.curMsg);
        feedText(state, e.delta.text, emit);
      } else if (e.type === "content_block_start" && e.content_block && e.content_block.type === "tool_use") {
        emit("tool", e.content_block.name || "tool");
      }
      break;
    }
    case "assistant": {
      const msg = evt.message || {};
      const sub = !!evt.parent_tool_use_id;
      const alreadyStreamed = msg.id && state.streamed.has(msg.id);
      for (const b of msg.content || []) {
        if (b.type === "tool_use") emit("tool", (sub ? "↳ " : "") + (b.name || "tool"));
        else if (b.type === "text" && b.text && !alreadyStreamed) feedText(state, b.text, emit);
      }
      break;
    }
    case "user": {
      // A sub-agent's output comes back as a tool_result on a user message. `tool_use_result`
      // carries `agentType` ONLY for Agent-tool results (regular Read/Bash/etc. results don't),
      // so this guard surfaces the agent's reply without dumping ordinary tool output into chat.
      const r = evt.tool_use_result;
      if (r && r.agentType && Array.isArray(r.content)) {
        const txt = r.content
          .filter((c) => c && c.type === "text")
          .map((c) => c.text)
          .join("\n")
          .trim();
        if (txt) emit("delta", "\n\n🤖 " + r.agentType + ":\n" + txt + "\n");
      }
      break;
    }
    case "result":
      emit("result", { subtype: evt.subtype, isError: !!evt.is_error });
      if (evt.is_error && evt.result) emit("error_msg", String(evt.result));
      break;
    default:
      break;
  }
}

// Build a text/event-stream ReadableStream that spawns claude and pumps events.
// onSession: emit a `session` event on first session_id (chat multi-turn).
// onSpawn(child): called right after spawn (e.g. register in a job-lock map).
// onClose(code, child): called exactly once on any terminal path (spawn failure, error, or
//   normal exit) before the stream ends — callers can rely on it to release a job-lock.
// timeoutMs: hard cap on run duration; a hung/runaway claude is SIGTERM'd (then SIGKILL) so it
//   can't hold a per-repo lock forever. Omit/0 = no cap (e.g. interactive chat).
export function claudeSSE({ cwd, argv, onSession, onSpawn, onClose, timeoutMs }) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      // Once the client disconnects (or we close), enqueue() throws "Controller is already closed".
      // That fires from async stdout handlers → uncaughtException → can crash the worker. Guard every
      // write behind a closed flag + try/catch so a late emit is a no-op, never a crash.
      let streamClosed = false;
      const emit = (event, data) => {
        if (streamClosed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch { streamClosed = true; }
      };
      try { controller.enqueue(encoder.encode(":ok\n\n")); } catch { streamClosed = true; }

      let child;
      let closedCb = false;
      // Guarantee onClose runs once on every terminal path so the lock is always released.
      const doClose = (code) => {
        if (closedCb) return;
        closedCb = true;
        if (onClose) { try { onClose(code, child, emit); } catch {} }
      };

      try {
        child = spawn("claude", argv, { cwd, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
      } catch (e) {
        emit("error_msg", "Failed to launch claude: " + e.message);
        doClose(null);
        emit("end", {});
        controller.close();
        return;
      }
      if (onSpawn) { try { onSpawn(child); } catch {} }

      const state = { streamed: new Set(), curMsg: null };
      let sentSession = false, finished = false, buf = "";
      const hb = setInterval(() => {
        try { controller.enqueue(encoder.encode(":hb\n\n")); } catch {}
      }, 15000);

      let killTimer = null, killHard = null;
      if (timeoutMs && timeoutMs > 0) {
        killTimer = setTimeout(() => {
          emit("error_msg", `⏱️ Quá thời gian cho phép (${Math.round(timeoutMs / 60000)} phút) — đang dừng tiến trình.`);
          try { child.kill("SIGTERM"); } catch {}
          killHard = setTimeout(() => { try { child.kill("SIGKILL"); } catch {} }, 5000);
        }, timeoutMs);
      }

      const finish = () => {
        if (finished) return;
        finished = true;
        clearInterval(hb);
        if (killTimer) clearTimeout(killTimer);
        if (killHard) clearTimeout(killHard);
        flushSuggest(state, emit); // flush held-back text + emit any follow-up suggestions
        emit("end", {});
        try { controller.close(); } catch {}
        streamClosed = true;
      };

      child.stdout.on("data", (chunk) => {
        buf += chunk.toString("utf8");
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let evt;
          try { evt = JSON.parse(line); } catch { continue; }
          if (!sentSession && evt.session_id && onSession) { sentSession = true; emit("session", evt.session_id); }
          handleEvent(evt, emit, state);
        }
      });
      child.stderr.on("data", (d) => emit("error_msg", d.toString("utf8")));
      child.on("error", (e) => {
        emit("error_msg", "claude error: " + e.message + (e.code === "ENOENT" ? " (is `claude` on PATH?)" : ""));
        doClose(null);
        finish();
      });
      child.on("close", (code) => {
        doClose(code);
        finish();
      });

      this._child = child;
    },
    cancel() {
      if (this._child && this._child.exitCode === null) this._child.kill("SIGTERM");
    },
  });
}

export { resolveProject };

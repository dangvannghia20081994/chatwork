// Claude CLI plumbing for route handlers: per-project chat prompts/tools, argv builders,
// stream-json → SSE pump. Ported from ui/server.js (chat flow). Node runtime only.
import { spawn } from "child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { resolveProject, normalizeProject, ROOT } from "./config.js";

// Absolute path to the screenshot helper (ui-next/scripts/snapshot.mjs). The chat agent runs in a
// sibling repo's cwd, so it needs the full path to invoke the script via Bash.
const SNAPSHOT_SCRIPT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "scripts",
  "snapshot.mjs"
);

// Instruction (edit-mode only) telling the agent to screenshot the running app when the user asks to
// "check on web / xem giao diện", save it under public/, and embed it in the answer as Markdown so it
// renders inline in the chat. `defaultUrl` is the project's fixed dev port; the agent overrides the
// path/route as needed.
function snapshotInstr(defaultUrl) {
  return (
    "CHỤP MÀN HÌNH WEB: khi người dùng yêu cầu KIỂM TRA GIAO DIỆN / xem thử trên web / 'check trên web' " +
    "sau khi sửa code — app chạy ở cổng cố định" +
    (defaultUrl ? ` (mặc định ${defaultUrl})` : "") +
    "; nếu chưa chạy thì start rồi chờ nó sẵn sàng. Chụp bằng lệnh Bash:\n" +
    `  node ${SNAPSHOT_SCRIPT} <url> --label <ten-ngan>\n` +
    "BẮT BUỘC KHOANH ĐỎ ITEM đang nói tới cho dễ phân biệt (cờ --mark, lặp lại được, selector là CSS):\n" +
    `  • 1 item  → chỉ khoanh đỏ, KHÔNG cần note:  --mark "<css-selector>"\n` +
    `  • nhiều item → khoanh đỏ + note tiếng Việt cạnh mỗi item (script tự đánh số):\n` +
    `      --mark "<selector-1>::<ghi chú tiếng Việt>" --mark "<selector-2>::<ghi chú tiếng Việt>"\n` +
    "  Chọn selector ổn định (id, data-*, class đặc trưng). Nếu script báo 'chỉ khoanh được x/y item' " +
    "thì selector sai — sửa lại rồi chụp lần nữa.\n" +
    "Lệnh in ra đường dẫn ảnh ở dòng cuối stdout (vd `/ai/api/snapshot/xxx.png`). Hãy chèn NGUYÊN " +
    "đường dẫn đó vào câu trả lời dưới dạng ảnh Markdown `![mô tả](/ai/api/snapshot/xxx.png)` để ảnh " +
    "hiển thị ngay trong khung chat. Chỉ chụp khi được yêu cầu kiểm tra giao diện — không tự chụp sau mỗi lần sửa."
  );
}

// Hard guardrails shared by every edit-capable flow.
export const DISALLOWED_TOOLS = [
  "NotebookEdit",
  "AskUserQuestion",
  // `gh pr merge` (merging a PR) stays HARD-BLOCKED — CLAUDE.md rule #1 "Never merge PRs".
  "Bash(gh pr merge:*)",
  // `git merge` (LOCAL branch integration) is ALLOWED: hoà develop vào nhánh feature là thao tác dev
  // hợp lệ, reversible (`git merge --abort`), và là đường ưu tiên hơn rebase cho nhánh diverge nhiều
  // (xem agent git-rebaser). Nó KHÁC `gh pr merge` (ship PR) vẫn cấm ở trên. Push/force-push đi kèm
  // vẫn bị system prompt phanh (không force-push develop/main).
  // Force-push is allowed on your own branch (feature/fix, release/*) + tags. Prefix matching can't
  // tell the target branch from the pattern, so raw `--force`/`-f` is NOT hard-blocked here — the
  // system prompt is the brake forbidding force-push of `develop`/`main`.
];

// Branch/push guardrail shared by EVERY edit-capable flow (auto REZIL/feature/story/film + chat).
// Root cause it prevents: a new branch has no upstream, so a bare `git push` can resolve to the base
// branch (push.default=upstream/tracking, or HEAD still sitting on develop) → commit lands on develop.
// Fix = branch BEFORE editing, verify HEAD before commit, and always push with `-u origin HEAD`.
export const GIT_BRANCH_SAFETY = [
  "## GIT — BRANCH & PUSH (bắt buộc, ưu tiên cao)",
  "1. TẠO BRANCH TRƯỚC KHI SỬA FILE: sync base xong thì `git switch -c <branch>` ngay. Tuyệt đối",
  "   KHÔNG sửa/commit khi HEAD còn ở base (`develop`/`main`).",
  "2. TRƯỚC MỖI `git commit`: chạy `git branch --show-current` và xác nhận KHÁC base. Nếu đang ở base",
  "   → tạo branch rồi mới commit.",
  "3. PUSH LẦN ĐẦU BẮT BUỘC SET UPSTREAM: `git push -u origin HEAD`. TUYỆT ĐỐI KHÔNG chạy `git push`",
  "   trống hay `git push origin` — branch mới chưa có upstream, git có thể đẩy nhầm sang base.",
  "4. SAU KHI PUSH: kiểm tra `git rev-parse --abbrev-ref --symbolic-full-name @{u}` phải trả về",
  "   `origin/<branch>` (KHÔNG phải `origin/develop`). Sai → dừng và báo, không push tiếp.",
  "5. LỠ COMMIT TRÊN BASE (chưa push): `git switch -c <branch>` để mang commit sang nhánh mới, rồi",
  "   `git branch -f <base> origin/<base>` trả base về đúng remote. KHÔNG dùng `git reset --hard`.",
  "6. LỠ PUSH LÊN BASE: DỪNG NGAY, báo lại cho người dùng. KHÔNG tự revert/force-push `develop`/`main`.",
].join("\n");

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

// UI renders câu trả lời dạng Markdown (GFM) — nhắc model dùng bảng khi dữ liệu có cấu trúc.
const TABLE_INSTR =
  "Khi trình bày dữ liệu có cấu trúc (so sánh, danh sách ticket/field, bước + kết quả, tham số...), " +
  "HÃY dùng BẢNG Markdown (GFM: `| Cột | Cột |` + dòng `|---|---|`) cho dễ nhìn thay vì liệt kê dài. " +
  "Giữ bảng gọn, tiêu đề cột ngắn. Văn xuôi/giải thích thì viết bình thường, không cần bảng.";

// REZIL team templates live in the ai-agent repo (ROOT), NOT in rezil-esms where chat's cwd sits.
// Chat gets ROOT via --add-dir (see buildChatArgv) so the agent can Read these on demand; this line
// tells it where they are + when to use them. Auto/feature flows inline the same files (lib/auto.js).
function rezilTemplatesInstr() {
  return (
    "TEMPLATE TEAM: khi được yêu cầu TẠO PR / COMMIT / COMMENT JIRA / VIẾT MIGRATION, PHẢI theo đúng " +
    "khuôn mẫu team đặt tại repo ai-agent (đọc bằng đường dẫn tuyệt đối vì nằm ngoài cwd):\n" +
    `  • PR body      → ${ROOT}/templates/pr_template.md\n` +
    `  • Commit msg   → ${ROOT}/templates/commit_message.md\n` +
    `  • Jira comment → ${ROOT}/templates/jira_comment.md\n` +
    `  • Migration    → ${ROOT}/templates/migration.md\n` +
    `  • Quy trình    → ${ROOT}/prompts/{fix_bug,create_pr,update_jira,transition_assign,review_pr}.md\n` +
    "Hãy Read đúng file cần dùng RỒI chỉ điền placeholder — GIỮ NGUYÊN cấu trúc template, không tự chế khuôn khác."
  );
}

function chatSystemPrompt(project, canEdit) {
  if (project === "free") {
    // Unrestricted, all-projects mode. cwd = workspace root (~/IdeaProjects) with every repo in scope.
    return [
      "Bạn là trợ lý kỹ thuật TOÀN NĂNG, làm việc trên MỌI project trong thư mục làm việc (~/IdeaProjects) — rezil-esms, story, ai-film-studio và bất kỳ repo nào khác nằm trong đó.",
      "Mỗi repo có CLAUDE.md / .claude/agents / .mcp.json riêng — khi thao tác trong repo nào thì tuân theo quy ước của repo đó.",
      "Bạn được TOÀN QUYỀN: đọc + sửa/tạo/xoá file (Read/Edit/Write), chạy mọi lệnh (Bash), git, gọi Agent và mọi tool/MCP có sẵn. KHÔNG có hạn chế nào.",
      "Vì không có rào chắn, hãy cẩn trọng với thao tác phá huỷ (xoá, force-push, reset, drop DB) — chỉ làm khi yêu cầu rõ ràng. Sau khi thay đổi, giải thích ngắn gọn đã làm gì.",
      "Trả lời TIẾNG VIỆT, gọn, đúng trọng tâm. Tên branch/commit/PR/code giữ tiếng Anh theo convention của từng repo.",
      GIT_BRANCH_SAFETY,
      snapshotInstr(""),
      TABLE_INSTR,
      SUGGEST_INSTR,
    ].join("\n");
  }
  if (project === "story") {
    const base = [
      'Bạn là trợ lý kỹ thuật cho repo "story" (đọc truyện: Laravel + Next.js + Expo + Python workers).',
      "Repo có CLAUDE.md + .claude/agents + .mcp.json riêng (đã nạp) — tuân theo. Trả lời TIẾNG VIỆT, gọn, đúng trọng tâm.",
    ];
    if (canEdit) {
      base.push(
        "Chế độ SỬA CODE BẬT: được đọc + CHỈNH SỬA file (Edit/Write), chạy lệnh read-only/build/test (Bash), và dùng Agent để gọi agent layer của story.",
        "GIỚI HẠN: KHÔNG merge PR, KHÔNG deploy, KHÔNG --no-verify, KHÔNG force-push `develop`/`main` (force-push nhánh của mình được nếu cần). Tên branch/commit/PR/code giữ tiếng Anh theo convention.",
        GIT_BRANCH_SAFETY,
        snapshotInstr("http://localhost:3000")
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
  if (project === "film") {
    const base = [
      'Bạn là trợ lý kỹ thuật cho repo "ai-film-studio" (Phim AI Studio: Next.js 16 + React 19 + TypeScript + Prisma/SQLite + Tailwind, worker render video qua ComfyUI).',
      "Repo có CLAUDE.md + AGENTS.md + PLAN.md riêng (đã nạp) — tuân theo. Trả lời TIẾNG VIỆT, gọn, đúng trọng tâm.",
    ];
    if (canEdit) {
      base.push(
        "Chế độ SỬA CODE BẬT: được đọc + CHỈNH SỬA file (Edit/Write), chạy lệnh read-only/build/test (Bash).",
        "GIỚI HẠN: KHÔNG merge PR, KHÔNG deploy, KHÔNG --no-verify, KHÔNG force-push `develop`/`main` (force-push nhánh của mình được nếu cần). Tên branch/commit/PR/code giữ tiếng Anh theo convention.",
        GIT_BRANCH_SAFETY,
        snapshotInstr("http://localhost:4100")
      );
    } else {
      base.push(
        "Bạn CÓ THỂ đọc code (Read/Grep/Glob) và tìm web để trả lời.",
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
      "GIỚI HẠN: KHÔNG merge PR, KHÔNG deploy, KHÔNG force-push `develop`/`main` (force-push nhánh của mình được nếu cần). Tên branch/commit/PR/code giữ tiếng Anh theo convention.",
      GIT_BRANCH_SAFETY,
      snapshotInstr("http://localhost:5173"),
      rezilTemplatesInstr()
    );
  } else {
    base.push(
      "Bạn CÓ THỂ đọc code (Read/Grep/Glob), tra Jira và tìm web để trả lời.",
      "Bạn KHÔNG được sửa/tạo/xoá file, không chạy lệnh shell, không git. Đây là chế độ hỏi-đáp.",
      rezilTemplatesInstr()
    );
  }
  base.push(TABLE_INSTR);
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
  if (project === "film") {
    // No MCP, no Agent/Task: the film repo has no .mcp.json / .claude/agents.
    const allow = canEdit
      ? ["Read", "Grep", "Glob", "Edit", "Write", "Bash", "TodoWrite", "WebSearch", "WebFetch"]
      : ["Read", "Grep", "Glob", "WebSearch", "WebFetch"];
    const disallow = canEdit ? DISALLOWED_TOOLS : ["Edit", "Write", "NotebookEdit", "Bash", "Agent", "AskUserQuestion"];
    return { allow, disallow };
  }
  const ro = [
    "Read", "Grep", "Glob", "WebSearch", "WebFetch",
    "mcp__atlassian__getJiraIssue",
    "mcp__atlassian__searchJiraIssuesUsingJql",
    "mcp__atlassian__fetch",
    "mcp__mysql_207__mysql_query",
    "mcp__gsheets-rezil",
  ];
  const allow = canEdit ? [...ro, "Edit", "Write", "Bash"] : ro;
  const disallow = canEdit ? DISALLOWED_TOOLS : ["Edit", "Write", "NotebookEdit", "Bash", "AskUserQuestion"];
  return { allow, disallow };
}

// Speed knobs for CHAT only (auto/feature/release/report flows keep the account defaults — they are
// long multi-step jobs where thinking budget pays off). Without these, chat inherits settings.json
// `model: opus[1m]` + the account's default effort, so a one-line question runs like a heavy task.
//   • read-only (hỏi-đáp)  → sonnet + effort low: trả lời nhanh, không sửa gì nên rủi ro thấp.
//   • edit mode / free     → giữ model mặc định (opus), chỉ hạ effort xuống medium.
function chatSpeedFlags(canEdit) {
  return canEdit
    ? ["--effort", "medium"]
    : ["--model", "sonnet", "--effort", "low"];
}

export function buildChatArgv(project, message, sessionId, canEdit, addDirs) {
  // "free" = unrestricted mode: bypass permissions entirely, no allowed/disallowed tool filters.
  // canEdit is irrelevant here — this mode is always fully capable across every project.
  if (project === "free") {
    return [
      "-p", message,
      "--permission-mode", "bypassPermissions",
      ...chatSpeedFlags(true),
      "--output-format", "stream-json",
      "--include-partial-messages",
      "--verbose",
      "--append-system-prompt", chatSystemPrompt(project, true),
      ...addDirs.flatMap((d) => ["--add-dir", d]),
      ...(sessionId ? ["--resume", sessionId] : []),
    ];
  }
  const { allow, disallow } = chatTools(project, canEdit);
  // rezil chat runs with cwd inside rezil-esms; the team templates/prompts live in this repo (ROOT),
  // outside cwd. Expose ROOT so the agent can Read them (referenced in rezilTemplatesInstr()).
  const dirs = project === "rezil" ? [...addDirs, ROOT] : addDirs;
  return [
    "-p", message,
    ...(canEdit ? ["--permission-mode", "auto"] : []),
    ...chatSpeedFlags(canEdit),
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--append-system-prompt", chatSystemPrompt(project, canEdit),
    ...dirs.flatMap((d) => ["--add-dir", d]),
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
// onEvent(event, data): observes EVERY emitted SSE event (delta/session/tool/result/end/...),
//   including ones sent after the client has disconnected (chat's killOnDisconnect:false runs keep
//   going in the background) — lets a caller accumulate the final answer/status for e.g. a Telegram
//   completion notification without touching the SSE plumbing itself.
// timeoutMs: hard cap on run duration; a hung/runaway claude is SIGTERM'd (then SIGKILL) so it
//   can't hold a per-repo lock forever. Omit/0 = no cap (e.g. interactive chat).
// killOnDisconnect: when the HTTP consumer goes away (client tab hidden/minimized → socket dropped),
//   the ReadableStream is cancelled. Default true → kill the child (jobs: an abandoned run is waste).
//   Chat passes false → the run KEEPS GOING to completion and is saved to the session .jsonl, so a
//   reconnecting client can reload the finished answer instead of seeing a frozen half-message.
export function claudeSSE({ cwd, argv, onSession, onSpawn, onClose, onEvent, timeoutMs, killOnDisconnect = true }) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      // Once the client disconnects (or we close), enqueue() throws "Controller is already closed".
      // That fires from async stdout handlers → uncaughtException → can crash the worker. Guard every
      // write behind a closed flag + try/catch so a late emit is a no-op, never a crash.
      let streamClosed = false;
      const emit = (event, data) => {
        if (onEvent) { try { onEvent(event, data); } catch {} }
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
      // Client disconnected. Kill only if the run is bound to the connection (jobs). Chat runs
      // (killOnDisconnect:false) survive so they finish + persist to the session .jsonl; the Dừng
      // button still stops them explicitly via /api/cancel (job-lock keyed by runId).
      if (killOnDisconnect && this._child && this._child.exitCode === null) this._child.kill("SIGTERM");
    },
  });
}

export { resolveProject, normalizeProject };

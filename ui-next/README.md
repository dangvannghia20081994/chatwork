# ui-next — Next.js UI

UI chính thức của AI agent (Next.js App Router + React + Tailwind). Đã thay thế hoàn toàn `ui/server.js` cũ (đã xoá). Sau gateway phục vụ ở prefix **`/ai`** (port **5000** qua pm2), Basic Auth qua `.env`.

**Console:** Auto REZIL Fix-Bug (ticket→PR) · **Feature** (BD+Figma → 16-phase → PR) · Auto/Chat **Story** (task→PR develop) · Auto/Chat **Film** (AI Film Studio, task→PR develop) · **Release** (drive github-ops: deploy DEV1/PR/tag) · **Rebase/Merge** (drive git-rebaser) · **Report** (Jira report read-only qua REST CLI) · **Sprint giờ âm** (burndown Expect vs Actual) · Chat REZIL + Chat **Toàn năng** (free, bypass) · `/usage` · Cancel · Basic Auth · `/healthz`.

**Kênh phụ:** Telegram bot (long-polling) khởi động qua `instrumentation.js` — dùng lại y hệt plumbing chat của web (`buildChatArgv`/`handleEvent`) nên prompt & guardrail giống nhau.

## Style

- **Tailwind CSS v4** (CSS-first config trong `app/globals.css` qua `@theme inline`).
- **Font**: UI dùng `--font-sans` (system-ui/Segoe UI/Roboto…) — KHÔNG dùng monospace cho text vì font mono đặt sai dấu chồng tiếng Việt (ư/ơ + thanh). `--font-mono` chỉ để dành cho code.
- **Dark mode**: class-based (`<html class="dark">`), toggle 🌙/☀️ lưu `localStorage`, mặc định tối, no-FOUC script trong `layout.jsx`. Token màu đổi theo `:root` / `.dark`.
- **Responsive**: mọi trang là console full-height (header + log + composer); home grid 1→2 cột.

## Chạy

```bash
npm install          # lần đầu
npm run dev          # dev (hot reload) — http://127.0.0.1:7000  (-p 7000 hardcode, KHÔNG đọc PORT)
npm run build        # build production (bake NEXT_PUBLIC_BASE_PATH=/ai)
npm run start        # chạy bản build — cũng -p 7000

# qua pm2 (ecosystem.config.js nằm ngay trong ui-next/) — chỉ chạy Next app, KHÔNG ngrok.
# pm2 đọc PORT từ .env (mặc định 5000), gateway route /ai → PORT này:
npm run build && pm2 start ecosystem.config.js --update-env   # ai-agent-ui-next
pm2 restart ecosystem.config.js --update-env                  # sau khi build lại
```

> ⚠️ `npm run dev`/`start` dùng `-p 7000` hardcode trong `package.json` và **BỎ QUA** `PORT` trong `.env`.
> Chỉ pm2 (ecosystem) mới đọc `PORT` (5000). Production thực tế = **pm2 → port 5000**.

Basic Auth: đặt `UI_BASIC_AUTH="user:pass"` trong `ui-next/.env` (rỗng = không auth, chỉ loopback).

## Expose ra ngoài (ngrok)

App này **không tự chạy ngrok**. Việc đó do **gateway dùng chung** lo: [`~/IdeaProjects/gateway`](../../gateway/CADDY.md)
(1 Caddy + 1 ngrok cho nhiều app, 1 domain). chatwork được route ở prefix **`/ai`** (port 5000).

- `NEXT_PUBLIC_BASE_PATH=/ai` trong `.env` — **BAKED lúc `next build`** (đổi là phải build lại). Next tự
  prefix Link/asset/API route; `EventSource`/`fetch` được prefix thủ công trong `AgentConsole` qua `BASE`.
- Cài Caddy + chạy gateway + cách thêm app mới: xem **[gateway/CADDY.md](../../gateway/CADDY.md)** và
  **[CADDY.md](../CADDY.md)** (repo này).

Truy cập: `https://<domain>/ai`.

## Cấu trúc

```
app/
  layout.jsx            # root layout + globals.css + no-FOUC theme script
  ThemeToggle.jsx       # client: toggle dark/light (localStorage)
  page.jsx              # home: card tới mọi console (Auto/Feature/Release/Rebase/Report/Sprint/Chat…)
  globals.css           # Tailwind v4 + theme tokens (light/dark)
  _components/AgentConsole.jsx # client: console DÙNG CHUNG cho mọi trang. mode "chat" (chat/release/
                               #   rebase/report) + mode "job" (auto/feature/story/film: composer +
                               #   result/NEED-INFO/cancel). Upload file, snapshot, âm báo khi xong.
  chat/     page.jsx → Chat.jsx        # chat project-aware (rezil/story/film/free) + toggle ✏️ Sửa code
  auto/     page.jsx → Auto.jsx        # job: ticket REZIL + repo → /api/run
  feature/  page.jsx → Feature.jsx     # job: ticket + repo + BD/Figma → /api/feature-run
  story/    page.jsx → StoryAuto.jsx   # job: task free-form → /api/story-run
  film/     page.jsx → FilmAuto.jsx    # job: task AI Film Studio → /api/film-run
  release/  page.jsx → Release.jsx     # chat: drive github-ops (deploy/PR/tag) → /api/release
  rebase/   page.jsx → Rebase.jsx      # chat: drive git-rebaser (rebase/merge/force-push) → /api/rebase
  report/   page.jsx → Report.jsx      # chat: Jira report read-only (JQL→REST CLI) → /api/report
  sprint/   page.jsx                   # tool: upload xlsx burndown → giờ âm (Expect vs Actual)
  api/
    chat/route.js         # SSE chat (project-aware, slash-commands)
    run/route.js          # SSE auto REZIL (ticket → PR), job-lock per repo
    feature-run/route.js  # SSE auto Feature (BD+Figma → 16-phase → PR), job-lock per repo
    story-run/route.js    # SSE auto Story (task → PR develop), job-lock "story"
    film-run/route.js     # SSE auto Film (task → PR develop), job-lock "film"
    release/route.js      # SSE release (drive github-ops, multi-turn resume, no lock)
    rebase/route.js       # SSE rebase (drive git-rebaser, multi-turn resume)
    report/route.js       # SSE report (Jira read-only chat, multi-turn resume)
    sprint/route.js       # POST xlsx → JSON giờ âm (dùng lib/sprint.js)
    sessions/route.js     # list/đọc phiên chat Claude CLI (.jsonl) theo project
    snapshot/[name]/route.js # serve runtime asset (ảnh snapshot web) — Next16 không serve public/ sau build
    cancel/route.js       # POST hủy job đang chạy
    healthz/route.js      # health check
proxy.js                # HTTP Basic Auth (UI_BASIC_AUTH) — Next "proxy" convention
instrumentation.js      # boot hook: startTelegramBot()
lib/
  config.js             # đọc ../config/*.json; resolveRepo / resolveProject
  claude.js             # chat prompt/tools per project, claudeSSE pump (onSpawn/onClose/timeout)
  auto.js               # auto REZIL prompt/tools (ticket → minimal fix → PR)
  featureAuto.js        # auto Feature prompt/tools (16-phase BD+Figma → Scala/Svelte → PR)
  storyAuto.js          # auto Story prompt/tools (task → PR develop)
  filmAuto.js           # auto Film prompt/tools (task → PR develop; repo không có MCP/agents)
  release.js            # release prompt/argv (--agent github-ops, bypassPermissions, merge allowed)
  rebase.js             # rebase prompt/argv (--agent git-rebaser, multi-turn confirm-before-write)
  report.js             # report prompt/argv (Jira JQL → REST CLI, read-only, không dùng MCP)
  jira.js               # Jira Cloud REST client server-side (report console dùng thay MCP)
  sprint.js             # burndown "giờ âm" — nguồn chung cho web + skill sprint-negative-hours
  slashCommands.js      # slash-command dùng chung (/usage…) — short-circuit trước khi spawn claude
  sessions.js           # đọc phiên chat Claude CLI (.jsonl) theo project
  upload.js             # lưu file upload vào .ai-uploads/ trong cwd (chat/report Read được)
  telegram.js           # Telegram long-polling bot (kênh chat thứ 2, dùng lại plumbing lib/claude.js)
  notifySound.js        # beep Web Audio khi run xong/lỗi (AgentConsole)
  limits.js             # buildLimitsReport() — live rate-limit /usage (Anthropic OAuth)
  usage.js              # buildUsageReport() — offline ~/.claude/projects parse
  jobs.js               # running Map (job-lock) + cancel
ecosystem.config.js     # pm2: ai-agent-ui-next (chỉ Next app; ngrok do ~/IdeaProjects/gateway lo)
```

## Trạng thái: migration xong ✅

UI cũ `ui/server.js` đã xoá. Mọi tính năng đã port sang đây. Mở rộng tiếp:
chỉ thêm route/page mới + 1 entry trong `lib/config.js` (cho project mới).

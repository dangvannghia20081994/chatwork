# ui-next — Next.js UI

UI chính thức của AI agent (Next.js App Router + React + Tailwind). Đã thay thế hoàn toàn `ui/server.js` cũ (đã xoá). Chạy port **5000**, ngrok tunnel vào đây, Basic Auth qua `.env`.

**Tính năng:** Auto REZIL Fix-Bug (ticket→PR) · **Feature** (BD+Figma → 16-phase → PR) · Auto Story (task→PR develop) · **Release** (drive github-ops: deploy DEV1/PR/tag) · Chat REZIL/Story · `/usage` · Cancel · Basic Auth · `/healthz`.

## Style

- **Tailwind CSS v4** (CSS-first config trong `app/globals.css` qua `@theme inline`).
- **Font**: UI dùng `--font-sans` (system-ui/Segoe UI/Roboto…) — KHÔNG dùng monospace cho text vì font mono đặt sai dấu chồng tiếng Việt (ư/ơ + thanh). `--font-mono` chỉ để dành cho code.
- **Dark mode**: class-based (`<html class="dark">`), toggle 🌙/☀️ lưu `localStorage`, mặc định tối, no-FOUC script trong `layout.jsx`. Token màu đổi theo `:root` / `.dark`.
- **Responsive**: mọi trang là console full-height (header + log + composer); home grid 1→2 cột.

## Chạy

```bash
npm install          # lần đầu
npm run dev          # dev (hot reload) — http://127.0.0.1:5000
npm run build        # build production
npm run start        # chạy bản build

# qua pm2 (ecosystem.config.js nằm ngay trong ui-next/):
npm run build && pm2 start ecosystem.config.js   # ui-next + ngrok→5000
pm2 restart ai-agent-ui-next                      # sau khi build lại
```

Basic Auth: đặt `UI_BASIC_AUTH="user:pass"` trong `ui-next/.env` (rỗng = không auth, chỉ loopback). Đổi xong phải `npm run build` lại nếu proxy inline env.

## Cấu trúc

```
app/
  layout.jsx            # root layout + globals.css + no-FOUC theme script
  ThemeToggle.jsx       # client: toggle dark/light (localStorage)
  page.jsx              # home: link Auto/Feature/Story/Chat
  globals.css           # Tailwind v4 + theme tokens (light/dark)
  _components/AgentConsole.jsx # client: console DÙNG CHUNG cho mọi trang. mode "chat" (/chat,/release)
                               #   + mode "job" (/auto,/feature,/story: composer + result/NEED-INFO/cancel)
  chat/
    page.jsx            # server: đọc ?project= rồi render <Chat>
    Chat.jsx            # client: wrapper <AgentConsole> chat (project từ URL + toggle ✏️ Sửa code) → /api/chat
  auto/
    page.jsx            # server: nạp repo list → <Auto>
    Auto.jsx            # client: wrapper <AgentConsole> job (ticket + repo) → /api/run
  feature/
    page.jsx            # server: nạp repo list → <Feature>
    Feature.jsx         # client: wrapper <AgentConsole> job (ticket + repo + BD/Figma) → /api/feature-run
  story/
    page.jsx            # server → <StoryAuto>
    StoryAuto.jsx       # client: wrapper <AgentConsole> job (task free-form) → /api/story-run
  release/
    page.jsx            # server → <Release>
    Release.jsx         # client: wrapper <AgentConsole> chat (KHÔNG có toggle sửa code) → /api/release
  api/chat/route.js        # SSE chat (project-aware, /usage command)
  api/run/route.js         # SSE auto REZIL (ticket → PR), job-lock per repo
  api/feature-run/route.js # SSE auto Feature (BD+Figma → 16-phase → PR), job-lock per repo
  api/story-run/route.js   # SSE auto Story (task → PR develop), job-lock "story"
  api/release/route.js     # SSE release (drive github-ops, multi-turn resume, no lock)
  api/cancel/route.js      # POST hủy job đang chạy
  api/healthz/route.js     # health check
proxy.js                # HTTP Basic Auth (UI_BASIC_AUTH) — Next "proxy" convention
lib/
  config.js             # đọc ../config/*.json; resolveRepo / resolveProject
  claude.js             # chat prompt/tools per project, claudeSSE pump (onSpawn/onClose/timeout)
  auto.js               # auto REZIL prompt/tools (ticket → minimal fix → PR)
  featureAuto.js        # auto Feature prompt/tools (16-phase BD+Figma → Scala/Svelte → PR)
  storyAuto.js          # auto Story prompt/tools (task → PR develop)
  release.js            # release prompt/argv (--agent github-ops, bypassPermissions, merge allowed)
  limits.js             # buildLimitsReport() — live rate-limit /usage (Anthropic OAuth)
  usage.js              # buildUsageReport() — offline ~/.claude/projects parse (chưa dùng tới)
  jobs.js               # running Map (job-lock) + cancel
ecosystem.config.js     # pm2: ai-agent-ui-next + ngrok→5000 (PORT/HOSTNAME từ .env)
```

## Trạng thái: migration xong ✅

UI cũ `ui/server.js` đã xoá. Mọi tính năng đã port sang đây. Mở rộng tiếp:
chỉ thêm route/page mới + 1 entry trong `lib/config.js` (cho project mới).

# ui-next — Next.js UI

UI chính thức của AI agent (Next.js App Router + React + Tailwind). Đã thay thế hoàn toàn `ui/server.js` cũ (đã xoá). Chạy port **5000**, ngrok tunnel vào đây, Basic Auth qua `.env`.

**Parity đầy đủ với UI cũ:** Auto REZIL (ticket→PR) · Auto Story (task→PR develop) · Chat REZIL/Story · `/usage` · Cancel · Basic Auth · `/healthz`.

## Style

- **Tailwind CSS v4** (CSS-first config trong `app/globals.css` qua `@theme inline`).
- **Dark mode**: class-based (`<html class="dark">`), toggle 🌙/☀️ lưu `localStorage`, mặc định tối, no-FOUC script trong `layout.jsx`. Token màu đổi theo `:root` / `.dark`.
- **Responsive**: `/auto` 2 cột desktop → 1 cột mobile; chat composer wrap; home grid 1→2 cột.

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
  page.jsx              # home: link Auto/Chat
  globals.css           # Tailwind v4 + theme tokens (light/dark)
  chat/
    page.jsx            # server: đọc ?project= rồi render <Chat>
    Chat.jsx            # client: chat UI, EventSource → /api/chat
  auto/
    page.jsx            # server: nạp repo list → <Auto>
    Auto.jsx            # client: ticket→PR REZIL, EventSource → /api/run, cancel
  story/
    page.jsx            # server → <StoryAuto>
    StoryAuto.jsx       # client: task free-form → PR develop, EventSource → /api/story-run
  api/chat/route.js     # SSE chat (project-aware, /usage command)
  api/run/route.js      # SSE auto REZIL (ticket → PR), job-lock per repo
  api/story-run/route.js# SSE auto Story (task → PR develop), job-lock "story"
  api/cancel/route.js   # POST hủy job đang chạy
  api/healthz/route.js  # health check
proxy.js                # HTTP Basic Auth (UI_BASIC_AUTH) — Next "proxy" convention
lib/
  config.js             # đọc ../config/*.json; resolveRepo / resolveProject
  claude.js             # chat prompt/tools per project, claudeSSE pump (onSpawn/onClose/timeout)
  auto.js               # auto REZIL prompt/tools (ticket → PR)
  storyAuto.js          # auto Story prompt/tools (task → PR develop)
  limits.js             # buildLimitsReport() — live rate-limit /usage (Anthropic OAuth)
  usage.js              # buildUsageReport() — offline ~/.claude/projects parse (chưa dùng tới)
  jobs.js               # running Map (job-lock) + cancel
ecosystem.config.js     # pm2: ai-agent-ui-next + ngrok→5000 (PORT/HOSTNAME từ .env)
```

## Trạng thái: migration xong ✅

UI cũ `ui/server.js` đã xoá. Mọi tính năng đã port sang đây. Mở rộng tiếp:
chỉ thêm route/page mới + 1 entry trong `lib/config.js` (cho project mới).

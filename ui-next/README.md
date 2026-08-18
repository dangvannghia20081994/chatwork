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
  page.jsx              # home: card tới mọi console (Auto/Điều tra/Feature/Release/Rebase/Report/Sprint/Chat…)
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
  investigate/ page.jsx → Investigate.jsx # chat: điều tra ticket read-only (nguyên nhân gốc + đánh giá
                                       #   DEV/SQA + phương án khắc phục) → /api/investigate
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
    investigate/route.js  # SSE điều tra ticket (read-only: Jira + code + git log + SELECT QA)
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
  investigate.js        # điều tra ticket: prompt/argv read-only + CAUSE_OPTIONS (bảng phân loại
                        #   nguyên nhân cố định của team) — không Edit/Write, không git ghi, không ghi Jira
  jira.js               # Jira Cloud REST client server-side (report console dùng thay MCP)
  sprint.js             # burndown "giờ âm" — nguồn chung cho web + skill sprint-negative-hours
  slashCommands.js      # slash-command dùng chung (/usage…) — short-circuit trước khi spawn claude
  sessions.js           # đọc phiên chat Claude CLI (.jsonl); gộp nhiều account, copy phiên giữa account
  accountSwitch.js      # chooseAccount(): chat tự đổi account Claude khi account đang dùng hết quota
  upload.js             # lưu file upload vào .ai-uploads/ trong cwd (chat/report Read được)
  telegram.js           # Telegram long-polling bot (kênh chat thứ 2, dùng lại plumbing lib/claude.js)
  notifySound.js        # beep Web Audio khi run xong/lỗi (AgentConsole)
  limits.js             # live rate-limit /usage (Anthropic OAuth) + quota theo từng account
  usage.js              # buildUsageReport() — offline ~/.claude/projects parse
  jobs.js               # running Map (job-lock) + cancel
ecosystem.config.js     # pm2: ai-agent-ui-next (chỉ Next app; ngrok do ~/IdeaProjects/gateway lo)
```

## Nhiều account Claude — chat tự đổi khi hết quota

pm2 chạy app dưới MỘT account (`CLAUDE_ACCOUNT` trong `.env` → `ecosystem.config.js` set
`CLAUDE_CONFIG_DIR`; để trống = account mặc định và biến này phải UNSET). Khi account đó cạn hạn mức,
console `/chat` tự chạy lượt tiếp theo bằng account còn quota, **vẫn trên cùng phiên**, và in 1 dòng
đầu lượt:

```
⚠️ acct1 hết quota (còn 0%) — chuyển sang acct3 (còn 5%).
```

Cơ chế:

| Bước | Ở đâu |
|---|---|
| Khai báo account (dir + account mặc định) | `lib/config.js` → `ACCOUNTS`, `accountEnv`, `currentAccountKey` |
| Đọc quota còn lại từng account (cache 60s) | `lib/limits.js` → `accountUsage`, `surveyAccounts`, `pickAccountWithQuota` |
| Chọn account + đồng bộ transcript trước khi resume | `lib/accountSwitch.js` → `chooseAccount` |
| Spawn `claude` bằng account đã chọn | `lib/claude.js` → `claudeSSE({ env, notice })` |
| Đánh dấu account cạn khi run báo hết hạn mức | `app/api/chat/route.js` → `markAccountExhausted` |

Phiên nằm ở `<CLAUDE_CONFIG_DIR>/projects/<cwd-mã-hoá>/<session-id>.jsonl`, nên account mới phải
thấy được file đó. Hai cách, dùng song song được:

- **Dùng chung qua symlink (khuyến nghị)** — `../scripts/share-projects.sh go`: account chính giữ file
  thật, account phụ là symlink. Không copy, không thể phân kỳ. Mỗi cwd mới cần chạy lại 1 lần.
- **Copy tự động** — project chưa symlink thì `ensureSessionInAccount` copy bản mới nhất sang account
  sắp chạy (cả 2 chiều, kể cả khi account cũ reset quota và chạy tiếp ở đó).

Fail-open: không đọc được quota (token hết hạn, API lỗi) hoặc copy phiên thất bại → giữ account cũ
đúng như trước, chỉ kèm cảnh báo.

Refresh token: token OAuth mỗi account chỉ được CLI làm mới khi có một lượt `claude` thật chạy dưới
account đó, nên account ít dùng hay bị quá hạn token. Quy tắc:

- **Account của pm2 còn quota** → pre-check không spawn `claude` (đỡ ~15s/lượt); account nào token quá
  hạn thì coi như "không kiểm tra được" và bỏ qua.
- **Account của pm2 đã cạn** → `surveyAccounts({ allowRefresh: true })` refresh token cho ứng viên quá
  hạn trước khi hỏi quota (`claude -p ok --model haiku`, ~15s/account, tối đa 60s rồi kill). Lượt đó
  đằng nào cũng hỏng nếu không đổi account, nên chờ vẫn hơn bỏ sót account còn dư.

Khi không đổi được, dòng cảnh báo nói rõ lý do từng account bị loại — phân biệt "hết quota" (chờ
reset) với "không kiểm tra được: token hết hạn / HTTP 401" (cần `CLAUDE_CONFIG_DIR=<dir> claude auth
login`):

```
⚠️ acct1 đã hết quota, không dùng được account nào khác (acct3 hết quota (còn 1%)) — lượt này vẫn chạy bằng acct1.
```

Giới hạn: chỉ áp cho `/chat`. Các console job (`/auto`, `/feature`, `/release`, `/rebase`, `/report`,
`/investigate`) vẫn chạy bằng account của pm2; `todos/` và `file-history/` (`/rewind`) vẫn riêng theo
account nên không mang theo khi đổi.

## Trạng thái: migration xong ✅

UI cũ `ui/server.js` đã xoá. Mọi tính năng đã port sang đây. Mở rộng tiếp:
chỉ thêm route/page mới + 1 entry trong `lib/config.js` (cho project mới).

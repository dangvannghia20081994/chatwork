# ui-next — Next.js UI

UI chính thức của AI agent (Next.js App Router + React + Tailwind). Đã thay thế hoàn toàn `ui/server.js` cũ (đã xoá). Sau gateway phục vụ ở prefix **`/ai`** (port **5000** qua pm2), Basic Auth qua `.env`.

**Console:** Auto REZIL Fix-Bug (ticket→PR) · **Feature** (BD+Figma → 16-phase → PR) · Auto/Chat **Story** (task→PR develop) · Auto/Chat **Film** (AI Film Studio, task→PR develop) · **Release** (drive github-ops: deploy DEV1/PR/tag) · **Rebase/Merge** (drive git-rebaser) · **Report** (Jira report read-only qua REST CLI) · **Sprint giờ âm** (burndown Expect vs Actual) · Chat REZIL + Chat **Toàn năng** (free, bypass) · `/usage` · Cancel · Basic Auth · `/healthz`.

**Kênh phụ:** Telegram bot (long-polling) chạy ở **pm2 app riêng** `ai-agent-telegram` (`telegram-bot.mjs`) — dùng lại y hệt plumbing chat của web (`buildChatArgv`/`handleEvent`) nên prompt & guardrail giống nhau, nhưng KHÔNG chết theo mỗi lần app Next restart. Có lệnh cứu hộ `/status` `/restart` `/logs` chạy thẳng pm2 (xem §Bot Telegram & cứu hộ pm2).

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
# ecosystem có 2 app: ai-agent-ui-next (Next) + ai-agent-telegram (bot, tiến trình riêng)
npm run build && pm2 start ecosystem.config.js --update-env   # cả 2 app
pm2 restart ecosystem.config.js --update-env                  # sau khi build lại

# ⚠️ ĐỪNG gọi thẳng `pm2 restart ai-agent-ui-next` từ trong console/agent (nó là process con của
# app → bị giết giữa chừng). Dùng script tự tách session:
./scripts/pm2-restart.sh ai-agent-ui-next
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
  evidence/ page.jsx → Evidence.jsx    # chat: chụp/gán evidence TC lên Google Sheet SQA (spec
                                       #   SCREEN_EVIDENCE.md cạnh màn) → /api/evidence
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
    evidence/route.js     # SSE evidence (đọc-ghi sheet SQA + rclone Drive, multi-turn resume)
    sprint/route.js       # POST xlsx → JSON giờ âm (dùng lib/sprint.js)
    sessions/route.js     # list/đọc/xoá phiên Claude CLI (.jsonl) theo project + console
    snapshot/[name]/route.js # serve runtime asset (ảnh snapshot web) — Next16 không serve public/ sau build
    cancel/route.js       # POST hủy job đang chạy
    healthz/route.js      # health check
proxy.js                # HTTP Basic Auth (UI_BASIC_AUTH) — Next "proxy" convention
instrumentation.js      # boot hook; chỉ start bot in-process khi TELEGRAM_IN_PROCESS=1 (mặc định: không)
telegram-bot.mjs        # entry của pm2 app `ai-agent-telegram` — bot chạy tiến trình riêng
scripts/pm2-restart.sh  # restart pm2 an toàn từ bên trong chính app (setsid + bậc thang tự chữa)
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
  evidence.js           # evidence prompt/argv: nhúng nguyên văn spec app/evidence/SCREEN_EVIDENCE.md
                        #   lúc chạy — ghi cột M/N của sheet + upload Drive; không Edit/Write, không git
  jira.js               # Jira Cloud REST client server-side (report console dùng thay MCP)
  sprint.js             # burndown "giờ âm" — nguồn chung cho web + skill sprint-negative-hours
  slashCommands.js      # slash-command dùng chung (/usage…) — short-circuit trước khi spawn claude
  sessions.js           # đọc phiên chat Claude CLI (.jsonl); gộp nhiều account, copy phiên giữa account
  accountSwitch.js      # chooseAccount(): chat tự đổi account Claude khi account đang dùng hết quota
  upload.js             # lưu file upload vào .ai-uploads/ trong cwd (chat/report Read được)
  telegram.js           # Telegram long-polling bot (kênh chat thứ 2, dùng lại plumbing lib/claude.js)
                        #   + lệnh vận hành /status /restart /logs chạy THẲNG pm2, không qua agent
  notifySound.js        # beep Web Audio khi run xong/lỗi (AgentConsole)
  limits.js             # live rate-limit /usage (Anthropic OAuth) + quota theo từng account
  usage.js              # buildUsageReport() — offline ~/.claude/projects parse
  jobs.js               # running Map (job-lock) + cancel
ecosystem.config.js     # pm2: ai-agent-ui-next (chỉ Next app; ngrok do ~/IdeaProjects/gateway lo)
scripts/
  snapshot.mjs          # chụp screenshot 1 trang (kèm --mark khoanh đỏ) → .snapshots/
  debug.mjs             # debug 1 trang qua CDP: console/network/exception + flow click-type + ảnh
  jira-search.mjs       # tra Jira bằng JQL từ CLI (không cần MCP)
  mobile-e2e/           # kịch bản e2e app mobile
```

## Debug trang web qua CDP — `scripts/debug.mjs`

Chạy 1 trang trong Chrome headless rồi in BÁO CÁO gọn: console log/warning/error, uncaught exception,
bảng network (status/ms/TTFB/size, kèm response body nếu cần), kết quả `--eval`, ảnh chụp. Dùng khi cần
biết *trang đang làm gì* — trang trắng, request 4xx/5xx, log lỗi, state sai — chứ chỉ cần ảnh thì dùng
`snapshot.mjs`. Không cần npm dep (CDP qua WebSocket có sẵn trong Node ≥ 21); đầy đủ tuỳ chọn ở đầu file.

```bash
# app CÓ ĐĂNG NHẬP (rezil-esms-mobile): --login tự đăng nhập, --profile giữ session cho lần sau
npm run debug -- http://localhost:5173/inspection/list --login rezil --profile rezil --all-logs

# đường dẫn tương đối = chính UI này: tự ghép PORT + NEXT_PUBLIC_BASE_PATH trong .env,
# --basic-auth auto lấy UI_BASIC_AUTH (không có header thì Chrome dừng ở 401)
npm run debug -- /chat --label chat --basic-auth auto --filter 'api/'

# đi qua flow: chờ selector → nhập → gửi → chờ → soi request + state
npm run debug -- /chat --basic-auth auto \
  --step 'waitfor:textarea' --step 'type:textarea::ping' --step 'key:Enter' --step 'wait:8000' \
  --filter 'api/(chat|cancel)' --body 'api/chat' --eval 'document.querySelectorAll(".md").length'

# app khác, credential để trong file env (không lộ trên command line), chụp giữa flow
npm run debug -- http://localhost:5173/ --env ~/.../rezil-esms-test.env \
  --step 'type:input[name=email]::{{EMAIL}}' --step 'click:button[type=submit]' \
  --step 'waitfor:.home' --step 'shot:sau-login' --json
```

Đăng nhập & profile (phần hay dùng nhất):

| Cần gì | Cờ |
|---|---|
| App có auth, đã có preset (rezil-esms-mobile) | `--login rezil` — tự nhập credential từ file env, submit, chờ rời màn login rồi quay lại đúng URL đã truyền; đang có session thì tự bỏ qua |
| Giữ session giữa các lần chạy | `--profile <ten>` → `ui-next/.chrome-profiles/<ten>` (git-ignored). Không có cờ này thì Chrome tạo profile tạm, mỗi lần chạy là session trắng |
| Trang chưa có preset (GitHub, Jira…) | `--profile <ten> --profile-login` mở cửa sổ Chrome thật để login tay một lần; đóng cửa sổ là script chạy tiếp headless |
| Trang GitHub repo private | `--profile ci` — dùng luôn profile đã login của `scripts/capture-ci-evidence.sh` |

Không login thì gọi thẳng URL màn bên trong chỉ trả về **màn login**, và mọi thứ thu được (console,
network, ảnh) là của màn login — script in cảnh báo rõ khi `--login` thất bại thay vì báo cáo im lặng.

Ghi chú khi dùng lại:

- `--all-logs` in mọi dòng console; mặc định chỉ in error/warning. Cần "check console.log" thì bật cờ này.
- Profile đang bị một Chrome khác chiếm (`SingletonLock`) thì script tự chạy trên **bản chụp** profile
  (cookie + Local State + Local Storage) và ghi rõ "session mới KHÔNG được lưu" — cùng cách xử lý với
  `scripts/capture-ci-evidence.sh`.
- Script đóng Chrome bằng `Browser.close` trước khi kill: `localStorage`/IndexedDB chỉ được ghi xuống
  đĩa khi Chrome tự tắt, kill thẳng là mất session vừa login.

- **Step DSL**: `wait` · `waitfor` · `click` · `type:<sel>::<text>` · `key:<phím>` (kèm modifier:
  `Shift+Enter`, `Ctrl+a`) · `scroll` · `goto` · `eval` · `shot`. Step lỗi thì dừng flow nhưng vẫn in
  báo cáo phần đã thu.
- `type:` **thay** toàn bộ nội dung ô (select-all rồi `Input.insertText`, nên input controlled của
  React/Svelte nhận được thay đổi); muốn nối thêm thì dùng `key:End` + `type` trên selector khác hoặc `eval`.
- `--attach <port>` để dùng Chrome đang mở (`--remote-debugging-port=<port>`) khi cần session đã login sẵn.
- Ảnh lưu ở `.snapshots/` (git-ignored, giữ 60 file mới nhất) và in ra dạng `/ai/api/snapshot/<file>.png`
  — dán nguyên đường dẫn đó vào chat là ảnh hiện inline.
- Credential từ `--env` / `--basic-auth` được che (`***`) trong mọi dòng báo cáo.

## Bot Telegram & cứu hộ pm2

Bot **không** chạy chung tiến trình với Next nữa. Nó là pm2 app riêng `ai-agent-telegram`
(`telegram-bot.mjs` → `lib/telegram.js`), vì bot chính là kênh cứu hộ: chạy chung thì một lần
restart hỏng hay build lỗi là mất luôn đường ra lệnh "khởi động lại pm2".

| Vấn đề đã gặp (2026-08-26) | Cách xử lý hiện tại |
|---|---|
| Agent trong console gõ `pm2 restart ai-agent-ui-next` → pm2 giết cả cây process (agent là process con) → lệnh restart chết giữa chừng, app không lên lại | `scripts/pm2-restart.sh` tự `setsid` sang session mới nên sống sót; prompt guard `PM2_OPS_SAFETY` (lib/claude.js) cấm agent gọi pm2 trực tiếp |
| App chết → bot chết theo → không còn kênh nào ra lệnh | Bot ở pm2 app riêng, `autorestart` + `restart_delay: 5s`; app Next chết không ảnh hưởng |
| Không biết app đang sống hay chết | `/status` trong Telegram (đọc `pm2 jlist`) |

Lệnh trong Telegram — xử lý **trực tiếp bằng pm2 CLI, không qua `claude`**, nên vẫn dùng được khi
agent hỏng hoặc hết quota:

| Lệnh | Việc |
|---|---|
| `/status` | trạng thái + uptime + số lần restart của các app trong `TELEGRAM_PM2_APPS` |
| `/restart [app]` | gọi `scripts/pm2-restart.sh` (mặc định `ai-agent-ui-next`); kết quả báo ngược về đúng chat |
| `/logs [app] [n]` | `n` dòng log cuối (mặc định 40, tối đa 200) |

`scripts/pm2-restart.sh <app>` chạy bậc thang tự chữa: `pm2 restart --update-env` → chờ online →
chưa được thì `pm2 delete` + `pm2 start ecosystem.config.js --only <app>` → vẫn hỏng thì gửi Telegram
kèm 30 dòng log lỗi. Log đầy đủ ở `logs/pm2-restart.log`. Script tự tách session nên dùng được cả khi
app gọi nó chính là app bị restart (kể cả bot tự restart chính mình).

Env liên quan (`ui-next/.env`):

| Biến | Ý nghĩa |
|---|---|
| `TELEGRAM_BOT_TOKEN` | thiếu là bot không chạy (app pm2 exit ngay) |
| `TELEGRAM_ALLOWED_CHAT_IDS` | allowlist; rỗng = bot chỉ trả về chat id để tự whitelist |
| `TELEGRAM_PM2_APPS` | app được phép /status /restart /logs (mặc định `ai-agent-ui-next,ai-agent-telegram`) |
| `TELEGRAM_IN_PROCESS` | `1` = chạy bot trong app Next như cũ (chỉ dùng cho `npm run dev`) |

> ⚠️ Chỉ được **một** process poll một token. Bật `TELEGRAM_IN_PROCESS=1` thì phải
> `pm2 stop ai-agent-telegram` trước, không thì Telegram trả 409 Conflict và cả hai đều nhận thiếu tin.

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
| Đánh dấu account bị tổ chức chặn Claude Code | `app/api/chat/route.js` → `markAccountBlocked` (xem dưới) |
| Chạy lại NGAY trong lượt bằng account khác | `lib/claude.js` → `claudeSSE({ retry })` + `lib/accountSwitch.js` → `fallbackAccount` |

Phiên nằm ở `<CLAUDE_CONFIG_DIR>/projects/<cwd-mã-hoá>/<session-id>.jsonl`, nên account mới phải
thấy được file đó. Hai cách, dùng song song được:

- **Dùng chung qua symlink (khuyến nghị)** — `../scripts/share-projects.sh go`: account chính giữ file
  thật, account phụ là symlink. Không copy, không thể phân kỳ. Mỗi cwd mới cần chạy lại 1 lần. Chạy
  một lần cho MỖI account phụ — `CLAUDE_ALT_DIR` mặc định là `~/.claude-account3`:
  `CLAUDE_ALT_DIR=~/.claude-account2 ../scripts/share-projects.sh go`.
- **Copy tự động** — project chưa symlink thì `ensureSessionInAccount` copy bản mới nhất sang account
  sắp chạy (cả 2 chiều, kể cả khi account cũ reset quota và chạy tiếp ở đó).

Fail-open: không đọc được quota (token hết hạn, API lỗi) hoặc copy phiên thất bại → giữ account cũ
đúng như trước, chỉ kèm cảnh báo.

### Ngoài hết quota: 2 trường hợp cũng phải đổi account

Cả hai đều là NGOẠI LỆ của fail-open — giữ account cũ thì lượt nào cũng chết, nên đổi là lựa chọn duy
nhất còn chạy được:

1. **Mất đăng nhập** — access token hết hạn mà refresh token cũng mất/hết hạn (`unusableReason` trong
   `lib/limits.js`). CLI sẽ chết với "OAuth session expired and could not be refreshed". Xử lý:
   `CLAUDE_CONFIG_DIR=<dir> claude auth login`.
2. **Tổ chức tắt Claude subscription cho Claude Code** — run chết ngay với:

   ```
   ⚠ Your organization has disabled Claude subscription access for Claude Code · Use an Anthropic API key instead, or ask your admin to enable access
   ```

   Lỗi này KHÔNG tự hết sau vài giờ và API `/usage` vẫn trả quota bình thường, nên không đo ra được —
   chỉ bắt được bằng text (`BLOCKED_RE` trong `lib/accountSwitch.js`, khớp cả `result` lẫn stderr).
   Vì vậy nó được nhớ RIÊNG (`markAccountBlocked`), giữ suốt đời process (pm2 restart là hết) thay vì
   đi qua cache quota 60s — nếu coi là "hết quota" thì sau 60s account lại được chọn lại và lượt nào
   cũng chết. Account đã đánh dấu bị loại khỏi mọi lựa chọn sau đó; dòng cảnh báo ghi "bị tổ chức chặn
   Claude Code", và nếu không còn account nào khác thì nhắc nhờ admin bật lại / dùng Anthropic API key.

### Chạy lại ngay trong lượt (không mất lượt)

Hai lỗi trên chỉ lộ ra KHI RUN ĐÃ CHẾT, còn `chooseAccount` chạy trước đó — nếu chỉ đổi account cho
lượt sau thì lượt đang gửi luôn hỏng và người dùng phải gửi lại. Vì vậy `claudeSSE` nhận thêm hook
`retry`: tiến trình `claude` chết → hỏi caller có env khác để chạy lại không → có thì **spawn lại
nguyên argv trong CÙNG stream** (chưa phát `end`, client chỉ thấy thêm 1 dòng thông báo):

```
Your organization has disabled Claude subscription access for Claude Code · …
⚠️ acct1 bị tổ chức chặn Claude Code — chạy lại lượt này bằng acct2 (còn 97%).
4
```

Chi tiết đáng lưu ý:

- Tối đa 3 lần spawn cho mỗi lượt (`MAX_SPAWNS` trong `lib/claude.js`) — bằng số account trên máy.
- Chỉ chạy lại khi lượt **chưa trả ra nội dung thật** (`contentLen` trong route). CLI in dòng
  "Your organization has disabled…" như **text của assistant** (event `delta`, kèm
  `api_error_status: 403`), nên đoạn text khớp `BLOCKED_RE`/`LIMIT_RE` KHÔNG được tính là nội dung —
  tính cả nó thì đúng lượt cần chạy lại nhất lại bị chặn.
- `session` được phát lại cho lượt mới: lượt hỏng có thể đã tạo session id ở account cũ, client phải
  giữ id của lượt chạy được, nếu không lượt sau resume nhầm phiên rỗng.
- Console job (`/auto`, `/feature`, …) không truyền `retry` → hành vi y như trước.

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

Giới hạn: áp cho `/chat`, `/release` và `/evidence` (cả ba đều đa lượt, resume theo phiên;
`/release` an toàn vì cả 3 account đều có agent `github-ops` và cùng bộ MCP server, `/evidence` vì
cả 3 account đều có `gsheets-rezil` + `mysql_207` và cùng đọc được spec `SCREEN_EVIDENCE.md`). Các
console job còn lại (`/auto`, `/feature`, `/rebase`, `/report`, `/investigate`) vẫn chạy bằng
account của pm2; `todos/` và
`file-history/` (`/rewind`) vẫn riêng theo account nên không mang theo khi đổi. Đổi account xảy ra ở
ĐẦU LƯỢT (`chooseAccount`, theo quota đo được) và ở lúc RUN VỪA CHẾT (`retry` → `fallbackAccount`,
theo lỗi thật của run). Lượt đã trả ra nội dung rồi mới cạn quota thì vẫn hỏng — lượt kế tiếp mới
nhảy account.

## Trạng thái: migration xong ✅

UI cũ `ui/server.js` đã xoá. Mọi tính năng đã port sang đây. Mở rộng tiếp:
chỉ thêm route/page mới + 1 entry trong `lib/config.js` (cho project mới).

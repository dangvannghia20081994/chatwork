#!/usr/bin/env bash
# Khởi động lại một app pm2 AN TOÀN, kể cả khi lệnh được gọi từ bên trong chính app đó.
#
# Vì sao cần script này: console (/chat, /auto…) spawn `claude`, nên agent là process CON của
# ai-agent-ui-next. Agent gõ thẳng `pm2 restart ai-agent-ui-next` là pm2 giết cả cây process →
# lệnh restart bị SIGKILL giữa chừng → app không lên lại, SSE đứt, mất luôn kênh điều khiển.
# Script tự `setsid` sang session mới nên nó sống sót qua cái chết của app đã gọi nó.
#
#   ./scripts/pm2-restart.sh [app]        # mặc định: ai-agent-ui-next
#   ./scripts/pm2-restart.sh [app] --fresh # delete + start lại từ ecosystem (nạp lại ui-next/.env)
#   NOTIFY_CHAT_ID=123 ./scripts/pm2-restart.sh ai-agent-telegram
#
# Bậc thang tự chữa: restart --update-env → (nếu chưa online) delete + start ecosystem --only
# → vẫn hỏng thì báo Telegram kèm 30 dòng log lỗi. Log đầy đủ: ui-next/logs/pm2-restart.log
#
# `--fresh` bỏ qua bậc 1 và đi thẳng delete + start. Cần dùng khi vừa sửa `ui-next/.env`:
# `pm2 restart` KHÔNG nạp lại file đó — `ecosystem.config.js` chỉ đọc `.env` (qua dotenv) ở thời
# điểm `pm2 start`, nên giá trị cũ còn nguyên trong env của app cho tới khi delete + start.
# Sửa code trong `app/`/`lib/` thì không cần `--fresh`, nhưng nhớ `npm run build` TRƯỚC khi restart.
set -uo pipefail

# Đối số: tên app (vị trí bất kỳ) + cờ --fresh. Cờ được giữ nguyên khi script tự gọi lại sau setsid.
APP=""
FRESH=0
for a in "$@"; do
  case "$a" in
    --fresh) FRESH=1 ;;
    -*) ;;
    *) [ -z "$APP" ] && APP="$a" ;;
  esac
done
APP="${APP:-ai-agent-ui-next}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # ui-next/
LOG="$HERE/logs/pm2-restart.log"
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

# --- lần gọi đầu: tách hẳn khỏi process group của caller rồi thoát ngay ---
if [ "${AI_PM2_RESTART_DETACHED:-}" != "1" ]; then
  mkdir -p "$HERE/logs"
  AI_PM2_RESTART_DETACHED=1 NOTIFY_CHAT_ID="${NOTIFY_CHAT_ID:-}" \
    setsid -f "${BASH_SOURCE[0]}" "$@" </dev/null >>"$LOG" 2>&1
  echo "Đã tách tiến trình restart cho '$APP'. Theo dõi: tail -f $LOG"
  exit 0
fi

# pm2 nhét env của SHELL gọi lệnh vào app, ĐÈ cả phần ecosystem.config.js đã xoá (đo 2026-08-26:
# app giữ nguyên CLAUDE_CONFIG_DIR/CLAUDE_EFFORT của phiên gọi lệnh, kể cả khi dùng
# `pm2 delete` + `pm2 start ecosystem`). Gọi script này từ trong một phiên Claude Code mà không xoá
# thì app chạy nhầm account của phiên đó và truyền tiếp biến ấy cho MỌI `claude -p` nó spawn.
for k in $(env | sed -n 's/^\(CLAUDECODE\|CLAUDE_[A-Za-z0-9_]*\|AI_AGENT\)=.*/\1/p'); do
  [ "$k" = "AI_PM2_RESTART_DETACHED" ] && continue
  unset "$k"
done

log() { echo "[$(date '+%F %T')] $*"; }

app_status() {
  pm2 jlist 2>/dev/null | node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d)).on("end", () => {
      let a = [];
      try { a = JSON.parse(s.slice(s.indexOf("["))); } catch {}
      const p = a.find((x) => x.name === process.argv[1]);
      process.stdout.write(p ? p.pm2_env.status : "missing");
    });' "$1"
}

# Chờ tới N giây cho app về trạng thái online.
wait_online() {
  local app="$1" deadline=$((SECONDS + ${2:-25}))
  while [ $SECONDS -lt $deadline ]; do
    [ "$(app_status "$app")" = "online" ] && sleep 2 && \
      [ "$(app_status "$app")" = "online" ] && return 0
    sleep 2
  done
  return 1
}

envval() { sed -n "s/^$1=//p" "$HERE/.env" 2>/dev/null | head -1 | tr -d '"'"'" | xargs; }

notify() {
  local token chat ids
  token="$(envval TELEGRAM_BOT_TOKEN)"
  [ -z "$token" ] && return 0
  ids="${NOTIFY_CHAT_ID:-}"
  [ -z "$ids" ] && ids="$(envval TELEGRAM_NOTIFY_CHAT_IDS)"
  [ -z "$ids" ] && ids="$(envval TELEGRAM_ALLOWED_CHAT_IDS)"
  [ -z "$ids" ] && return 0
  for chat in ${ids//,/ }; do
    curl -s -m 15 -o /dev/null -X POST "https://api.telegram.org/bot$token/sendMessage" \
      --data-urlencode "chat_id=$chat" --data-urlencode "text=$1" || true
  done
}

# Cho caller (SSE/tin nhắn Telegram) kịp gửi nốt phản hồi trước khi process bị thay.
sleep 2
log "=== restart '$APP' (status hiện tại: $(app_status "$APP"))$([ "$FRESH" = 1 ] && echo " · --fresh") ==="

if [ "$FRESH" != 1 ]; then
  pm2 restart "$APP" --update-env 2>&1 | tail -5

  if wait_online "$APP" 25; then
    log "OK: '$APP' online sau pm2 restart."
    notify "✅ Đã khởi động lại '$APP'. Trạng thái: online."
    exit 0
  fi
  log "pm2 restart không đưa được '$APP' về online — thử delete + start lại từ ecosystem."
else
  log "--fresh: bỏ qua pm2 restart, delete + start thẳng từ ecosystem để nạp lại .env."
fi

pm2 delete "$APP" 2>&1 | tail -3
pm2 start "$HERE/ecosystem.config.js" --only "$APP" --update-env 2>&1 | tail -5

if wait_online "$APP" 40; then
  # Danh sách app vừa đổi (delete + start) → lưu lại để `pm2 resurrect` sau reboot không dựng bản cũ.
  pm2 save >/dev/null 2>&1
  log "OK: '$APP' online sau delete + start ecosystem."
  notify "✅ Đã khởi động lại '$APP' ($([ "$FRESH" = 1 ] && echo "--fresh: delete + start, đã nạp lại .env" || echo "phải delete + start lại từ ecosystem")). Trạng thái: online."
  exit 0
fi

log "FAIL: '$APP' vẫn không online."
ERR="$(tail -30 "$HERE/logs/ui-error.log" 2>/dev/null)"
[ -z "$ERR" ] && ERR="$(pm2 logs "$APP" --lines 30 --nostream --err 2>/dev/null | tail -30)"
log "$ERR"
notify "❌ Không khởi động lại được '$APP' (trạng thái: $(app_status "$APP")).

30 dòng log lỗi cuối:
$(echo "$ERR" | tail -30)"
exit 1

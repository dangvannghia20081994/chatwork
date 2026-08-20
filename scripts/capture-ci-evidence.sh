#!/usr/bin/env bash
# Chụp ảnh evidence "CI/CD pipeline run success" cho một đợt deploy, bằng headless Chrome trên
# chính trang GitHub Actions (ảnh UI thật, không phải báo cáo dựng lại từ API).
#
# Ảnh ra đúng convention của luồng release: ~/deploy-evidence/<dd-MM>/<DEV1|STG>/{lib,admin,mobile,portal}.png
# rồi `github-ops` upload lên Drive (xem §Evidence Folder trên Google Drive trong .claude/agents/github-ops.md).
#
# GitHub Actions của repo private cần đăng nhập → dùng MỘT profile Chrome riêng (không đụng profile
# Chrome hằng ngày). Đăng nhập 1 lần:
#
#   scripts/capture-ci-evidence.sh login
#
# Rồi mỗi đợt deploy:
#
#   scripts/capture-ci-evidence.sh --env STG --tag stg/v0.3.3 --date 19-08
#
# Mỗi ảnh = trang Actions của 1 repo, filter theo tag của đợt, nên thấy được TẤT CẢ workflow của repo
# đó trong 1 ảnh (admin có be-api / be-lambda / web).
set -euo pipefail

OWNER=hybrid-tech-rezil
PROFILE="${CI_SHOT_PROFILE:-$HOME/.local/share/ci-evidence-profile}"
OUT_ROOT="${CI_SHOT_OUT:-$HOME/deploy-evidence}"
CHROME="$(command -v google-chrome || command -v google-chrome-stable || true)"
WINDOW="${CI_SHOT_WINDOW:-1600,1400}"
BUDGET="${CI_SHOT_BUDGET:-15000}"

# name=repo — `name` là tên file .png, khớp convention folder evidence.
REPOS=(
  "lib=rezil-esms-lib"
  "admin=rezil-esms"
  "mobile=rezil-esms-mobile"
  "portal=rezil-esms-portal"
)

die() { echo "ERROR: $*" >&2; exit 1; }

[ -n "$CHROME" ] || die "không tìm thấy google-chrome"

# Headless KHÔNG chạy trực tiếp trên $PROFILE: Chrome giữ SingletonLock trên user-data-dir, nên một
# tiến trình còn sống (cửa sổ login chưa đóng, hoặc lần chạy trước bị treo) sẽ làm mọi lần sau chết với
# "Failed to create a ProcessSingleton for your profile directory" — và script chỉ thấy trang rỗng.
# Vì vậy mỗi lần chạy tạo một bản chụp nhỏ của profile (chỉ cookie + khoá giải mã) rồi dùng bản đó.
SNAP=""
snap_profile() {
  [ -n "$SNAP" ] && return 0
  [ -d "$PROFILE" ] || die "chưa có profile $PROFILE — chạy: $0 login"
  SNAP="$(mktemp -d "${TMPDIR:-/tmp}/ci-shot-XXXXXX")"
  mkdir -p "$SNAP/Default"
  cp "$PROFILE/Local State" "$SNAP/Local State" 2>/dev/null \
    || die "profile thiếu 'Local State' — chạy lại: $0 login"
  # Cookie: Chrome mới để ở Default/Network/Cookies, bản cũ ở Default/Cookies.
  if [ -f "$PROFILE/Default/Network/Cookies" ]; then
    mkdir -p "$SNAP/Default/Network"
    cp "$PROFILE/Default/Network/Cookies" "$SNAP/Default/Network/Cookies"
  elif [ -f "$PROFILE/Default/Cookies" ]; then
    cp "$PROFILE/Default/Cookies" "$SNAP/Default/Cookies"
  else
    die "profile không có cookie — chạy lại: $0 login"
  fi
  # KHÔNG copy Default/Preferences: nó mang theo cấu hình extension (Google Docs Offline...) và headless
  # sẽ treo ở bước register service worker — `--dump-dom` không bao giờ trả về (đã gặp 2026-08-20).
  trap 'rm -rf "$SNAP"' EXIT
}

chrome_common=(--headless=new --disable-gpu --no-sandbox --no-first-run --disable-extensions
  --disable-sync --no-default-browser-check --disable-component-extensions-with-background-pages)

chrome_shot() { # $1=url  $2=file ảnh  $3=window-size (mặc định $WINDOW)
  snap_profile
  timeout 120 "$CHROME" "${chrome_common[@]}" --hide-scrollbars \
    --user-data-dir="$SNAP" --window-size="${3:-$WINDOW}" \
    --virtual-time-budget="$BUDGET" --screenshot="$2" "$1" >/dev/null 2>&1
}

chrome_dom() { # $1=url — in DOM ra stdout, dùng để kiểm tra đã đăng nhập chưa
  snap_profile
  timeout 120 "$CHROME" "${chrome_common[@]}" \
    --user-data-dir="$SNAP" --virtual-time-budget="$BUDGET" \
    --dump-dom "$1" 2>/dev/null
}

cmd_login() {
  mkdir -p "$PROFILE"
  echo "Mở Chrome (profile riêng: $PROFILE)."
  echo "Đăng nhập GitHub account có quyền đọc repo $OWNER rồi ĐÓNG cửa sổ Chrome."
  "$CHROME" --user-data-dir="$PROFILE" --new-window "https://github.com/login" >/dev/null 2>&1 || true
  # Cửa sổ đã đóng nhưng tiến trình còn sót sẽ giữ lock trên profile → dọn cho chắc.
  pkill -f "user-data-dir=$PROFILE" 2>/dev/null || true
  sleep 1
  rm -f "$PROFILE/SingletonLock" "$PROFILE/SingletonSocket" "$PROFILE/SingletonCookie"
  cmd_check
}

# Tiêu đề trang là dấu hiệu tin cậy duy nhất: repo private mà chưa đăng nhập thì GitHub trả
# "Page not found · GitHub" (KHÔNG phải trang login), và DOM 404 đó VẪN chứa tên repo trong URL —
# nên không được kiểm bằng cách grep tên repo trong toàn bộ DOM.
page_title() { # $1=url
  chrome_dom "$1" | grep -o '<title>[^<]*</title>' | head -1 | sed -e 's/<[^>]*>//g'
}

# Kiểm quyền trên trang CHỦ của repo, KHÔNG phải trang /actions: /actions giữ kết nối live để cập nhật
# trạng thái run nên `--dump-dom` không bao giờ thấy network-idle và treo tới hết timeout.
assert_authorized() { # $1=repo  $2=nhãn để báo lỗi
  local title url="https://github.com/$OWNER/$1"
  title="$(page_title "$url" || true)"
  [ -n "$title" ] || die "$2: không tải được trang ($url)"
  case "$title" in
    *"Page not found"*|*"Sign in"*|*"Confirm your account"*)
      die "$2: profile chưa đăng nhập / không có quyền — trang trả về \"$title\". Chạy: $0 login" ;;
  esac
  grep -q "$1" <<<"$title" || die "$2: tiêu đề lạ (\"$title\") — kiểm tra $url"
  echo "$title"
}

cmd_check() {
  [ -d "$PROFILE" ] || die "chưa có profile $PROFILE — chạy: $0 login"
  local t
  t="$(assert_authorized "rezil-esms" "check")"
  echo "OK: profile đọc được repo private — \"$t\""
}

cmd_shot() {
  local env="" tag="" date_dir="" only=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --env)   env="$2"; shift 2 ;;
      --tag)   tag="$2"; shift 2 ;;
      --date)  date_dir="$2"; shift 2 ;;
      --only)  only="$2"; shift 2 ;;   # vd --only lib,admin
      *) die "tham số lạ: $1" ;;
    esac
  done
  [ -n "$env" ]      || die "thiếu --env DEV1|STG"
  [ -n "$tag" ]      || die "thiếu --tag (vd stg/v0.3.3)"
  [ -n "$date_dir" ] || die "thiếu --date dd-MM (vd 19-08)"
  case "$env" in DEV1|STG) ;; *) die "--env chỉ nhận DEV1 hoặc STG" ;; esac

  cmd_check

  local dest="$OUT_ROOT/$date_dir/$env"
  mkdir -p "$dest"
  local tag_enc="${tag//\//%2F}"

  command -v gh >/dev/null || die "cần gh CLI để kiểm tra CI trước khi chụp"

  for entry in "${REPOS[@]}"; do
    local name="${entry%%=*}" repo="${entry#*=}"
    if [ -n "$only" ] && [[ ",$only," != *",$name,"* ]]; then continue; fi

    # Chỉ chụp khi CI của đúng tag đó đã success — evidence không được lấy từ run đang chạy/fail.
    local runs total bad
    runs="$(gh run list --repo "$OWNER/$repo" --limit 50 \
              --json headBranch,conclusion,name,url 2>/dev/null || echo '[]')"
    total="$(jq --arg t "$tag" '[.[] | select(.headBranch==$t)] | length' <<<"$runs")"
    bad="$(jq -r --arg t "$tag" '[.[] | select(.headBranch==$t) | select(.conclusion!="success")] | length' <<<"$runs")"

    local url="https://github.com/$OWNER/$repo/actions?query=branch%3A$tag_enc"
    if [ "$total" = "0" ]; then
      die "$name: không có run nào cho tag $tag — chưa deploy hoặc sai tag"
    elif [ "$bad" != "0" ]; then
      echo "! $name: $bad/$total run của tag $tag KHÔNG success:" >&2
      jq -r --arg t "$tag" '.[] | select(.headBranch==$t) | select(.conclusion!="success") | "    \(.name) → \(.conclusion // "đang chạy")  \(.url)"' <<<"$runs" >&2
      die "$name: CI chưa xanh hết, không chụp evidence"
    else
      echo "   CI: $total/$total run success"
    fi

    local png="$dest/$name.png"
    echo "→ $name  ($repo, tag $tag)"
    # Kiểm quyền TỪNG repo trước khi chụp — tránh lưu ảnh trang 404 làm evidence.
    assert_authorized "$repo" "$name" >/dev/null
    # Cao ảnh theo số run để không thừa quá nhiều khoảng trắng, cũng không cắt mất run.
    local h=$(( 360 + total * 80 )); [ "$h" -lt 500 ] && h=500; [ "$h" -gt 2400 ] && h=2400
    chrome_shot "$url" "$png" "${WINDOW%%,*},$h"
    [ -s "$png" ] || die "$name: không tạo được ảnh"
    echo "   $png  ($(du -h "$png" | cut -f1))"
  done

  echo
  echo "Xong. Ảnh tại: $dest"
  ls -1 "$dest"
  echo
  echo "Kiểm tra bằng mắt (ảnh phải thấy run success của đợt) rồi mới upload lên Drive."
}

case "${1:-}" in
  login) cmd_login ;;
  check) cmd_check ;;
  ""|-h|--help)
    sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
    ;;
  *) cmd_shot "$@" ;;
esac

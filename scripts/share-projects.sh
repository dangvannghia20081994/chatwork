#!/usr/bin/env bash
# Cho nhiều account Claude dùng CHUNG thư mục phiên (transcript): account chính giữ file thật, account
# phụ chỉ là symlink. Nhờ vậy account nào hết quota thì account kia chạy tiếp ĐÚNG phiên đó, không
# phải copy gì — xem ui-next/lib/accountSwitch.js (console tự đổi account khi hết quota).
#
#   - Phiên riêng của account phụ được MOVE sang account chính (trùng tên thì BỎ QUA, không ghi đè).
#   - `memory` ở account phụ: symlink → xoá (đang trỏ về account chính, dư); thư mục thật → move sang.
#   - Thư mục chỉ có ở account chính → tạo symlink ở account phụ để lần sau chạy là thấy luôn.
#
# Idempotent: chạy lại chỉ bù thư mục project mới (mỗi cwd mới cần symlink một lần).
# Chạy không tham số = DRY RUN (chỉ in ra sẽ làm gì). Chạy với `go` = thực thi.
#
# Đổi account qua biến môi trường:
#   CLAUDE_MAIN_DIR (mặc định ~/.claude) · CLAUDE_ALT_DIR (mặc định ~/.claude-account3)
# Có nhiều account phụ thì chạy MỖI account một lần, ví dụ:
#   CLAUDE_ALT_DIR=~/.claude-account2 ./scripts/share-projects.sh go
set -uo pipefail

MAIN="${CLAUDE_MAIN_DIR:-$HOME/.claude}/projects"
ALT="${CLAUDE_ALT_DIR:-$HOME/.claude-account3}/projects"
GO=0; [ "${1:-}" = "go" ] && GO=1
run() { if [ "$GO" -eq 1 ]; then "$@" || echo "    LỖI: $*"; else echo "    [dry] $*"; fi; }

moved_sessions=0; linked=0; skipped=0; mem_moved=0; mem_dropped=0

encs=$(ls -1 "$MAIN" "$ALT" 2>/dev/null | grep -v '^$' | grep -v ':$' | sort -u)
for enc in $encs; do
  src="$ALT/$enc"; dst="$MAIN/$enc"

  # account phụ đã là symlink → xong từ trước
  if [ -L "$src" ]; then skipped=$((skipped+1)); continue; fi

  [ -d "$dst" ] || run mkdir -p "$dst"

  if [ -d "$src" ]; then
    echo "  $enc"
    # 1) memory
    if [ -L "$src/memory" ]; then
      run rm -f "$src/memory"; mem_dropped=$((mem_dropped+1))
    elif [ -d "$src/memory" ]; then
      if [ -e "$dst/memory" ]; then
        echo "    memory: account chính đã có → copy không ghi đè"
        run cp -rn "$src/memory/." "$dst/memory/"
        run rm -rf "$src/memory"
      else
        run mv "$src/memory" "$dst/memory"
      fi
      mem_moved=$((mem_moved+1))
    fi
    # 2) phiên + thư mục tool-results của phiên
    n=0
    for item in "$src"/*; do
      [ -e "$item" ] || continue
      base=$(basename "$item")
      if [ -e "$dst/$base" ]; then
        echo "    TRÙNG (giữ nguyên bên account phụ, không move): $base"
        continue
      fi
      run mv "$item" "$dst/$base"
      case "$base" in *.jsonl) n=$((n+1));; esac
    done
    [ "$n" -gt 0 ] && echo "    đã move $n phiên"
    moved_sessions=$((moved_sessions+n))
    # 3) thay thư mục account phụ bằng symlink (chỉ khi đã rỗng)
    if [ "$GO" -eq 1 ]; then
      if rmdir "$src" 2>/dev/null; then
        ln -s "$dst" "$src" && linked=$((linked+1))
      else
        echo "    BỎ QUA symlink: $src còn sót nội dung → $(ls -A "$src" | head -3 | tr '\n' ' ')"
      fi
    else
      echo "    [dry] rmdir $src && ln -s $dst $src"
      linked=$((linked+1))
    fi
  else
    # account phụ chưa có gì cho ENC này → chỉ cần symlink
    echo "  $enc  (account phụ chưa có → chỉ tạo symlink)"
    run ln -s "$dst" "$src"
    linked=$((linked+1))
  fi
done

echo
echo "Tổng kết$([ "$GO" -eq 1 ] || echo ' (DRY RUN)'):"
echo "  phiên move sang account chính: $moved_sessions"
echo "  symlink tạo                  : $linked"
echo "  đã là symlink từ trước       : $skipped"
echo "  memory thật move             : $mem_moved | memory symlink dư xoá: $mem_dropped"

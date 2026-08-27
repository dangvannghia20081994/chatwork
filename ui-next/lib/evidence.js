// Evidence console (REZIL - MOBILE): chụp / gán evidence cho test case trên Google Sheet SQA.
//
// Toàn bộ QUY TRÌNH nằm trong spec `ui-next/app/evidence/SCREEN_EVIDENCE.md` — file đó là source of
// truth, được ĐỌC LÚC CHẠY và nhúng nguyên văn vào system prompt. Sửa spec là đổi hành vi màn này
// ngay lượt sau, không cần sửa file này.
//
// Việc agent làm mỗi lượt (rút gọn từ spec):
//   1. Đọc tab sheet → lọc TC thiếu evidence (cột M trống, cột J = OK).
//   2. `rclone lsf` folder Drive của sheet → TC nào ĐÃ có file thì chỉ lấy link, KHÔNG chụp lại.
//   3. TC còn thiếu: dựng pre-condition (SELECT ở DB 207) → chạy `debug.mjs` trên web mobile,
//      khoanh đỏ phần tử của TC → chụp.
//   4. Upload cả batch lên folder Drive (dừng nếu trùng tên) → lấy link từ field `ID` của `lsjson`.
//   5. Ghi cột M bằng HYPERLINK (Sheets API), đọc lại verify, báo TC ghi được / TC skip + lý do.
//
// Anh em với investigate.js (cùng khung AgentConsole + claudeSSE) nhưng đây là console CÓ GHI: ghi
// file ảnh lên Drive và ghi cột M/N của sheet. Không sửa code repo — Write/Edit chỉ dùng cho bản đồ
// selector `app/evidence/SELECTORS_<SCREEN>.md` + 2 file spec/reference cạnh nó (xem EVIDENCE_ALLOWED);
// không git/gh, không DML lên DB.
import fs from "fs";
import os from "os";
import path from "path";
import { ROOT, ACCOUNTS, currentAccountKey, accountHome } from "./config.js";
import { sessionCopies } from "./sessions.js";
import { WORDING_INSTR } from "./claude.js";

// Spec nằm cạnh màn /evidence. Đọc lúc chạy để sửa spec là có hiệu lực ngay.
export const SPEC_REL = "ui-next/app/evidence/SCREEN_EVIDENCE.md";

export function readSpec() {
  try {
    return fs.readFileSync(path.join(ROOT, SPEC_REL), "utf8").trim();
  } catch {
    return ""; // thiếu spec → prompt vẫn chạy được, nhưng agent phải dừng và báo (xem prompt)
  }
}

// Tool cần: đọc/chạy script chụp (Bash + Read/Grep/Glob), đọc-ghi sheet (MCP gsheets-rezil),
// SELECT dữ liệu dựng pre-condition (MCP mysql_207).
// Write/Edit mở từ 2026-08-26 CHỈ cho 2 file trong `app/evidence/`: bản đồ selector
// `SELECTORS_<SCREEN>.md` (spec §4 bắt agent ghi lại selector vừa verify để lượt sau khỏi dò) và
// chính spec `SCREEN_EVIDENCE.md` (ghi lại số đếm/cạm bẫy mới đo được). Phạm vi file là RÀNG BUỘC
// MỀM trong system prompt: run dùng
// `--permission-mode bypassPermissions` nên deny-list không nhận pattern theo đường dẫn; bù lại mọi
// đường git/gh vẫn bị chặn nên thay đổi lạc chỗ không thể vào lịch sử repo.
export const EVIDENCE_ALLOWED = [
  "Read", "Grep", "Glob", "Bash", "TodoWrite", "Write", "Edit",
  "mcp__gsheets-rezil__list_sheets",
  "mcp__gsheets-rezil__get_sheet_data",
  "mcp__gsheets-rezil__get_sheet_formulas",
  "mcp__gsheets-rezil__find_in_spreadsheet",
  "mcp__gsheets-rezil__update_cells",
  "mcp__gsheets-rezil__batch_update_cells",
  "mcp__gsheets-rezil__batch_update",
  "mcp__mysql_207__mysql_query",
];

// Chặn: sửa code repo, mọi đường git/gh, và các lệnh rclone có thể XOÁ evidence của người khác.
// `rclone copy/copyto/lsf/lsjson` vẫn mở (upload + lấy link theo spec §5); `moveto` mở để rename có
// điều kiện (§7). `rclone link` không chặn ở đây nhưng spec CẤM — lệnh đó cấp quyền anyone-with-link.
export const EVIDENCE_DISALLOWED = [
  "NotebookEdit",
  "AskUserQuestion",
  // Không sửa code / không đụng lịch sử repo từ màn này.
  "Bash(git commit:*)",
  "Bash(git push:*)",
  "Bash(git switch:*)",
  "Bash(git checkout:*)",
  "Bash(git merge:*)",
  "Bash(git rebase:*)",
  "Bash(git reset:*)",
  "Bash(git revert:*)",
  "Bash(gh pr create:*)",
  "Bash(gh pr merge:*)",
  "Bash(gh release:*)",
  // rclone: được copy/list (+ moveto để rename). delete/move/sync/rmdir đều có thể mất evidence đã có.
  "Bash(rclone delete:*)",
  "Bash(rclone deletefile:*)",
  "Bash(rclone purge:*)",
  "Bash(rclone rmdir:*)",
  "Bash(rclone rmdirs:*)",
  "Bash(rclone move:*)",
  // `moveto` KHÔNG chặn: đó là cách rename file trên Drive, mà rename đã được mở (2026-08-26) với
  // điều kiện người dùng yêu cầu trực tiếp hoặc xác nhận trước — rule ở SCREEN_EVIDENCE.md §7.
  // `move` (cả thư mục) vẫn chặn, và mọi lệnh xoá vẫn chặn.
  "Bash(rclone sync:*)",
  // Destructive shell.
  "Bash(rm:*)",
  "Bash(sudo:*)",
];

export function evidenceSystemPrompt(nowStamp) {
  const spec = readSpec();
  return [
    `Bây giờ là ${nowStamp} (Asia/Ho_Chi_Minh). KHÔNG tự sinh ngày/giờ khác.`,
    "",
    "# VAI TRÒ",
    "Bạn chụp và gán evidence cho test case của team SQA REZIL trên Google Sheet, theo ĐÚNG spec",
    `\`${SPEC_REL}\` được nhúng nguyên văn bên dưới. Spec là source of truth: mọi quy tắc đặt tên file,`,
    "cách ghi cột M, thứ tự các bước, ràng buộc — lấy từ đó, KHÔNG tự chế.",
    "",
    spec
      ? "# SPEC (nguyên văn, tuân thủ tuyệt đối)\n\n" + spec
      : `# SPEC KHÔNG ĐỌC ĐƯỢC\nKhông đọc được \`${ROOT}/${SPEC_REL}\`. DỪNG LẠI, báo người dùng đường dẫn thiếu, KHÔNG tự suy diễn quy trình.`,
    "",
    "# CÁCH LÀM VIỆC Ở CONSOLE NÀY",
    "- Người dùng đưa phạm vi (tên tab + dải TC, ví dụ `MOB-011 TC 507-530`). Không nói rõ tab thì",
    "  hỏi lại 1 câu duy nhất rồi dừng lượt; không tự đoán tab.",
    "- Mở đầu mỗi lượt: in bảng kế hoạch batch — TC nào đã có file trên Drive (chỉ gán link), TC nào",
    "  phải chụp, TC nào cần thao tác ghi dữ liệu lên env (submit/approve...). Rồi mới chạy.",
    "- Bám kích thước batch trong spec. Xong batch thì báo bảng kết quả: TC đã ghi cột M · TC skip +",
    "  lý do · file đã upload. Không tường thuật từng lệnh.",
    "- Số liệu phải LẤY THẬT (đọc sheet, `rclone lsf`, SELECT). Cấm phỏng đoán số đếm hay bịa link.",
    "- Ảnh chụp xong PHẢI tự kiểm 2 lớp (spec §4): `__mark` trả `marked`, và",
    "  `node ui-next/scripts/shot-check.mjs \"$STAGE\"` cho cả thư mục staging — chỉ `OK` không cờ mới",
    "  được upload. Ảnh `NO-RED`/`BLANK`/`WEAK`/`EDGE`/`FULL-VIEWPORT` thì sửa selector rồi chụp lại.",
    "- KHÔNG dùng `Read` để mở file ảnh (`.png`/`.jpg`/`.webp`). Một ảnh tốn ~2,5k token và nằm lại",
    "  trong context tới hết phiên; `shot-check.mjs` đã trả đủ dữ kiện. Cần nhìn tận mắt thì đưa",
    "  đường dẫn cho người dùng mở.",
    "- Đọc file dài theo ĐOẠN, không `cat` cả file: `SELECTORS_<SCREEN>.md` và `EVIDENCE_REFERENCE.md`",
    "  lấy bằng `sed -n '/^## <mục>/,/^## /p'` hoặc `grep -n -A12 '<từ khoá>'`.",
    "",
    "# GIỚI HẠN CỨNG",
    "- Chỉ 3 file được tạo/sửa bằng Write/Edit, đều nằm trong `ui-next/app/evidence/`:",
    "  `SELECTORS_<SCREEN>.md` (bản đồ selector của màn đang chụp), `SCREEN_EVIDENCE.md` (chính spec)",
    "  và `EVIDENCE_REFERENCE.md` (phần tra cứu tách khỏi spec — số đếm, ví dụ, snippet).",
    "  Mọi file khác trong repo — code, config, script — KHÔNG được sửa kể cả khi thấy sai; báo lại",
    "  người dùng. Cũng không dùng Bash (`>`, `tee`, `sed -i`) để ghi đè file nhằm lách giới hạn này.",
    "- Sửa `SCREEN_EVIDENCE.md`: DỮ LIỆU đã tự tay verify trong lượt (số đếm, selector, cạm bẫy mới,",
    "  mốc ngày verify) thì cứ cập nhật và nói rõ đã đổi mục nào. Còn RULE/ràng buộc (nới quyền, bỏ",
    "  guard, đổi quy ước đặt tên, đổi kích thước batch) thì PHẢI hỏi và được đồng ý trước mới sửa —",
    "  spec này được nhúng vào chính prompt của bạn, tự nới rule là tự bỏ chốt chặn của mình.",
    "- Chỉ ghi cột M (và cột N khi ghi lý do skip). KHÔNG sửa J/K/L, không chèn/xoá dòng, không đụng",
    "  ô công thức thống kê ở row 5–10.",
    "- KHÔNG ghi đè file evidence đã có trên Drive: `rclone lsf | grep <tên file>` trước mỗi upload,",
    "  trùng tên thì DỪNG và báo. Lệnh xoá/di chuyển/sync của rclone đã bị chặn.",
    "- DB 207 chỉ SELECT để dựng/kiểm pre-condition. Không INSERT/UPDATE/DELETE.",
    "- Thao tác trên app làm ĐỔI DỮ LIỆU env (submit báo cáo, approve, xoá...) mà TC không yêu cầu thì",
    "  KHÔNG bấm. TC có yêu cầu thì nêu rõ hệ quả (bản ghi nào, state đổi thế nào) TRƯỚC khi bấm.",
    "- Không sửa code repo, không git/gh (đã bị chặn), không deploy.",
    "- Phi tương tác: không hỏi lại rồi ngồi đợi giữa lượt — nêu giả định và đi tiếp; chỗ buộc người",
    "  dùng quyết thì làm xong phần còn lại rồi ghi rõ `(cần confirm: ...)` ở cuối.",
    "",
    WORDING_INSTR,
    "",
    "Áp chót mỗi lượt là MỘT dòng trạng thái, đúng định dạng (spec §6 bước 9):",
    `${STATE_MARK} tab=<tên tab> · đã ghi: <dải TC> · còn thiếu: <dải TC> · treo: <TC + lý do ngắn>`,
    "Dòng này được chèn lại làm bối cảnh khi console mở phiên mới, nên phải tự đủ nghĩa.",
    "",
    "Kết thúc MỖI lượt bằng khối gợi ý, định dạng CHÍNH XÁC: một dòng `<<<SUGGEST>>>` rồi 2–3 dòng,",
    "mỗi dòng `- <gợi ý ngắn bấm để làm tiếp>` (vd: chạy batch tiếp, chụp lại TC lỗi selector, đối",
    "chiếu Drive cho dải TC khác). Tiếng Việt, không viết gì sau khối này.",
  ].join("\n");
}

// Console này là việc LẶP theo checklist (dựng trạng thái → khoanh đỏ → chụp → upload → ghi ô), quy
// trình đã viết sẵn trong spec nên không cần budget suy nghĩ mặc định của account. Đo trên 2 phiên
// 2026-08-26: riêng phần model nghĩ giữa các tool đã là 12-21 phút / batch 20 TC; sáng 2026-08-27
// vẫn ~19s cho mỗi lời gọi tool. `--effort` cắt phần đó mà vẫn giữ `model` mặc định (opus): màn này
// phải dò selector và GHI vào sheet thật, hạ hẳn xuống sonnet thì chụp lại còn tốn hơn phần tiết
// kiệm được. Giống chatSpeedFlags() ở claude.js.
//
// Đổi mức bằng `EVIDENCE_EFFORT` trong ui-next/.env (cần restart `--fresh` để pm2 nạp lại):
//   medium (mặc định) — màn mới, còn phải dò selector, đọc pre-condition mơ hồ ở cột G.
//   low               — batch lặp trên màn đã có SELECTORS_<SCREEN>.md; nhanh hơn nhưng dễ ẩu ở
//                       khâu tự kiểm ảnh và quyết định skip, nên chỉ dùng khi đường đi đã chắc.
const EFFORT_LEVELS = new Set(["low", "medium", "high", "xhigh", "max"]);
function evidenceEffort() {
  const v = (process.env.EVIDENCE_EFFORT || "").trim().toLowerCase();
  return EFFORT_LEVELS.has(v) ? v : "medium";
}

// ─── Cắt context nền mỗi lượt ─────────────────────────────────────────────────────────────────
// Token của một batch ≈ số lượt gọi model × context, mà context được nạp LẠI mỗi lượt. Đo
// 2026-08-27 (`claude -p "ok" --output-format json`): nền của account này là 36,7k token/lượt
// (CLAUDE.md global + project, 28 subagent, danh sách skill, tên tool) và tụt còn 23,3k khi chạy
// `--setting-sources ''`. Console này không dùng subagent/skill/hook và đã `bypassPermissions` nên
// phần đó là chi phí thuần — phiên /evidence ngày 2026-08-26 chạy 129 lượt, tức ~1,7M token.
//
// KÈM ĐIỀU KIỆN: `--setting-sources ''` bỏ luôn MCP server khai trong `~/.claude.json` (verify
// 2026-08-27: agent trả `NO_MCP`) và cả `model` trong settings → phải tự nạp lại bằng
// `--strict-mcp-config --mcp-config` + `--model`. File mcp rút gọn sinh từ chính config của account
// đang chạy (không chép credential vào repo), đặt trong `.ai-agent/` (đã git-ignore), chmod 600.
// Không sinh được file → GIỮ NGUYÊN hành vi cũ (nạp settings, MCP đầy đủ): thà tốn token còn hơn
// chạy một batch ghi sheet mà thiếu MCP.
const EVIDENCE_MCP_SERVERS = ["mysql_207", "gsheets-rezil"];

// Config THẬT của account: mặc định là ~/.claude.json, account phụ là <CLAUDE_CONFIG_DIR>/.claude.json
// (xem accountEnv trong config.js — đúng quy tắc "account mặc định phải UNSET CLAUDE_CONFIG_DIR").
function accountConfigFile(key) {
  return ACCOUNTS[key]?.isDefault === true
    ? path.join(os.homedir(), ".claude.json")
    : path.join(accountHome(key), ".claude.json");
}

export function evidenceMcpConfigPath() {
  const keys = [currentAccountKey(), ...Object.keys(ACCOUNTS)];
  for (const key of keys) {
    let servers;
    try {
      const cfg = JSON.parse(fs.readFileSync(accountConfigFile(key), "utf8"));
      servers = cfg?.mcpServers || {};
    } catch { continue; }
    const picked = {};
    for (const name of EVIDENCE_MCP_SERVERS) if (servers[name]) picked[name] = servers[name];
    if (Object.keys(picked).length !== EVIDENCE_MCP_SERVERS.length) continue; // thiếu server → thử account khác
    try {
      const dir = path.join(ROOT, ".ai-agent");
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, "mcp-evidence.json");
      fs.writeFileSync(file, JSON.stringify({ mcpServers: picked }, null, 1), { mode: 0o600 });
      fs.chmodSync(file, 0o600); // file có sẵn từ lượt trước thì mode của writeFileSync không áp
      return file;
    } catch (e) {
      console.warn("[evidence] ghi mcp config rút gọn lỗi:", e.message);
      return null;
    }
  }
  console.warn("[evidence] không tìm thấy đủ MCP server", EVIDENCE_MCP_SERVERS.join(", "), "— giữ settings đầy đủ");
  return null;
}

// Bỏ settings là bỏ luôn `model` trong ~/.claude/settings.json (đang là opus[1m]) → truyền lại cho
// tường minh. Đổi bằng EVIDENCE_MODEL trong ui-next/.env (restart --fresh).
function evidenceModel() {
  return (process.env.EVIDENCE_MODEL || "opus[1m]").trim();
}

// ─── Cắt phiên theo batch ─────────────────────────────────────────────────────────────────────
// Context của một phiên /evidence chỉ có tăng: phiên 2026-08-26 đi từ 49k lượt đầu lên 152k lượt
// cuối, và MỖI lượt phải trả tiền cho toàn bộ phần đã tích. Một batch evidence lại tự dựng lại được
// bối cảnh của nó (đọc sheet → đối chiếu Drive theo §2), nên qua ngưỡng thì mở phiên mới rẻ hơn
// nhiều so với resume. Ngưỡng đổi bằng EVIDENCE_MAX_CTX trong ui-next/.env; 0 = không bao giờ cắt.
//
// Phần duy nhất không dựng lại được là "đang làm dở tới đâu" → prompt bắt agent kết thúc mỗi lượt
// bằng một dòng `<<<STATE>>>`, và lượt đầu của phiên mới được chèn lại đúng dòng đó.
export const STATE_MARK = "<<<STATE>>>";
const EVIDENCE_PROJECT = "rezil"; // console evidence chạy trên project rezil, cwd = ROOT (xem route)

function maxCtx() {
  const v = Number(process.env.EVIDENCE_MAX_CTX);
  return Number.isFinite(v) && v >= 0 ? v : 120000;
}

// Đọc đuôi file .jsonl (phiên dài tới vài MB — không đọc cả file).
function tailLines(file, bytes = 512 * 1024) {
  const fd = fs.openSync(file, "r");
  try {
    const size = fs.fstatSync(fd).size;
    const start = Math.max(0, size - bytes);
    const buf = Buffer.alloc(size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    return buf.toString("utf8").split("\n");
  } finally {
    fs.closeSync(fd);
  }
}

// Context lượt cuối + dòng STATE cuối của một phiên. Lỗi đọc → { ctx: 0 } (fail-open: cứ resume).
function sessionTail(id) {
  const newest = sessionCopies(EVIDENCE_PROJECT, id, "evidence")[0];
  if (!newest) return { ctx: 0, state: "" };
  let ctx = 0, state = "";
  try {
    for (const line of tailLines(newest.file)) {
      if (!line.startsWith("{")) continue;
      let d;
      try { d = JSON.parse(line); } catch { continue; }
      const u = d?.message?.usage;
      if (u && d.type === "assistant") {
        // MAX chứ không phải lượt cuối: đuôi file lẫn cả lượt của subagent (context riêng, nhỏ hơn
        // nhiều), lấy lượt cuối thì một phiên 152k có thể bị đọc thành 30k và không bao giờ cắt.
        const t = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
        if (t > ctx) ctx = t;
      }
      const content = d?.message?.content;
      if (Array.isArray(content)) {
        for (const b of content) {
          if (b?.type !== "text" || typeof b.text !== "string") continue;
          const hit = b.text.split("\n").filter((l) => l.includes(STATE_MARK)).pop();
          if (hit) state = hit.trim();
        }
      }
    }
  } catch (e) {
    console.warn("[evidence] đọc đuôi phiên lỗi:", e.message);
    return { ctx: 0, state: "" };
  }
  return { ctx, state };
}

// Quyết định resume phiên cũ hay mở phiên mới cho lượt này.
// Trả { session, notice, carry } — `carry` là dòng bối cảnh chèn vào đầu message của phiên mới.
export function planSession(sessionId) {
  const limit = maxCtx();
  if (!sessionId || !limit) return { session: sessionId, notice: "", carry: "" };
  const { ctx, state } = sessionTail(sessionId);
  if (!ctx || ctx < limit) return { session: sessionId, notice: "", carry: "" };
  const k = Math.round(ctx / 1000);
  return {
    session: null,
    notice: `Phiên trước đã tích ${k}k token context → lượt này mở phiên mới cho rẻ (batch tự đọc lại sheet + Drive).`,
    carry: state ? `Bối cảnh từ phiên trước (chỉ để tham chiếu, vẫn phải đọc lại sheet + Drive):\n${state}\n\n` : "",
  };
}

export function buildEvidenceArgv(message, sessionId, nowStamp, addDirs) {
  const mcp = evidenceMcpConfigPath();
  return [
    "-p", message,
    "--permission-mode", "bypassPermissions",
    "--effort", evidenceEffort(),
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--verbose",
    // Chỉ cắt settings khi đã có mcp config thay thế — xem chú thích ở EVIDENCE_MCP_SERVERS.
    ...(mcp ? ["--setting-sources", "", "--strict-mcp-config", "--mcp-config", mcp, "--model", evidenceModel()] : []),
    "--append-system-prompt", evidenceSystemPrompt(nowStamp),
    ...addDirs.flatMap((d) => ["--add-dir", d]),
    "--allowedTools", ...EVIDENCE_ALLOWED,
    "--disallowedTools", ...EVIDENCE_DISALLOWED,
    ...(sessionId ? ["--resume", sessionId] : []),
  ];
}

export const meta = {
  name: 'gen-testcase-batch',
  description: 'Sinh UT+IT test case cho nhiều màn Rezil từ Basic Design (fan-out mỗi màn song song)',
  phases: [
    { title: 'Template', detail: 'Trích template UT/IT 1 lần' },
    { title: 'Design', detail: 'Parse Basic Design mỗi màn → design.md' },
    { title: 'GenCase', detail: 'Sinh UT + IT cho mỗi màn' },
  ],
}

// args = { screens: ["EQUIP-003", "EQUIP-004 Edit Equipment", ...], folder?: "Web Admin"|"Mobile" }
const REPO = '/home/hello/IdeaProjects/rezil-support'
// args có thể tới dạng object hoặc string JSON -> chuẩn hóa
let A = args
if (typeof A === 'string') {
  try { A = JSON.parse(A) } catch (e) { A = {} }
}
A = A || {}
// screens: mảng string "EQUIP-003" hoặc object {name, ut, it} (số case mục tiêu mỗi loại; bỏ trống = tự quyết theo Basic Design)
const rawScreens = Array.isArray(A) ? A : (A.screens || [])
const screens = rawScreens.map((s) => (typeof s === 'string' ? { name: s } : s))
const designFolder = `REZIL - Basic Design ${A.folder || 'Web Admin'}`
log(`args nhận được: ${JSON.stringify(screens)}, folder=${designFolder}`)

if (!screens.length) {
  log('Không có màn nào trong args.screens — dừng.')
  return { error: 'no screens' }
}

const RB = `${REPO}/plugins/read-basic-design/scripts/parse-basic-design.py`
const RT = `${REPO}/plugins/read-testcase-template/scripts/parse-testcase-template.py`

const DESIGN_SCHEMA = {
  type: 'object',
  required: ['screen', 'designPath', 'ok'],
  properties: {
    screen: { type: 'string' },
    designPath: { type: 'string', description: 'đường dẫn report/design/<screen>.md đã ghi' },
    htmlFile: { type: 'string' },
    ok: { type: 'boolean' },
    note: { type: 'string' },
  },
}

const CASE_SCHEMA = {
  type: 'object',
  required: ['screen', 'kind', 'csvPath', 'count', 'ok'],
  properties: {
    screen: { type: 'string' },
    kind: { type: 'string', enum: ['UT', 'IT'] },
    csvPath: { type: 'string' },
    count: { type: 'number', description: 'số case sinh được' },
    ok: { type: 'boolean' },
    note: { type: 'string' },
  },
}

// --- Phase 1: template (1 lần) ---
phase('Template')
await agent(
  `Chạy 2 lệnh sau (bash) từ thư mục repo ${REPO} để sinh template test case:\n` +
    `  python3 "${RT}" "REZIL - Testcase/UT.html" --write\n` +
    `  python3 "${RT}" "REZIL - Testcase/IT.html" --write\n` +
    `Chúng ghi ra report/template/ut.md và report/template/it.md. Trả về xác nhận 2 file đã tồn tại.`,
  { label: 'template:ut+it', phase: 'Template' }
)

// --- Phase 2+3: mỗi màn pipeline design -> gen UT, IT ---
const results = await pipeline(
  screens,
  // stage 1: parse Basic Design màn này -> design.md
  (screen) =>
    agent(
      `Màn cần xử lý: "${screen.name}". Trong thư mục repo ${REPO}:\n` +
        `1. Tìm file Basic Design khớp trong "${designFolder}/" (vd "${screen.name}*.html"). Nếu nhiều bản (Create/Edit) và tên màn chưa nói rõ, chọn bản khớp nhất với "${screen.name}".\n` +
        `2. Chạy: python3 "${RB}" "<đường dẫn file .html tìm được>" --full --write\n` +
        `   → ghi report/design/<tên file không đuôi>.md\n` +
        `Trả về screen, htmlFile (tên file .html), designPath (đường dẫn .md đã ghi), ok.`,
      { label: `design:${screen.name}`, phase: 'Design', schema: DESIGN_SCHEMA }
    ),
  // stage 2: từ design.md + template -> sinh UT và IT (song song trong màn)
  (design, screen) => {
    if (!design || !design.ok) return null
    const tpl = `${REPO}/plugins/gen-testcase/skills/gen-testcase/template.md`
    const want = { UT: screen.ut, IT: screen.it }
    return parallel(
      ['UT', 'IT'].map((kind) => () => {
        const n = want[kind]
        const target = n
          ? `Số lượng case mục tiêu: khoảng ${n} case ${kind}. Cố gắng đạt sát con số này — nếu phủ hết spec mà chưa đủ thì mở rộng thêm boundary/decision/permission/UI; nếu thừa thì giữ các case giá trị nhất.`
          : `Số lượng case: KHÔNG ép con số — tự quyết theo Basic Design (đủ phủ mọi field, validation, luồng, popup, log, UI). Bao nhiêu đủ phủ thì sinh bấy nhiêu.`
        return agent(
          `Sinh bộ test case ${kind} cho màn "${design.screen}" theo skill gen-testcase của team Rezil.\n` +
            `Nguồn đọc:\n` +
            `- Spec màn: ${design.designPath}\n` +
            `- Template & cột ${kind}: ${REPO}/report/template/${kind.toLowerCase()}.md\n` +
            `- Kỹ thuật thiết kế case + mapping: ${tpl}\n` +
            `${target}\n` +
            `Yêu cầu: sinh case theo thứ tự section (S03 di chuyển → S04/S05 hiển thị+xử lý mỗi field → S12 nếu có search → Log), áp boundary/decision table/permission matrix, mỗi validation 1 case kèm MSG_ID. Để trống cột kết quả. Dùng ↑ kế thừa đúng convention.\n` +
            `Case UI/Style: nếu spec "1. Interface" có link Figma → sinh thêm case ở S04 về fontSize/fontWeight/color/spacing/alignment. Nếu có MCP Figma (tìm tool figma qua ToolSearch) thì lấy giá trị design thật của node và ghi cụ thể (vd fontSize=16px, fontWeight=700, color=#000); nếu chỉ có link thì sinh case checklist đối chiếu kèm link Figma trong Steps.\n` +
            `Ghi CSV ra ${REPO}/report/testcase/${design.screen}-${kind}.csv (escape đúng, tự tạo folder). Trả về screen, kind, csvPath, count (số case), ok.`,
          { label: `gen:${design.screen}:${kind}`, phase: 'GenCase', schema: CASE_SCHEMA }
        )
      })
    )
  }
)

const flat = results.flat().filter(Boolean)
const ok = flat.filter((r) => r.ok)
log(`Hoàn tất: ${ok.length}/${flat.length} file test case sinh được.`)
return {
  screens: screens.length,
  generated: ok.map((r) => ({ screen: r.screen, kind: r.kind, count: r.count, csvPath: r.csvPath })),
  failed: flat.filter((r) => !r.ok),
}

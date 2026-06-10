# -*- coding: utf-8 -*-
import csv, os

SCREEN = "EQUIP-003"
FIGMA = "https://www.figma.com/design/0nUR2v0mzjAhKLNU1UULQi/?node-id=11757-68625"
OUT = "/home/hello/IdeaProjects/rezil-support/report/testcase/EQUIP-003 Equipment List-IT.csv"

HEADER = ["TC No.", "Check Object 1", "Check Object 2", "Check content",
          "Pre-conditionTest Data", "Steps", "Expected Result",
          "Test IT Result", "Executed Date", "SQA", "Evidence",
          "Note(DefectID, Actual result)"]

rows = []  # each: [co1, co2, content, pre, steps, expected]

def add(co1, co2, content, pre, steps, expected):
    rows.append([co1, co2, content, pre, steps, expected])

UP = "↑"

# ============================================================
# SECTION S03 - Kiểm tra_Di chuyển màn hình
# ============================================================
add("Menu name + URL", "Menu access", "Kiểm tra menu access vào màn hình",
    "Đã login có quyền READ equipment-list",
    "1. Truy cập admin\n2. Confirm hiển thị menu access vào màn EQUIP-003",
    "1. Menu hiển thị ở sidebar bên trái là 設備一覧\n2. Icon hiển thị trước tab menu giống design mockup")
add(UP, "Click menu", UP, UP,
    "1. Click menu 設備一覧",
    "1. URL hiển thị là http://admin.<env>/admin/equipment\n2. Title màn hình hiển thị 設備一覧")
add(UP, "Title màn hình", UP, "Đã login",
    "1. Load màn hình /admin/equipment",
    "1. Title màn hình hiển thị đúng 設備一覧")
add("breadcumb", "Hiển thị", "Kiểm tra hiển thị breadcumb", "Đã login",
    "1. Quan sát breadcumb đầu màn hình",
    "1. Hiển thị breadcumb レジル電気保安システム > 設備")
add(UP, "Click レジル電気保安システム", "Kiểm tra click breadcumb di chuyển màn", "Đã login",
    "1. Click vào レジル電気保安システム ở breadcumb",
    "1. Chuyển sang màn AUTH-002 / HOME-001")
add("equipment_code (設備ID)", "Click textlink", "Kiểm tra click 設備ID di chuyển detail (xử lý 5.5)",
    "Có ít nhất 1 record trong list",
    "1. Click vào giá trị 設備ID của 1 record",
    "1. Chuyển sang màn EQUIP-004 Equipment Detail\n2. id của equipment được truyền lên path variable")
add("equipment_master_name (設備マスタ名称)", "Click textlink", "Kiểm tra click 設備マスタ名称 di chuyển master detail (xử lý 5.6)",
    UP,
    "1. Click vào giá trị 設備マスタ名称 của 1 record",
    "1. Chuyển sang màn EQUIP-002 Equipment Master Detail\n2. id của equipment_master được truyền lên path variable")
add("create_new_equipment_btn (設備登録作成)", "Click", "Kiểm tra click button tạo mới (xử lý 5.2)",
    "Đã login",
    "1. Click button 設備登録作成",
    "1. Mở sang màn EQUIP-004 Equipment Detail ở mode create")
add(UP, "Back từ create", "Kiểm tra quay lại list từ màn create", "Đã mở màn EQUIP-004 create từ list",
    "1. Tại màn EQUIP-004 create, thực hiện back",
    "1. Quay lại màn EQUIP-003 Equipment List")
add("paging", "Di chuyển trang", "Kiểm tra phân trang COMMON-001", "Có nhiều hơn 1 trang data",
    "1. Click sang trang 2 ở paging",
    "1. Hiển thị data trang 2 (tham khảo COMMON-001 Pagination)")
add(UP, "Back giữ điều kiện", "Kiểm tra giữ điều kiện search khi back lại list", "Đã search và di chuyển sang detail",
    "1. Từ detail back lại list",
    "1. Quay lại list giữ nguyên điều kiện search và trang đang xem")

# ============================================================
# SECTION S04 - Hiển thị khởi tạo + Permission + UI/Style + item type / default
# ============================================================
# --- Permission matrix (5.1) ---
add("First load", "Permission - READ", "Kiểm tra user có quyền 1-IS_READ principal equipment-list",
    "User có quyền 1-IS_READ principal equipment-list",
    "1. Truy cập /admin/equipment",
    "1. Hiển thị màn danh sách equipment thành công")
add(UP, "Permission - engineer phụ trách", "Kiểm tra user không có quyền READ nhưng là engineer primary còn hiệu lực của site (MVP-2-2 NONAME-001)",
    "User không có quyền READ nhưng là engineer primary còn hiệu lực của site",
    "1. Truy cập /admin/equipment",
    "1. Hiển thị danh sách equipment thuộc site mà engineer phụ trách")
add(UP, "Permission - engineer qua plan", "Kiểm tra user là engineer assign plan của site (state IN 1,10,11)",
    "User là engineer assign plan của site với state IN (1,10,11)",
    "1. Truy cập /admin/equipment",
    "1. Hiển thị danh sách equipment thuộc site mà engineer được assign qua plan")
add(UP, "Permission - engineer hết hiệu lực", "Kiểm tra engineer có end_date đã qua không được xem",
    "User là engineer của site nhưng seh.end_date đã qua",
    "1. Truy cập /admin/equipment",
    "1. Không hiển thị data của site đó (điều kiện CURDATE <= end_date không thỏa)")
add(UP, "Permission - no right", "Kiểm tra user không có bất kỳ quyền thỏa mãn",
    "User không có quyền READ và không phải engineer phụ trách/plan",
    "1. Truy cập /admin/equipment",
    "1. Redirect về màn dashboard AUTH-002 / HOME-001")
add(UP, "Permission - chưa login", "Kiểm tra truy cập trực tiếp khi chưa login",
    "Chưa login",
    "1. Truy cập trực tiếp URL /admin/equipment",
    "1. Redirect về màn login (E-MSG-005)")
add(UP, "Permission - quyền bị xóa", "Kiểm tra user có engineer deleted_at != null",
    "Engineer record có deleted_at != null",
    "1. Truy cập /admin/equipment",
    "1. Không lấy data theo nhánh engineer (eng.deleted_at IS NULL không thỏa)")

# --- First load: data states ---
add("First load", "API", "Kiểm tra API được gọi khi first load", "Đã login",
    "1. Load màn hình\n2. Kiểm tra network",
    "1. Gọi POST /equipment và POST /equipment/total")
add(UP, "Loading", "Kiểm tra animation loading khi load data", "Đã login",
    "1. Quan sát khu vực table list trong lúc load data",
    "1. Hiển thị animation loading ở khu vực table list")
add(UP, "Có data", "Kiểm tra hiển thị data table khi có data", "Có data equipment trong hệ thống",
    "1. Load màn hình",
    "1. Hiển thị danh sách equipment cho phép xác nhận thông tin cơ bản và trạng thái từng equipment")
add(UP, "Không có data", "Kiểm tra hiển thị khi không có data thỏa điều kiện", "Không có equipment thỏa điều kiện",
    "1. Load màn hình",
    "1. Hiển thị message E-MSG-007 ở khu vực bảng kết quả search")
add(UP, "Lấy data lỗi", "Kiểm tra khi gọi API lấy data thất bại", "API trả về lỗi",
    "1. Load màn hình khi API lỗi",
    "1. Hiển thị message lỗi E-MSG-000")
add(UP, "Điều kiện ※1 status", "Kiểm tra default chỉ hiển thị equipment status=1 (Active)", "Có equipment status=1 và status!=1",
    "1. Load màn hình mặc định",
    "1. Chỉ hiển thị equipment có status=1 (Active)")
add(UP, "Điều kiện ※2 manufacture_date", "Kiểm tra default ẩn equipment thiếu 製造年月", "Có equipment manufacture_date null và not null",
    "1. Load màn hình mặc định",
    "1. Chỉ hiển thị equipment có manufacture_date IS NOT NULL")
add(UP, "Điều kiện deleted_at", "Kiểm tra không hiển thị equipment đã xóa mềm", "Có equipment deleted_at != null",
    "1. Load màn hình",
    "1. Không hiển thị equipment có deleted_at != null")
add(UP, "Sắp xếp mặc định", "Kiểm tra default sort ORDER BY updated_at DESC", "Có nhiều equipment với updated_at khác nhau",
    "1. Load màn hình",
    "1. Data sắp xếp theo updated_at giảm dần")

# --- UI/Style theo Figma (checklist, vì không có MCP Figma) ---
style_targets = [
    ("Layout tổng thể", "vị trí title, search form, table, paging, button"),
    ("title (設備一覧)", "font-family / font-size / font-weight / color / alignment"),
    ("breadcumb", "font / size / weight / color / spacing, textlink có màu link"),
    ("favorite_search_setting (お気に入り)", "icon star + text, font, color, spacing"),
    ("seach_detail (詳細検索)", "icon arrow + text, font, màu, trạng thái mở/đóng accordion"),
    ("search_btn (検索する)", "kích thước, màu background, icon Search, font, trạng thái normal/hover/disabled"),
    ("reset_search_condition (検索条件をリセット)", "kích thước, màu, font, trạng thái normal/hover"),
    ("save_search_condition (検索条件を保存)", "kích thước, màu, font, trạng thái normal/hover"),
    ("create_new_equipment_btn (設備登録作成)", "kích thước, màu background, font, trạng thái normal/hover"),
    ("action menu", "icon, font, spacing menu item 表示設定 / CSVダウンロード"),
    ("Table header", "font / weight / color / alignment / background các cột header"),
    ("Table row", "font / color / spacing / line-height, textlink có màu link"),
    ("Multi-select combobox", "kích thước, border, placeholder, icon, font các trường search"),
    ("calendar (date picker)", "kích thước, placeholder 年/月/日, icon lịch, font"),
    ("checkbox filter", "kích thước checkbox, font label, spacing"),
    ("paging", "font, kích thước, màu, spacing nút paging"),
]
for tgt, attrs in style_targets:
    add(tgt, "Style", "Kiểm tra style %s khớp Figma" % tgt, "Đã login",
        "1. Đối chiếu %s của %s với Figma: %s" % (attrs, tgt, FIGMA),
        "1. Style của %s khớp Figma (font/size/weight/color/spacing/alignment đúng)" % tgt)

# --- Item type / Default / hiển thị từng field trong Screen Items ---
# helper for combobox fields
def combobox_field(label, fieldname, default_text, source, partial_target, fmt):
    add(label, "Item type", "Kiểm tra hiển thị item type multi-select combobox của %s" % fieldname,
        "Đã mở form 詳細検索",
        "1. Quan sát trường %s" % label,
        "1. Hiển thị multi-select combobox %s" % label)
    add(UP, "Default value", "Kiểm tra giá trị mặc định của %s" % fieldname, "Đã mở form 詳細検索",
        "1. Quan sát giá trị mặc định trường %s" % label,
        "1. Default: %s" % default_text)
    add(UP, "Cho phép chọn nhiều", "Kiểm tra %s cho phép chọn nhiều" % fieldname, "Đã mở form 詳細検索",
        "1. Chọn nhiều giá trị trong %s" % label,
        "1. Cho phép chọn nhiều giá trị")
    add(UP, "Inline search", "Kiểm tra inline search partial match của %s" % fieldname, "Đã mở form 詳細検索",
        "1. Type keyword vào %s" % label,
        "1. Thực hiện search inline %s (partial match)" % partial_target)
    add(UP, "Format hiển thị item", "Kiểm tra format item dropdown của %s" % fieldname, "Đã mở form 詳細検索",
        "1. Type keyword, quan sát item trong dropdown %s" % label,
        "1. Format hiển thị item: %s" % fmt)
    add(UP, "Order by", "Kiểm tra thứ tự sắp xếp dropdown của %s" % fieldname, "Đã mở form 詳細検索",
        "1. Quan sát thứ tự item trong dropdown %s\n2. Đối chiếu %s" % (label, source),
        "1. Item sắp xếp theo %s" % source)
    add(UP, "Type không match", "Kiểm tra %s khi type keyword không có kết quả" % fieldname, "Đã mở form 詳細検索",
        "1. Type keyword không tồn tại vào %s" % label,
        "1. Dropdown không hiển thị item nào")
    add(UP, "Clear selection", "Kiểm tra bỏ chọn giá trị đã chọn của %s" % fieldname, "Đã chọn giá trị ở %s" % label,
        "1. Bỏ chọn / xóa giá trị đã chọn ở %s" % label,
        "1. Giá trị được xóa khỏi điều kiện")

# 詳細検索 button accordion
add("seach_detail (詳細検索)", "Item type", "Kiểm tra hiển thị button 詳細検索", "Đã login",
    "1. Quan sát button 詳細検索",
    "1. Hiển thị button gồm icon arrow + text 詳細検索")
add(UP, "Click mở accordion", "Kiểm tra click 詳細検索 mở accordion mục 11-14", "Đã login",
    "1. Click button 詳細検索",
    "1. Hiển thị nội dung accordion Advanced Search Setting (các mục từ 11 đến 14)")
add(UP, "Click đóng accordion", "Kiểm tra click lại 詳細検索 đóng accordion", "Accordion đang mở",
    "1. Click lại button 詳細検索",
    "1. Đóng accordion Advanced Search Setting")

add("favorite_search_setting (お気に入り)", "Item type", "Kiểm tra hiển thị dropdown お気に入り", "Đã login",
    "1. Quan sát mục お気に入り",
    "1. Hiển thị dropdown gồm icon star + text お気に入り")
add(UP, "Click", "Kiểm tra click お気に入り (COMMON-006)", "Đã login",
    "1. Click お気に入り",
    "1. Hiển thị danh sách favorite search settings (tham khảo COMMON-006)")
add(UP, "Áp dụng favorite", "Kiểm tra chọn favorite áp dụng điều kiện", "Đã có favorite search setting đã lưu",
    "1. Chọn 1 favorite trong dropdown お気に入り",
    "1. Áp dụng điều kiện search đã lưu vào form")

combobox_field("保安設備ID", "equipment_code_condition", "rỗng",
    "ORDER BY e.id ASC", "equipment.code", "<equipment.code>")
combobox_field("担当技術者", "engineer_condition", "rỗng",
    "ORDER BY e.id ASC", "engineer_profile.name hoặc engineer.code", "<engineer.ep.name (engineer.code)>")
combobox_field("事業場名", "site_condition", "rỗng",
    "ORDER BY id ASC", "site.name", "<site.name>")
combobox_field("顧客名", "client_condition", "rỗng",
    "ORDER BY id ASC", "client.name hoặc client.code", "<client.name> (<client.code>)")
# area - COMMON-008
add("エリア", "Item type", "Kiểm tra item type エリア (COMMON-008 Shikugun Select)", "Đã mở form 詳細検索",
    "1. Quan sát trường エリア",
    "1. Hiển thị multi-select combobox エリア (tham khảo COMMON-008 Shikugun Select)")
add(UP, "Default value", "Kiểm tra default エリア", "Đã mở form 詳細検索",
    "1. Quan sát giá trị mặc định エリア",
    "1. Default: chưa chọn")
add(UP, "Chọn area", "Kiểm tra chọn giá trị エリア", "Đã mở form 詳細検索",
    "1. Chọn 1 giá trị エリア",
    "1. Giá trị được set vào điều kiện area_condition")

combobox_field("機器名称", "safety_equipment_name_condition", "chưa chọn",
    "ORDER BY id ASC", "safety_equipment.name", "<safety_equipment_name>")
combobox_field("製造者", "manufacturer_condition", "chưa chọn",
    "ORDER BY id ASC", "manufacturer.name", "<manufacturer.name>")
combobox_field("設備タイプ", "equipment_master_type_condition", "chưa chọn",
    "ORDER BY display_order ASC", "equipment_master_type.name", "<equipment_master_type.name>")
# special rule equipment_master_type id=17
add("設備タイプ", "Option 低圧回路 ẩn", "Kiểm tra option id=17 低圧回路 chỉ hiện khi 低圧回路表示 được check",
    "Filter 低圧回路表示 chưa check",
    "1. Mở dropdown 設備タイプ khi 低圧回路表示 chưa check",
    "1. Option equipment_master_type.id=17 [低圧回路] KHÔNG hiển thị")
add(UP, "Option 低圧回路 hiện", "Kiểm tra option id=17 低圧回路 hiện khi 低圧回路表示 được check",
    "Filter 低圧回路表示 đã check",
    "1. Check 低圧回路表示\n2. Mở dropdown 設備タイプ",
    "1. Option equipment_master_type.id=17 [低圧回路] hiển thị")
add(UP, "Chỉ is_active", "Kiểm tra dropdown 設備タイプ chỉ hiển thị is_active=1", "Có equipment_master_type is_active=0 và 1",
    "1. Mở dropdown 設備タイプ",
    "1. Chỉ hiển thị các type có is_active=1")

combobox_field("型式", "model_number_condition", "chưa chọn",
    "ORDER BY id ASC", "equipment_master.model_number", "<equipment_master.model_number>")

# --- Date fields: from/to manufacture_date, from/to recommended_replacement_years ---
def date_field_basic(label, fieldname):
    add(label, "Item type", "Kiểm tra item type calendar của %s" % fieldname, "Đã mở form 詳細検索",
        "1. Quan sát trường %s" % label,
        "1. Hiển thị input calendar (date picker)")
    add(UP, "Default value", "Kiểm tra default của %s" % fieldname, "Đã mở form 詳細検索",
        "1. Quan sát giá trị mặc định %s" % label,
        "1. Default: chưa chọn, placeholder 年 / 月 / 日")
    add(UP, "Chọn trên lịch", "Kiểm tra chọn ngày trên calendar của %s" % fieldname, "Đã mở form 詳細検索",
        "1. Click icon lịch %s và chọn 1 ngày" % label,
        "1. Ngày được set, hiển thị format yyyy/mm/dd")
    add(UP, "Nhập tay hợp lệ", "Kiểm tra nhập tay ngày hợp lệ %s" % fieldname, "Đã mở form 詳細検索",
        "1. Nhập 2026/06/01 vào %s" % label,
        "1. Nhận giá trị, hiển thị format yyyy/mm/dd")
    add(UP, "Nhập sai format", "Kiểm tra nhập sai format %s" % fieldname, "Đã mở form 詳細検索",
        "1. Nhập giá trị sai format (vd 2026-13-40) vào %s" % label,
        "1. Hiển thị error: 入力形式が正しくありません")

date_field_basic("製造年期間指定(from)", "from_manufacture_date")
date_field_basic("製造年期間指定(to)", "to_manufacture_date")
# to_manufacture_date disable rule + range validation
add("製造年期間指定(to)", "Disable khi from rỗng", "Kiểm tra disable to khi chưa nhập from_manufacture_date",
    "from_manufacture_date chưa nhập",
    "1. Quan sát trường 製造年期間指定(to)",
    "1. Trường 製造年期間指定(to) bị disable")
add(UP, "Enable khi nhập from", "Kiểm tra enable to khi đã nhập from_manufacture_date",
    "Đã nhập from_manufacture_date",
    "1. Nhập from_manufacture_date\n2. Quan sát to_manufacture_date",
    "1. Trường 製造年期間指定(to) được enable")
add(UP, "Validation from > to", "Kiểm tra validation from > to (E-EQUIP-003-001)",
    "Đã mở form 詳細検索",
    "1. Nhập from_manufacture_date = 2026/06/10\n2. Nhập to_manufacture_date = 2026/06/01",
    "1. Hiển thị error E-EQUIP-003-001: 製造年期間指定(from)が(to)より未来日です。正しい範囲を指定してください")
add(UP, "Validation from = to", "Kiểm tra from = to là hợp lệ (boundary)",
    "Đã mở form 詳細検索",
    "1. Nhập from = to = 2026/06/01",
    "1. Không hiển thị error (from = to hợp lệ)")
add(UP, "Validation from < to", "Kiểm tra from < to là hợp lệ",
    "Đã mở form 詳細検索",
    "1. Nhập from = 2026/06/01, to = 2026/06/02",
    "1. Không hiển thị error")

date_field_basic("更新予定年月（from）", "from_recommended_replacement_years")
date_field_basic("更新予定年月（to）", "to_recommended_replacement_years")
add("更新予定年月（to）", "Disable khi from rỗng", "Kiểm tra disable to khi chưa nhập from_recommended_replacement_years",
    "from_recommended_replacement_years chưa nhập",
    "1. Quan sát trường 更新予定年月（to）",
    "1. Trường 更新予定年月（to）bị disable")
add(UP, "Enable khi nhập from", "Kiểm tra enable to khi đã nhập from_recommended_replacement_years",
    "Đã nhập from_recommended_replacement_years",
    "1. Nhập from_recommended_replacement_years\n2. Quan sát to",
    "1. Trường 更新予定年月（to）được enable")
add(UP, "Validation from > to", "Kiểm tra validation from > to (E-EQUIP-003-002)",
    "Đã mở form 詳細検索",
    "1. Nhập from = 2030/06, to = 2025/06",
    "1. Hiển thị error E-EQUIP-003-002: 更新推奨年超過時期（from）が(to)より未来日です。正しい範囲を指定してください")
add(UP, "Validation from = to", "Kiểm tra from = to hợp lệ", "Đã mở form 詳細検索",
    "1. Nhập from = to",
    "1. Không hiển thị error")
add(UP, "Validation from < to", "Kiểm tra from < to hợp lệ", "Đã mở form 詳細検索",
    "1. Nhập from < to",
    "1. Không hiển thị error")

# --- Checkbox filters ---
for label, fieldname, desc in [
    ("対象外設備表示", "non_applicable_equipment", "Filter những sản phẩm không active (bỏ điều kiện ※1)"),
    ("製造年空白", "non_manufacture_date", "Filter sản phẩm để trống ngày sản xuất (bỏ điều kiện ※2)"),
    ("低圧回路表示", "low_voltage_circuit", "Filter sản phẩm điện thế thấp (equipment_master_type.id = 17)"),
]:
    add(label, "Item type", "Kiểm tra item type checkbox %s" % fieldname, "Đã mở form 詳細検索",
        "1. Quan sát %s" % label,
        "1. Hiển thị checkbox %s" % label)
    add(UP, "Default value", "Kiểm tra default %s" % fieldname, "Đã mở form 詳細検索",
        "1. Quan sát giá trị mặc định %s" % label,
        "1. Default: không check")
    add(UP, "Check / uncheck", "Kiểm tra toggle %s" % fieldname, "Đã mở form 詳細検索",
        "1. Click check rồi uncheck %s" % label,
        "1. Toggle trạng thái check/uncheck thành công. %s" % desc)

# --- Buttons ---
add("search_btn (検索する)", "Item type", "Kiểm tra hiển thị button 検索する", "Đã login",
    "1. Quan sát button 検索する",
    "1. Hiển thị button gồm icon Search và text 検索")
add(UP, "Click search có kết quả", "Kiểm tra click search ẩn form detail (xử lý 5.1)", "Đã nhập điều kiện search",
    "1. Click button 検索する",
    "1. Áp dụng điều kiện search lấy data\n2. Ẩn phần detail search form")
add(UP, "Disable khi 0 kết quả", "Kiểm tra disable nút search khi không có kết quả", "Search ra 0 kết quả",
    "1. Search với điều kiện không có kết quả",
    "1. Disable nút search 検索する")
add(UP, "Enable lại khi sửa điều kiện", "Kiểm tra enable lại nút search khi sửa điều kiện", "Nút search đang disable do 0 kết quả",
    "1. Sửa 1 điều kiện trong form",
    "1. Enable lại nút search 検索する")
add("reset_search_condition (検索条件をリセット)", "Click", "Kiểm tra reset điều kiện về default", "Đã nhập nhiều điều kiện search",
    "1. Click button 検索条件をリセット",
    "1. Tất cả option search reset về default")
add("save_search_condition (検索条件を保存)", "Click", "Kiểm tra mở popup lưu favorite (COMMON-006)", "Đã login",
    "1. Click button 検索条件を保存",
    "1. Hiển thị popup nhập tên search_setting và lưu favorite_search_setting (tham khảo COMMON-006)")
add(UP, "Lưu thành công", "Kiểm tra lưu favorite thành công", "Đã mở popup lưu, nhập tên hợp lệ",
    "1. Nhập tên\n2. Xác nhận lưu",
    "1. Lưu thành công, favorite mới hiển thị trong dropdown お気に入り")
add("action menu", "Item type", "Kiểm tra hiển thị menu action", "Đã login",
    "1. Click action menu",
    "1. Hiển thị menu item: 表示設定 (Display Setting) và CSVダウンロード (Export CSV)")
add("display_setting (表示設定)", "Click", "Kiểm tra click display setting (COMMON-009 View Config)", "Đã login",
    "1. Click 表示設定",
    "1. Mở View Config screen_name=engineer-list (tham khảo COMMON-009)")
add("export_csv (CSVダウンロード)", "Click", "Kiểm tra click export CSV (xử lý 5.3)", "Có data trong list",
    "1. Click CSVダウンロード",
    "1. Thực hiện export CSV (tham khảo COMMON-003.4), gọi POST /equipment/export")

# --- Checkbox chọn record ---
add("checkbox (chọn record)", "Item type", "Kiểm tra hiển thị checkbox chọn record", "Có data trong list",
    "1. Quan sát cột checkbox đầu mỗi row",
    "1. Hiển thị checkbox cho phép chọn record để action")
add(UP, "Chọn 1 record", "Kiểm tra chọn 1 record", "Có data trong list",
    "1. Check checkbox 1 record",
    "1. Record được chọn (highlight / state checked)")
add(UP, "Chọn tất cả", "Kiểm tra checkbox header chọn tất cả", "Có data trong list",
    "1. Check checkbox ở header",
    "1. Chọn tất cả record trong trang hiện tại")
add(UP, "Bỏ chọn tất cả", "Kiểm tra bỏ chọn tất cả", "Đã chọn tất cả record",
    "1. Uncheck checkbox header",
    "1. Bỏ chọn tất cả record")

# --- Display column fields (default visible columns) - item display ---
display_cols = [
    ("equipment_code (設備ID)", "textlink", "equipment.code"),
    ("site_name (事業場名)", "text", "site.name"),
    ("equipment_master_name (設備マスタ名称)", "textlink", "equipment_master.name"),
    ("engineer_name (担当技術者)", "text", "engineer_profile.name (primary, còn hiệu lực)"),
    ("site_location (使用場所)", "text", "site_location.name"),
    ("usage_purpose (用途)", "text", "equipment.usage_purpose - hiển thị 20 ký tự đầu rồi ..."),
    ("manufacture_date (製造年月)", "text", "equipment.manufacture_date format yyyy/mm/dd, null hiển thị -"),
    ("recommended_replacement_years (更新推奨年数)", "text", "equipment_master.recommended_replacement_years + 年"),
    ("number_years_passed (経過年数)", "text", "now - manufacture_date, format +年 làm tròn xuống, null hiển thị -"),
]
for label, dtype, val in display_cols:
    add(label, "Hiển thị giá trị", "Kiểm tra hiển thị giá trị cột %s" % label, "Có data trong list",
        "1. Quan sát giá trị cột %s của 1 record" % label,
        "1. Hiển thị đúng giá trị: %s" % val)
    add(UP, "Allow sort", "Kiểm tra sort cột %s" % label, "Có nhiều record trong list",
        "1. Click header cột %s" % label,
        "1. Cho phép sort cột (asc/desc)")

# special display rules
add("usage_purpose (用途)", "Truncate > 20 ký tự", "Kiểm tra truncate khi usage_purpose dài hơn 20 ký tự",
    "Có record usage_purpose dài hơn 20 ký tự",
    "1. Quan sát cột 用途 record đó",
    "1. Hiển thị 20 ký tự đầu tiên, sau đó hiển thị ...")
add(UP, "Đúng 20 ký tự", "Kiểm tra usage_purpose đúng 20 ký tự (boundary)",
    "Có record usage_purpose = 20 ký tự",
    "1. Quan sát cột 用途",
    "1. Hiển thị đầy đủ 20 ký tự, không có ...")
add(UP, "19 ký tự", "Kiểm tra usage_purpose 19 ký tự (boundary n-1)",
    "Có record usage_purpose = 19 ký tự",
    "1. Quan sát cột 用途",
    "1. Hiển thị đầy đủ 19 ký tự, không có ...")
add("manufacture_date (製造年月)", "Null hiển thị -", "Kiểm tra manufacture_date null hiển thị -",
    "Có record manufacture_date null (khi check 製造年空白)",
    "1. Check 製造年空白 và search\n2. Quan sát cột 製造年月",
    "1. Hiển thị - khi manufacture_date null")
add("number_years_passed (経過年数)", "Làm tròn xuống", "Kiểm tra number_years_passed làm tròn xuống",
    "Có record số năm trôi qua = 2.7 năm",
    "1. Quan sát cột 経過年数",
    "1. Hiển thị 2年 (làm tròn xuống từ 2.7)")
add(UP, "Null hiển thị -", "Kiểm tra number_years_passed null hiển thị -",
    "Có record manufacture_date null",
    "1. Quan sát cột 経過年数",
    "1. Hiển thị - khi number_years_passed null")

# default-hidden columns (View Config)
hidden_cols = [
    ("site_code (事業場ID)", "site.code", True),
    ("equipment_master_code (設備マスタID)", "equipment_master.code", True),
    ("manufacture_name (製造者)", "manufacturer.name", True),
    ("safety_equipment_name (機器名)", "safety_equipment.name", True),
    ("model_number (型式)", "equipment_master.model_number", True),
    ("serial_number (製造番号)", "equipment.serial_number", False),
    ("management_unit (管理単位)", "equipment.management_unit", False),
    ("equipment_master_type_name (設備タイプ)", "equipment_master_type.name", True),
    ("planned_update_date (更新予定年月)", "manufacture_date + recommended_replacement_years, format yyyy年mm月", True),
    ("remarks (備考)", "equipment.remarks", False),
]
for label, val, sortable in hidden_cols:
    add(label, "Default ẩn", "Kiểm tra cột %s default ẩn" % label, "Đã login, chưa customize view config",
        "1. Quan sát các cột mặc định của bảng",
        "1. Cột %s mặc định ẩn (không hiển thị)" % label)
    add(UP, "Hiển thị khi bật View Config", "Kiểm tra bật cột %s qua 表示設定" % label, "Đã mở View Config (COMMON-009)",
        "1. Bật hiển thị cột %s trong View Config" % label,
        "1. Cột %s hiển thị giá trị: %s" % (label, val))
    if sortable:
        add(UP, "Allow sort", "Kiểm tra sort cột %s" % label, "Cột %s đang hiển thị, có nhiều record" % label,
            "1. Click header cột %s" % label,
            "1. Cho phép sort cột (asc/desc)")
    else:
        add(UP, "Không cho sort", "Kiểm tra cột %s không cho sort" % label, "Cột %s đang hiển thị" % label,
            "1. Click header cột %s" % label,
            "1. Không cho sort cột (Allow Sort = No)")

# View config rules
add("View Config", "Fixed column", "Kiểm tra cột equipment_code luôn visible (fixed_column)", "Đã mở View Config",
    "1. Thử ẩn cột 設備ID trong View Config",
    "1. Cột equipment_code luôn visible, không thể ẩn")
add(UP, "Default view config", "Kiểm tra thứ tự cột default", "Đã login chưa customize",
    "1. Quan sát thứ tự cột mặc định",
    "1. Thứ tự: equipment_code, site_name, equipment_master_name, engineer_name, site_location, usage_purpose, manufacture_date, recommended_replacement_years, number_years_passed")

# ============================================================
# SECTION S05 - Hiển thị / Xử lý sau thao tác
# ============================================================
add("export_csv (CSVダウンロード)", "Export thành công", "Kiểm tra export CSV thành công", "Có data trong list",
    "1. Click CSVダウンロード\n2. Xác nhận trong popup (COMMON-003.4)",
    "1. Tải file CSV chứa data theo điều kiện search hiện tại")
add(UP, "Export theo filter", "Kiểm tra export CSV áp dụng điều kiện search", "Đã search với điều kiện",
    "1. Search với điều kiện\n2. Export CSV",
    "1. File CSV chỉ chứa data thỏa điều kiện search")
add(UP, "Export thất bại", "Kiểm tra export CSV khi API lỗi", "API /equipment/export lỗi",
    "1. Click CSVダウンロード khi API lỗi",
    "1. Hiển thị message lỗi E-MSG-000")
add(UP, "API export", "Kiểm tra API export được gọi", "Có data trong list",
    "1. Click CSVダウンロード\n2. Kiểm tra network",
    "1. Gọi POST /equipment/export")

# ============================================================
# SECTION S12 - Hiển Thị / Xử lý sau Search
# ============================================================
add("Layout sau search", "Layout", "Kiểm tra layout sau khi search thành công", "Đã thực hiện search thành công",
    "1. Kiểm tra layout tổng thể sau search",
    "1. Layout không vỡ, giống trạng thái hiển thị ban đầu")
add(UP, "Ẩn form detail", "Kiểm tra ẩn form detail sau khi search", "Đã mở form 詳細検索 và nhập điều kiện",
    "1. Click 検索する",
    "1. Ẩn phần detail search form, hiển thị kết quả")

# Search 1 điều kiện cho từng field
search_conditions = [
    ("保安設備ID", "equipment_code_condition", "AND equipment.id IN equipment_code_condition"),
    ("担当技術者", "engineer_condition", "AND site_engineer.eid IN engineer_condition"),
    ("顧客名", "client_condition", "AND s.client_id IN client_condition"),
    ("事業場名", "site_condition", "AND site.id IN site_condition"),
    ("エリア", "area_condition", "AND site.inspection_area_id = area_condition"),
    ("機器名称", "safety_equipment_name_condition", "AND se.id IN safety_equipment_name_condition"),
    ("製造者", "manufacturer_condition", "AND manufacturer.id IN manufacturer_condition"),
    ("設備タイプ", "equipment_master_type_condition", "AND em.equipment_master_type_id IN equipment_master_type_condition"),
    ("型式", "model_number_condition", "AND equipment_master.id IN model_number_condition"),
]
for label, cond, sql in search_conditions:
    add("Search 1 điều kiện", "Search theo %s" % label, "Kiểm tra search theo điều kiện %s" % cond,
        "Có data thỏa điều kiện",
        "1. Chọn giá trị bất kỳ trường %s\n2. Click 検索する" % label,
        "1. Hiển thị kết quả search kết hợp first load với điều kiện: %s" % sql)
    add(UP, "Search multi %s" % label, "Kiểm tra search nhiều giá trị %s" % cond,
        "Có data thỏa nhiều giá trị",
        "1. Chọn nhiều giá trị trường %s\n2. Click 検索する" % label,
        "1. Kết quả thỏa điều kiện IN nhiều giá trị (%s)" % sql)

# date range search
add("Search 1 điều kiện", "Search from_manufacture_date", "Kiểm tra search theo from_manufacture_date",
    "Có data thỏa điều kiện",
    "1. Nhập 製造年期間指定(from)\n2. Click 検索する",
    "1. Kết quả: AND from_manufacture_date <= equipment.manufacture_date")
add(UP, "Search to_manufacture_date", "Kiểm tra search theo to_manufacture_date",
    "Có data thỏa điều kiện",
    "1. Nhập from và to\n2. Click 検索する",
    "1. Kết quả: AND to_manufacture_date >= equipment.manufacture_date")
add(UP, "Search range manufacture_date", "Kiểm tra search khoảng from-to manufacture_date",
    "Có data trong khoảng",
    "1. Nhập from và to\n2. Click 検索する",
    "1. Kết quả nằm trong khoảng from <= manufacture_date <= to")
add(UP, "Search from_recommended_replacement_years", "Kiểm tra search theo from planned_update_date",
    "Có data thỏa điều kiện",
    "1. Nhập 更新予定年月（from）\n2. Click 検索する",
    "1. Kết quả: AND planned_update_date >= from (planned_update_date = manufacture_date + recommended_replacement_years)")
add(UP, "Search to_recommended_replacement_years", "Kiểm tra search theo to planned_update_date",
    "Có data thỏa điều kiện",
    "1. Nhập from và to\n2. Click 検索する",
    "1. Kết quả: AND planned_update_date <= to")

# checkbox filter search
add("Search 1 điều kiện", "Search 対象外設備表示", "Kiểm tra search bỏ điều kiện ※1 khi check 対象外設備表示",
    "Có equipment status != 1",
    "1. Check 対象外設備表示\n2. Click 検索する",
    "1. Bỏ điều kiện ※1, hiển thị cả equipment không active")
add(UP, "Search 製造年空白", "Kiểm tra search bỏ điều kiện ※2 khi check 製造年空白",
    "Có equipment manufacture_date null",
    "1. Check 製造年空白\n2. Click 検索する",
    "1. Bỏ điều kiện ※2, hiển thị cả equipment thiếu 製造年月")
add(UP, "Search 低圧回路表示", "Kiểm tra search filter low voltage khi check 低圧回路表示",
    "Có equipment_master_type.id = 17",
    "1. Check 低圧回路表示\n2. Click 検索する",
    "1. Kết quả: AND equipment_master_type.id = 17")

# combine conditions (decision/AND)
add("Search nhiều điều kiện", "Combine AND 2 điều kiện", "Kiểm tra search kết hợp 2 điều kiện nối bằng AND",
    "Có data thỏa cả 2 điều kiện",
    "1. Chọn 保安設備ID và 事業場名\n2. Click 検索する",
    "1. Kết quả thỏa đồng thời cả 2 điều kiện (nối bằng AND)")
add(UP, "Combine AND nhiều điều kiện", "Kiểm tra search kết hợp nhiều điều kiện",
    "Có data thỏa tất cả điều kiện",
    "1. Chọn nhiều trường điều kiện\n2. Click 検索する",
    "1. Kết quả thỏa tất cả điều kiện (nối bằng AND)")
add(UP, "Combine không có kết quả", "Kiểm tra search nhiều điều kiện không có kết quả",
    "Không có data thỏa tất cả điều kiện",
    "1. Chọn các điều kiện loại trừ nhau\n2. Click 検索する",
    "1. Hiển thị E-MSG-007, disable nút search")
add(UP, "Search không điều kiện", "Kiểm tra search không nhập điều kiện",
    "Có data",
    "1. Không nhập điều kiện\n2. Click 検索する",
    "1. Hiển thị tất cả data theo điều kiện first load mặc định")
add(UP, "Sort sau search", "Kiểm tra sort kết quả sau search", "Đã search có kết quả",
    "1. Click header cột cho phép sort",
    "1. Kết quả sắp xếp theo cột đã chọn, giữ điều kiện search")
add(UP, "Paging sau search", "Kiểm tra phân trang kết quả sau search", "Kết quả search nhiều hơn 1 trang",
    "1. Chuyển trang ở paging",
    "1. Hiển thị trang tiếp theo của kết quả search, giữ điều kiện")

# ============================================================
# SECTION Log
# ============================================================
add("Log", "Log access", "Kiểm tra ghi log khi user access màn hình", "Đã login",
    "1. Truy cập /admin/equipment\n2. Kiểm tra log",
    "1. Ghi log: User :logged_in_user_id read equipment list. page=:pageIndex page_size=:page_size filter_status=:filter_status (json) :access_url :date_time :ip_address :user_agent")
add(UP, "Log search", "Kiểm tra ghi log khi user search", "Đã login",
    "1. Thực hiện search với điều kiện\n2. Kiểm tra log",
    "1. Ghi log read equipment list kèm filter_status (json) chứa điều kiện search")
add(UP, "Log export CSV", "Kiểm tra ghi log export CSV (COMMON-003.4)", "Đã login",
    "1. Export CSV\n2. Kiểm tra log",
    "1. Ghi log liên quan export CSV (tham khảo COMMON-003.4 Download CSV/Excel)")
add(UP, "Log view-config", "Kiểm tra ghi log view config (COMMON-009)", "Đã login",
    "1. Thay đổi View Config\n2. Kiểm tra log",
    "1. Ghi log liên quan view-config (tham khảo COMMON-009 View Config)")
add(UP, "Log favourite", "Kiểm tra ghi log favourite (COMMON-006)", "Đã login",
    "1. Lưu favorite search setting\n2. Kiểm tra log",
    "1. Ghi log liên quan favourite (tham khảo COMMON-006 Favorite Search Setting)")

# ============================================================
# Bổ sung: boundary/decision cho inline search combobox + search result mở rộng
# ============================================================
inline_fields = [
    ("保安設備ID", "equipment.code"),
    ("担当技術者", "engineer_profile.name / engineer.code"),
    ("事業場名", "site.name"),
    ("顧客名", "client.name / client.code"),
    ("機器名称", "safety_equipment.name"),
    ("製造者", "manufacturer.name"),
    ("設備タイプ", "equipment_master_type.name"),
    ("型式", "equipment_master.model_number"),
]
for label, target in inline_fields:
    add(label, "Inline search 1 ký tự", "Kiểm tra inline search 1 ký tự (boundary) của %s" % label,
        "Đã mở form 詳細検索",
        "1. Type 1 ký tự vào %s" % label,
        "1. Thực hiện partial match %s với 1 ký tự, hiển thị item phù hợp" % target)
    add(UP, "Inline search khoảng trắng", "Kiểm tra inline search nhập khoảng trắng %s" % label,
        "Đã mở form 詳細検索",
        "1. Type khoảng trắng vào %s" % label,
        "1. Xử lý theo partial match, không lỗi UI")
    add(UP, "Inline search ký tự đặc biệt", "Kiểm tra inline search ký tự đặc biệt %s" % label,
        "Đã mở form 詳細検索",
        "1. Type ký tự đặc biệt (%%, _, ') vào %s" % label,
        "1. Escape đúng, không lỗi SQL, partial match an toàn")

# Search result column verification mở rộng
add("Kết quả search", "Hiển thị đầy đủ cột", "Kiểm tra kết quả search hiển thị đúng các cột default visible",
    "Đã search có kết quả",
    "1. Quan sát các cột của kết quả search",
    "1. Hiển thị đúng các cột default visible theo thứ tự view config")
add(UP, "Số bản ghi / total", "Kiểm tra số bản ghi total khớp POST /equipment/total",
    "Đã search có kết quả",
    "1. Quan sát tổng số bản ghi\n2. Đối chiếu POST /equipment/total",
    "1. Total số bản ghi khớp với API /equipment/total")
add(UP, "Giữ điều kiện sau reload", "Kiểm tra giữ điều kiện search sau khi reload trang",
    "Đã search có kết quả",
    "1. Reload trang (F5)",
    "1. Giữ nguyên điều kiện search và kết quả (nếu spec lưu state)")
add(UP, "planned_update_date tính đúng", "Kiểm tra planned_update_date = manufacture_date + recommended_replacement_years",
    "Có record có manufacture_date và recommended_replacement_years",
    "1. Bật cột 更新予定年月\n2. Đối chiếu giá trị",
    "1. planned_update_date = manufacture_date + recommended_replacement_years, format yyyy年mm月")
add(UP, "engineer_name primary", "Kiểm tra engineer_name lấy đúng primary còn hiệu lực (REZIL-2350)",
    "Có site có engineer primary còn hiệu lực và engineer cũ hết hạn",
    "1. Quan sát cột 担当技術者 của record",
    "1. Hiển thị engineer_profile.name của engineer primary còn hiệu lực (role_type='primary', CURDATE trong khoảng start/end)")

# ============================================================
# Write CSV
# ============================================================
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
    w.writerow(HEADER)
    for i, r in enumerate(rows, start=1):
        co1, co2, content, pre, steps, expected = r
        w.writerow([str(i), co1, co2, content, pre, steps, expected, "", "", "", "", ""])

print("TOTAL", len(rows))

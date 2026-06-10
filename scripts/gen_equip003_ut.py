#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sinh ~400 UT test case cho man EQUIP-003 Equipment List (tieng Viet co dau).

Thu tu section: S03 (di chuyen) -> S04 (hien thi khoi tao + permission + UI Figma)
-> S04/S05 (hien thi/xu ly tung field) -> S12 (sau search) -> S7 (Log).
Ap dung boundary / decision table / permission matrix; moi validation 1 case kem MSG_ID.
Dung ↑ ke thua. De trong cot ket qua.
"""
import csv, os

UP = "↑"
FIGMA = "https://www.figma.com/design/0nUR2v0mzjAhKLNU1UULQi/?node-id=11757-68625"
NODE = "Figma node 11757-68625"

HEADER = ["TC No.", "Check Object 1", "Check Object 2", "Check content",
          "Pre-conditionTest Data", "Steps", "Expected Result",
          "Test UT Result", "Executed Date", "Status fix bug", "DEV",
          "Note(DefectID, Actual result)", "Bug Severity"]

rows = []
def add(co1, co2, content, pre, steps, expected):
    rows.append([co1, co2, content, pre, steps, expected])

# ============================================================
# S03 — Kiểm tra di chuyển màn hình
# ============================================================
add("Menu name + URL", "Menu access", "Kiểm tra luồng vào màn hình từ menu",
    "Đã login có quyền READ equipment-list",
    "1. Truy cập admin\n2. Confirm hiển thị menu 設備一覧 ở sidebar",
    "1. Menu hiển thị ở tab menu bên trái là 設備一覧\n2. Icon hiển thị trước tab menu giống design mockup")
add(UP, "Click menu", "Kiểm tra URL sau khi click menu", UP,
    "1. Click menu 設備一覧",
    "1. URL hiển thị là http://admin.<env>/admin/equipment\n2. Title màn hình hiển thị 設備一覧")
add(UP, "Reload URL", "Kiểm tra reload trực tiếp URL", UP,
    "1. Reload trực tiếp URL /admin/equipment", "1. Vẫn hiển thị đúng màn hình EQUIP-003 Equipment List")
add(UP, "Browser back", "Kiểm tra back từ màn detail về list", "Vừa từ list đi vào EQUIP-004",
    "1. Từ màn EQUIP-004 nhấn browser back", "1. Quay lại màn EQUIP-003 Equipment List với trạng thái trước đó")
add("equipment_code (textlink)", "Click", "Kiểm tra click 設備ID di chuyển sang detail",
    "Có ít nhất 1 record trong list", "1. Click vào giá trị 設備ID của 1 record",
    "1. Chuyển sang màn EQUIP-004 Equipment Detail\n2. id của equipment được truyền lên path variable")
add("equipment_master_name (textlink)", "Click", "Kiểm tra click 設備マスタ名称 di chuyển sang master detail",
    UP, "1. Click vào giá trị 設備マスタ名称 của 1 record",
    "1. Chuyển sang màn EQUIP-002 Equipment Master Detail\n2. id của equipment_master được truyền lên path variable")
add("breadcumb", "Click", "Kiểm tra click breadcumb di chuyển màn hình", "Đã login",
    "1. Click vào レジル電気保安システム ở breadcumb", "1. Chuyển sang màn AUTH-002 / HOME-001")
add("create_new_equipment_btn (設備登録作成)", "Click", "Kiểm tra click button tạo mới di chuyển màn hình",
    "Đã login", "1. Click button 設備登録作成", "1. Mở sang màn EQUIP-004 Equipment Detail ở mode create (xử lý 5.2)")

# ============================================================
# S04 — Hiển thị khởi tạo: Permission matrix
# ============================================================
add("First load", "Permission - READ", "Kiểm tra user có quyền READ equipment-list",
    "User có quyền 1-IS_READ principal equipment-list",
    "1. Truy cập màn hình /admin/equipment", "1. Hiển thị màn hình danh sách equipment thành công")
add(UP, "Permission - engineer phụ trách", "Kiểm tra user không có quyền READ nhưng là engineer primary của site",
    "User không có quyền READ nhưng là engineer primary còn hiệu lực của site",
    "1. Truy cập màn hình /admin/equipment", "1. Hiển thị danh sách equipment thuộc site mà engineer phụ trách")
add(UP, "Permission - engineer chưa hiệu lực", "Kiểm tra engineer có start_date tương lai",
    "User là engineer nhưng seh.start_date > now", "1. Truy cập màn hình /admin/equipment",
    "1. Không được xem qua quyền engineer; redirect về dashboard nếu không có quyền khác")
add(UP, "Permission - engineer hết hạn", "Kiểm tra engineer đã hết hiệu lực (end_date quá khứ)",
    "User là engineer nhưng seh.end_date < now", "1. Truy cập màn hình /admin/equipment",
    "1. Không được xem qua quyền engineer; redirect về dashboard nếu không có quyền khác")
add(UP, "Permission - engineer qua plan", "Kiểm tra engineer có plan_assignment state hợp lệ",
    "User là engineer có plan_assignment state IN (1,10,11) tại site", "1. Truy cập màn hình /admin/equipment",
    "1. Hiển thị danh sách equipment thuộc site có plan mà engineer phụ trách")
add(UP, "Permission - không quyền", "Kiểm tra user không có bất kỳ quyền nào thỏa mãn",
    "User không có quyền READ và không phải engineer phụ trách", "1. Truy cập màn hình /admin/equipment",
    "1. Redirect về màn dashboard AUTH-002 / HOME-001")
add(UP, "Permission - chưa login", "Kiểm tra truy cập màn khi chưa login", "Chưa login",
    "1. Truy cập trực tiếp URL /admin/equipment", "1. Redirect về màn login (E-MSG-005)")
add(UP, "Permission - session hết hạn", "Kiểm tra thao tác khi session đã hết hạn", "Session đã hết hạn",
    "1. Thực hiện thao tác sau khi session hết hạn", "1. Redirect về màn login (E-MSG-005)")

# Loading / data states / API / order
add("First load", "Loading", "Kiểm tra animation loading khi load data", "Đã login",
    "1. Quan sát khu vực table list trong lúc load data", "1. Hiển thị animation loading ở khu vực table list")
add(UP, "Có data", "Kiểm tra hiển thị data table khi có data", "Có data equipment trong hệ thống",
    "1. Load màn hình", "1. Hiển thị danh sách equipment cho phép xác nhận thông tin cơ bản và trạng thái từng equipment")
add(UP, "Không có data", "Kiểm tra hiển thị khi không có data thỏa điều kiện", "Không có equipment thỏa điều kiện",
    "1. Load màn hình", "1. Hiển thị message E-MSG-007 ở khu vực bảng kết quả search")
add(UP, "Lấy data lỗi", "Kiểm tra khi gọi API lấy data thất bại", "API trả về lỗi",
    "1. Load màn hình khi API lỗi", "1. Hiển thị message lỗi E-MSG-000")
add("First load", "API", "Kiểm tra API được gọi khi first load", "Đã login",
    "1. Load màn hình\n2. Kiểm tra network", "1. Gọi POST /equipment và POST /equipment/total")
add(UP, "Order by", "Kiểm tra thứ tự sắp xếp mặc định", "Có nhiều record",
    "1. Quan sát thứ tự các record", "1. Sắp xếp theo ORDER BY updated_at DESC")
add(UP, "Default filter status", "Kiểm tra mặc định chỉ hiển thị equipment active có manufacture_date",
    "Có data active và inactive", "1. Load màn hình không check filter đặc biệt",
    "1. Chỉ hiển thị equipment status=1 và manufacture_date IS NOT NULL")
add(UP, "Total count", "Kiểm tra tổng số record khớp API total", "Có data",
    "1. Đối chiếu tổng số record với POST /equipment/total", "1. Tổng số hiển thị khớp giá trị API total trả về")

# UI / Style theo Figma
ui_items = [
    ("Layout tổng thể (Figma)", "Đối chiếu layout tổng thể (vị trí title, breadcumb, search form, table, paging, button) với Figma: " + FIGMA, "Layout tổng thể khớp Figma (không vỡ layout)"),
    ("title (設備一覧)", "Đối chiếu font-family / font-size / font-weight / color / alignment của title 設備一覧 với " + NODE, "Style title khớp Figma"),
    ("breadcumb", "Đối chiếu font / size / weight / color / spacing của breadcumb với " + NODE, "Style breadcumb khớp Figma (textlink có màu link)"),
    ("favorite_search_setting (お気に入り)", "Đối chiếu icon star + text, font, color của お気に入り với " + NODE, "Style お気に入り khớp Figma"),
    ("seach_detail (詳細検索)", "Đối chiếu icon arrow + text, font, color của button 詳細検索 với " + NODE, "Style button 詳細検索 khớp Figma"),
    ("search_btn (検索する)", "Đối chiếu kích thước / màu background / icon Search / font / trạng thái normal-hover-disabled của button 検索する với " + NODE, "Style button search khớp Figma"),
    ("reset_search_condition (検索条件をリセット)", "Đối chiếu font / color / kích thước button 検索条件をリセット với " + NODE, "Style button reset khớp Figma"),
    ("save_search_condition (検索条件を保存)", "Đối chiếu font / color / kích thước button 検索条件を保存 với " + NODE, "Style button save search khớp Figma"),
    ("create_new_equipment_btn (設備登録作成)", "Đối chiếu màu background / font / kích thước button 設備登録作成 với " + NODE, "Style button create khớp Figma"),
    ("Search form (accordion)", "Đối chiếu spacing / padding / alignment các field trong accordion Advanced Search với " + NODE, "Style search form khớp Figma"),
    ("Table header", "Đối chiếu font / weight / color / alignment của header bảng với " + NODE, "Style header bảng khớp Figma"),
    ("Table row", "Đối chiếu font / color / spacing / line-height của row data + textlink với " + NODE, "Style row data khớp Figma"),
    ("Table - zebra/hover", "Đối chiếu màu nền xen kẽ và trạng thái hover row với " + NODE, "Màu nền và hover row khớp Figma"),
    ("paging", "Đối chiếu style component paging với " + NODE, "Style paging khớp Figma (tham khảo COMMON-001)"),
    ("action menu", "Đối chiếu icon / font / spacing menu item 表示設定, CSVダウンロード với " + NODE, "Style action menu khớp Figma"),
    ("checkbox (select row)", "Đối chiếu kích thước / màu / trạng thái checked-unchecked checkbox chọn record với " + NODE, "Style checkbox khớp Figma"),
    ("date calendar field", "Đối chiếu icon lịch / placeholder 年 / 月 / 日 của các field calendar với " + NODE, "Style calendar field khớp Figma"),
    ("error message", "Đối chiếu màu chữ đỏ / font / vị trí hiển thị error message với " + NODE, "Style error message khớp Figma"),
    ("combobox dropdown", "Đối chiếu style dropdown multi-select (tag đã chọn, padding, font) với " + NODE, "Style combobox dropdown khớp Figma"),
    ("filter checkbox", "Đối chiếu style checkbox filter (対象外設備表示, 製造年空白, 低圧回路表示) với " + NODE, "Style checkbox filter khớp Figma"),
]
for co1, step, exp in ui_items:
    add(co1, "Style", "Kiểm tra style/UI của " + co1.split(" (")[0] + " khớp Figma", "Đã login",
        "1. " + step, "1. " + exp)

# ============================================================
# S04/S05 — Hiển thị/Xử lý từng field
# ============================================================
def combobox(co1, label, search_target, fmt, default="rỗng", extra=None):
    add(co1, "Item type", "Kiểm tra hiển thị multi-select combobox " + label, "Đã login",
        "1. Quan sát field " + label, "1. Hiển thị multi-select combobox cho phép chọn nhiều")
    add(UP, "Default value", "Kiểm tra giá trị default", UP,
        "1. Quan sát field " + label + " khi first load", "1. Default " + default)
    add(UP, "Inline search - hợp lệ", "Kiểm tra in-line search partial match " + search_target, "Có data tương ứng",
        "1. Type keyword khớp vào field " + label,
        "1. Search inline partial match theo " + search_target + "\n2. Format item dropdown " + fmt)
    add(UP, "Inline search - không kết quả", "Kiểm tra type keyword không khớp", "Đã login",
        "1. Type keyword không tồn tại vào field " + label, "1. Dropdown hiển thị không có kết quả")
    add(UP, "Multi select", "Kiểm tra chọn nhiều giá trị", "Có data tương ứng",
        "1. Chọn nhiều item trong dropdown", "1. Cho phép chọn nhiều giá trị đồng thời")
    add(UP, "Clear selected", "Kiểm tra bỏ chọn giá trị đã chọn", "Đã chọn ít nhất 1 item",
        "1. Bỏ chọn (remove tag) 1 item đã chọn", "1. Item bị bỏ khỏi danh sách đã chọn")
    add(UP, "Inline search - 1 ký tự", "Kiểm tra inline search với keyword 1 ký tự (boundary)", "Có data tương ứng",
        "1. Type keyword 1 ký tự vào field " + label, "1. Search inline partial match trả về kết quả khớp 1 ký tự")
    add(UP, "Inline search - khoảng trắng", "Kiểm tra inline search với keyword có khoảng trắng đầu/cuối", "Có data tương ứng",
        "1. Type keyword có khoảng trắng đầu/cuối vào field " + label, "1. Search inline xử lý keyword (trim/partial match) đúng kết quả")
    add(UP, "Giữ giá trị sau search", "Kiểm tra giá trị đã chọn được giữ trong điều kiện sau khi search", "Đã chọn item và search",
        "1. Chọn item\n2. Click 検索する\n3. Mở lại form", "1. Giá trị đã chọn vẫn được giữ trong điều kiện search")
    add(UP, "Reset về default", "Kiểm tra reset field về default", "Đã chọn item",
        "1. Click 検索条件をリセット", "1. Field " + label + " reset về " + default)
    if extra:
        add(*extra)

combobox("equipment_code_condition (保安設備ID)", "保安設備ID", "equipment.code",
         "<equipment.code> sắp xếp theo id ASC")
combobox("engineer_condition (担当技術者)", "担当技術者", "engineer_profile.name hoặc engineer.code",
         "<engineer.ep.name (engineer.code)> sắp xếp theo id ASC")
combobox("site_condition (事業場名)", "事業場名", "site.name", "<site.name> sắp xếp theo id ASC")
combobox("client_condition (顧客名)", "顧客名", "client.name hoặc client.code",
         "<client.name> (<client.code>) sắp xếp theo id ASC")
combobox("safety_equipment_name_condition (機器名称)", "機器名称", "safety_equipment.name",
         "<safety_equipment_name> sắp xếp theo id ASC", default="chưa chọn")
combobox("manufacturer_condition (製造者)", "製造者", "manufacturer.name",
         "<manufacturer.name> sắp xếp theo id ASC", default="chưa chọn")
combobox("equipment_master_type_condition (設備タイプ)", "設備タイプ", "equipment_master_type.name",
         "<equipment_master_type.name> sắp xếp theo display_order ASC (is_active=1)", default="chưa chọn",
         extra=("equipment_master_type_condition (設備タイプ)", "Decision - option 低圧回路",
                "Kiểm tra option id=17 [低圧回路] chỉ hiện khi low_voltage_circuit check",
                "Có equipment_master_type id=17",
                "1. Khi low_voltage_circuit chưa check, mở dropdown 設備タイプ\n2. Check low_voltage_circuit, mở lại dropdown",
                "1. Option 低圧回路 (id=17) không hiển thị\n2. Option 低圧回路 hiển thị"))
combobox("model_number_condition (型式)", "型式", "equipment_master.model_number",
         "<equipment_master.model_number> sắp xếp theo id ASC", default="chưa chọn")

add("area_condition (エリア)", "Item type + Default", "Kiểm tra hiển thị và default field エリア", "Đã login",
    "1. Quan sát field エリア",
    "1. Hiển thị multi-select combobox (tham khảo COMMON-008 Shikugun Select)\n2. Default chưa chọn")
add(UP, "Select", "Kiểm tra chọn giá trị area", "Có data area",
    "1. Chọn giá trị area trong COMMON-008", "1. Cho phép chọn giá trị area để filter")

# Date from fields
def date_from(co1, label):
    add(co1, "Item type + Default", "Kiểm tra hiển thị calendar và default " + label, "Đã login",
        "1. Quan sát field " + label, "1. Hiển thị calendar input\n2. Default chưa chọn placeholder 年 / 月 / 日")
    add(UP, "Input - chọn lịch", "Kiểm tra chọn ngày trên lịch", UP,
        "1. Click vào field, chọn 1 ngày trên lịch", "1. Hiển thị ngày đã chọn theo format yyyy/mm/dd")
    add(UP, "Input - nhập tay hợp lệ", "Kiểm tra nhập ngày bằng bàn phím đúng format", UP,
        "1. Nhập ngày đúng format yyyy/mm/dd vào field", "1. Chấp nhận giá trị ngày hợp lệ")
    add(UP, "Validation - sai format", "Kiểm tra nhập sai format ngày", UP,
        "1. Nhập giá trị không đúng format (vd 2026-13-40)", "1. Hiển thị error 入力形式が正しくありません")
    add(UP, "Validation - tháng không hợp lệ", "Kiểm tra nhập tháng > 12 (boundary)", UP,
        "1. Nhập 2026/13/01", "1. Hiển thị error 入力形式が正しくありません")
    add(UP, "Validation - ngày không hợp lệ", "Kiểm tra nhập ngày > số ngày trong tháng (boundary)", UP,
        "1. Nhập 2026/02/30", "1. Hiển thị error 入力形式が正しくありません")
    add(UP, "Boundary - năm nhuận", "Kiểm tra ngày 29/02 năm nhuận", UP,
        "1. Nhập 2024/02/29 (năm nhuận)", "1. Chấp nhận giá trị hợp lệ")
    add(UP, "Boundary - năm không nhuận", "Kiểm tra ngày 29/02 năm không nhuận", UP,
        "1. Nhập 2026/02/29 (không nhuận)", "1. Hiển thị error 入力形式が正しくありません")

date_from("from_manufacture_date (製造年期間指定from)", "製造年期間指定(from)")

add("to_manufacture_date (製造年期間指定to)", "Disable", "Kiểm tra disable khi chưa nhập from_manufacture_date", "Đã login",
    "1. Quan sát field 製造年期間指定(to) khi from rỗng", "1. Field 製造年期間指定(to) bị disable")
add(UP, "Enable", "Kiểm tra enable khi đã nhập from_manufacture_date", "Đã login",
    "1. Nhập from_manufacture_date\n2. Quan sát field to", "1. Field 製造年期間指定(to) được enable")
add(UP, "Validation - sai format", "Kiểm tra nhập sai format ngày", "Đã enable to_manufacture_date",
    "1. Nhập giá trị không đúng format", "1. Hiển thị error 入力形式が正しくありません")
add(UP, "Validation - from < to", "Kiểm tra from nhỏ hơn to (boundary n-1)", "Đã nhập from = 2026/06/01",
    "1. Nhập to = 2026/06/02 (from < to)", "1. Không hiển thị error, giá trị hợp lệ")
add(UP, "Validation - from = to", "Kiểm tra from bằng to (boundary n)", "Đã nhập from = 2026/06/01",
    "1. Nhập to = 2026/06/01 (from = to)", "1. Không hiển thị error, giá trị hợp lệ")
add(UP, "Validation - from > to", "Kiểm tra from lớn hơn to (boundary n+1)", "Đã nhập from = 2026/06/02",
    "1. Nhập to = 2026/06/01 (from > to)",
    "1. Hiển thị error E-EQUIP-003-001: 製造年期間指定(from)が(to)より未来日です。正しい範囲を指定してください")

date_from("from_recommended_replacement_years (更新予定年月from)", "更新予定年月（from）")

add("to_recommended_replacement_years (更新予定年月to)", "Disable", "Kiểm tra disable khi chưa nhập from_recommended_replacement_years", "Đã login",
    "1. Quan sát field 更新予定年月（to） khi from rỗng", "1. Field 更新予定年月（to）bị disable")
add(UP, "Enable", "Kiểm tra enable khi đã nhập from_recommended_replacement_years", "Đã login",
    "1. Nhập from_recommended_replacement_years\n2. Quan sát field to", "1. Field 更新予定年月（to）được enable")
add(UP, "Validation - sai format", "Kiểm tra nhập sai format ngày", "Đã enable to_recommended_replacement_years",
    "1. Nhập giá trị không đúng format", "1. Hiển thị error 入力形式が正しくありません")
add(UP, "Validation - from < to", "Kiểm tra from nhỏ hơn to (boundary n-1)", "Đã nhập from = 2026/06",
    "1. Nhập to = 2026/07 (from < to)", "1. Không hiển thị error, giá trị hợp lệ")
add(UP, "Validation - from = to", "Kiểm tra from bằng to (boundary n)", "Đã nhập from = 2026/06",
    "1. Nhập to = 2026/06 (from = to)", "1. Không hiển thị error, giá trị hợp lệ")
add(UP, "Validation - from > to", "Kiểm tra from lớn hơn to (boundary n+1)", "Đã nhập from = 2026/07",
    "1. Nhập to = 2026/06 (from > to)",
    "1. Hiển thị error E-EQUIP-003-002: 更新推奨年超過時期（from）が(to)より未来日です。正しい範囲を指定してください")

# Checkboxes
def checkbox_filter(co1, label, filter_desc):
    add(co1, "Item type + Default", "Kiểm tra hiển thị checkbox và default " + label, "Đã login",
        "1. Quan sát checkbox " + label, "1. Hiển thị checkbox\n2. Default không check")
    add(UP, "Check", "Kiểm tra filter khi check " + label, "Có data tương ứng",
        "1. Check " + label + "\n2. Search", "1. " + filter_desc)
    add(UP, "Uncheck", "Kiểm tra bỏ check trở lại mặc định", "Đã check " + label,
        "1. Uncheck " + label + "\n2. Search", "1. Trở lại filter mặc định (bỏ điều kiện của checkbox)")

checkbox_filter("non_applicable_equipment (対象外設備表示)", "対象外設備表示",
                "Bỏ điều kiện ※1 (status=1), hiển thị cả sản phẩm không active")
checkbox_filter("non_manufacture_date (製造年空白)", "製造年空白",
                "Bỏ điều kiện ※2, hiển thị cả sản phẩm để trống ngày sản xuất")
checkbox_filter("low_voltage_circuit (低圧回路表示)", "低圧回路表示",
                "Filter AND equipment_master_type.id = 17 (sản phẩm điện thế thấp)")

# favorite / detail-search / reset / save
add("favorite_search_setting (お気に入り)", "Item type", "Kiểm tra hiển thị dropdown お気に入り", "Đã login",
    "1. Quan sát mục お気に入り", "1. Hiển thị dropdown gồm icon star + text お気に入り (tham khảo COMMON-006)")
add(UP, "Click", "Kiểm tra click お気に入り", "Đã login",
    "1. Click お気に入り", "1. Hiển thị danh sách favorite search settings (tham khảo COMMON-006)")
add(UP, "Apply favorite", "Kiểm tra chọn 1 favorite áp dụng điều kiện", "Có favorite đã lưu",
    "1. Chọn 1 favorite trong dropdown", "1. Áp dụng điều kiện search đã lưu vào form")

add("seach_detail (詳細検索)", "Item type", "Kiểm tra hiển thị button 詳細検索", "Đã login",
    "1. Quan sát mục 詳細検索", "1. Hiển thị button gồm icon arrow + text 詳細検索")
add(UP, "Click - mở", "Kiểm tra click 詳細検索 mở accordion", "Đã login",
    "1. Click button 詳細検索", "1. Hiển thị nội dung accordion Advanced Search Setting (mục 11 đến 14)")
add(UP, "Click - đóng", "Kiểm tra click lần 2 đóng accordion", "Accordion đang mở",
    "1. Click lại button 詳細検索", "1. Ẩn nội dung accordion Advanced Search Setting")

add("reset_search_condition (検索条件をリセット)", "Click", "Kiểm tra reset điều kiện search về default",
    "Đã nhập các điều kiện search",
    "1. Nhập 1 số điều kiện search\n2. Click button 検索条件をリセット", "1. Tất cả option search reset về default")
add("save_search_condition (検索条件を保存)", "Click", "Kiểm tra mở popup lưu favorite search", "Đã login",
    "1. Click button 検索条件を保存", "1. Hiển thị popup nhập tên search_setting để lưu favorite (tham khảo COMMON-006)")
add(UP, "Save - thành công", "Kiểm tra lưu favorite thành công", "Popup lưu đang mở",
    "1. Nhập tên search_setting\n2. Xác nhận lưu", "1. Lưu favorite_search_setting thành công, hiển thị toast thành công")
add(UP, "Save - hủy", "Kiểm tra hủy popup lưu favorite", "Popup lưu đang mở",
    "1. Click hủy / đóng popup", "1. Đóng popup, không lưu favorite")

# action / checkbox / paging / view config
add("action", "Item type", "Kiểm tra hiển thị menu action", "Đã login",
    "1. Click vào action menu", "1. Hiển thị menu item 表示設定 (Display Setting) và CSVダウンロード (Export CSV)")
add("checkbox", "Select", "Kiểm tra chọn record để action", "Có data",
    "1. Click checkbox của record", "1. Record được chọn để thực hiện action")
add(UP, "Select all", "Kiểm tra chọn tất cả record", "Có data nhiều record",
    "1. Click checkbox header chọn all", "1. Chọn tất cả record trong trang")
add(UP, "Unselect", "Kiểm tra bỏ chọn record", "Đã chọn record",
    "1. Bỏ check 1 record", "1. Record được bỏ chọn")
add("paging", "Display", "Kiểm tra hiển thị phân trang", "Có data nhiều hơn 1 trang",
    "1. Quan sát khu vực paging", "1. Hiển thị phân trang theo COMMON-001 Pagination")
add(UP, "Chuyển trang", "Kiểm tra chuyển trang kết quả", "Có data nhiều hơn 1 trang",
    "1. Click sang trang 2", "1. Hiển thị data trang 2, gửi page=:pageIndex tương ứng")
add(UP, "Đổi page_size", "Kiểm tra đổi số bản ghi mỗi trang", "Có data nhiều",
    "1. Đổi page_size", "1. Hiển thị số bản ghi tương ứng page_size, gọi lại API")

add("Display column", "Default view config", "Kiểm tra các cột hiển thị mặc định và thứ tự",
    "Đã login chưa customize view", "1. Quan sát các cột bảng list",
    "1. Hiển thị đúng thứ tự cột: equipment_code, site_name, equipment_master_name, engineer_name, site_location, usage_purpose, manufacture_date, recommended_replacement_years, number_years_passed")
add(UP, "Fixed column", "Kiểm tra cột 設備ID luôn visible", "Đã login",
    "1. Mở 表示設定, bỏ chọn tất cả các cột", "1. Cột equipment_code (設備ID) luôn visible (không thể ẩn)")
add(UP, "Hidden column", "Kiểm tra các cột default ẩn", "Đã login", "1. Quan sát bảng list",
    "1. Các cột site_code, equipment_master_code, manufacture_name, safety_equipment_name, model_number, serial_number, management_unit, equipment_master_type_name, planned_update_date, remarks mặc định ẩn")
add("display_setting (表示設定)", "Click", "Kiểm tra mở display setting", "Đã login",
    "1. Click 表示設定", "1. Hiển thị xử lý COMMON-009 View Config")
add(UP, "Toggle column - bật", "Kiểm tra bật hiển thị 1 cột default ẩn", "Display setting đang mở",
    "1. Bật hiển thị 1 cột default ẩn\n2. Apply", "1. Cột được hiển thị trên bảng list")
add(UP, "Toggle column - tắt", "Kiểm tra tắt hiển thị 1 cột (trừ cột fixed)", "Display setting đang mở",
    "1. Tắt hiển thị 1 cột (không phải 設備ID)\n2. Apply", "1. Cột bị ẩn khỏi bảng list")
add(UP, "Lưu view config", "Kiểm tra lưu cấu hình cột cho user", "Display setting đang mở",
    "1. Thay đổi cấu hình cột\n2. Lưu", "1. Lưu view_config theo user (tham khảo COMMON-009)")

# Display columns rendering
def display_col(co1, label, content, expected, pre="Có data"):
    add(co1, "Display", content, pre, "1. Quan sát giá trị cột " + label, "1. " + expected)

display_col("equipment_code (設備ID)", "設備ID", "Kiểm tra hiển thị 設備ID textlink",
            "Hiển thị equipment.code là textlink (màu link)")
display_col("site_name (事業場名)", "事業場名", "Kiểm tra hiển thị 事業場名", "Hiển thị site.name")
display_col("equipment_master_name (設備マスタ名称)", "設備マスタ名称",
            "Kiểm tra hiển thị 設備マスタ名称 textlink", "Hiển thị equipment_master.name là textlink")
display_col("engineer_name (担当技術者)", "担当技術者", "Kiểm tra hiển thị 担当技術者",
            "Hiển thị engineer_profile.name của engineer primary còn hiệu lực của site")
display_col("engineer_name (担当技術者)", "担当技術者", "Kiểm tra hiển thị khi site không có engineer primary",
            "Hiển thị rỗng/- (không có engineer primary)", pre="Site không có engineer primary")
display_col("site_location (使用場所)", "使用場所", "Kiểm tra hiển thị 使用場所",
            "Hiển thị site_location.name (LEFT JOIN, có thể rỗng)")
add("usage_purpose (用途)", "Display - normal", "Kiểm tra hiển thị usage_purpose dưới 20 ký tự",
    "Record có usage_purpose < 20 ký tự (boundary n-1)", "1. Quan sát cột 用途", "1. Hiển thị đầy đủ giá trị usage_purpose")
add(UP, "Display - boundary 20", "Kiểm tra hiển thị usage_purpose đúng 20 ký tự (boundary n)",
    "Record có usage_purpose = 20 ký tự", "1. Quan sát cột 用途", "1. Hiển thị đủ 20 ký tự, không có ...")
add(UP, "Display - boundary 21", "Kiểm tra hiển thị usage_purpose 21 ký tự (boundary n+1)",
    "Record có usage_purpose = 21 ký tự", "1. Quan sát cột 用途", "1. Hiển thị 20 ký tự đầu + ...")
add("manufacture_date (製造年月)", "Display - format", "Kiểm tra format ngày sản xuất", "Record có manufacture_date",
    "1. Quan sát cột 製造年月", "1. Hiển thị format yyyy/mm/dd")
add(UP, "Display - null", "Kiểm tra hiển thị khi manufacture_date null", "Record có manufacture_date null",
    "1. Quan sát cột 製造年月", "1. Hiển thị -")
add("recommended_replacement_years (更新推奨年数)", "Display", "Kiểm tra hiển thị số năm khuyến nghị thay thế",
    "Record có recommended_replacement_years", "1. Quan sát cột 更新推奨年数",
    "1. Hiển thị equipment_master.recommended_replacement_years + 年")
add("number_years_passed (経過年数)", "Display - làm tròn xuống", "Kiểm tra hiển thị số năm đã qua làm tròn xuống",
    "Record có manufacture_date (vd 2.7 năm)", "1. Quan sát cột 経過年数",
    "1. Hiển thị number_years_passed = now - manufacture_date làm tròn xuống + 年 (vd 2.7 hiển thị 2年)")
add(UP, "Display - boundary < 1 năm", "Kiểm tra hiển thị khi chưa đủ 1 năm", "Record manufacture_date cách đây 0.5 năm",
    "1. Quan sát cột 経過年数", "1. Hiển thị 0年 (làm tròn xuống)")
add(UP, "Display - null", "Kiểm tra hiển thị khi không tính được", "Record có manufacture_date null",
    "1. Quan sát cột 経過年数", "1. Hiển thị -")
display_col("site_code (事業場ID)", "事業場ID", "Kiểm tra hiển thị site_code khi bật cột",
            "Hiển thị site.code", pre="Đã bật cột 事業場ID")
display_col("equipment_master_code (設備マスタID)", "設備マスタID",
            "Kiểm tra hiển thị equipment_master_code khi bật cột", "Hiển thị equipment_master.code", pre="Đã bật cột 設備マスタID")
display_col("manufacture_name (製造者)", "製造者", "Kiểm tra hiển thị manufacture_name khi bật cột",
            "Hiển thị manufacturer.name", pre="Đã bật cột 製造者")
display_col("safety_equipment_name (機器名)", "機器名", "Kiểm tra hiển thị safety_equipment_name khi bật cột",
            "Hiển thị safety_equipment.name", pre="Đã bật cột 機器名")
display_col("model_number (型式)", "型式", "Kiểm tra hiển thị model_number khi bật cột",
            "Hiển thị equipment_master.model_number", pre="Đã bật cột 型式")
display_col("serial_number (製造番号)", "製造番号", "Kiểm tra hiển thị serial_number khi bật cột",
            "Hiển thị equipment.serial_number", pre="Đã bật cột 製造番号")
display_col("management_unit (管理単位)", "管理単位", "Kiểm tra hiển thị management_unit khi bật cột",
            "Hiển thị equipment.management_unit", pre="Đã bật cột 管理単位")
display_col("equipment_master_type_name (設備タイプ)", "設備タイプ",
            "Kiểm tra hiển thị equipment_master_type_name khi bật cột", "Hiển thị equipment_master_type.name", pre="Đã bật cột 設備タイプ")
add("planned_update_date (更新予定年月)", "Display - tính toán", "Kiểm tra hiển thị ngày dự kiến cập nhật",
    "Record có manufacture_date + recommended_replacement_years (đã bật cột)", "1. Quan sát cột 更新予定年月",
    "1. planned_update_date = manufacture_date + recommended_replacement_years format yyyy年mm月")
add(UP, "Display - null", "Kiểm tra hiển thị khi manufacture_date null", "Record manufacture_date null (đã bật cột)",
    "1. Quan sát cột 更新予定年月", "1. Hiển thị - (không tính được)")
display_col("remarks (備考)", "備考", "Kiểm tra hiển thị remarks khi bật cột",
            "Hiển thị equipment.remarks", pre="Đã bật cột 備考")

# Sort
sortable = [
    ("equipment_code (設備ID)", "設備ID"), ("site_name (事業場名)", "事業場名"),
    ("equipment_master_name (設備マスタ名称)", "設備マスタ名称"), ("engineer_name (担当技術者)", "担当技術者"),
    ("site_location (使用場所)", "使用場所"), ("usage_purpose (用途)", "用途"),
    ("manufacture_date (製造年月)", "製造年月"), ("recommended_replacement_years (更新推奨年数)", "更新推奨年数"),
    ("number_years_passed (経過年数)", "経過年数"), ("site_code (事業場ID)", "事業場ID"),
    ("equipment_master_code (設備マスタID)", "設備マスタID"), ("manufacture_name (製造者)", "製造者"),
    ("safety_equipment_name (機器名)", "機器名"), ("model_number (型式)", "型式"),
    ("equipment_master_type_name (設備タイプ)", "設備タイプ"), ("planned_update_date (更新予定年月)", "更新予定年月"),
]
for co1, lbl in sortable:
    add(co1, "Sort ASC", "Kiểm tra sort tăng dần cột " + lbl, "Có data nhiều record (đã bật cột)",
        "1. Click header cột " + lbl + " lần 1", "1. Sắp xếp tăng dần theo " + lbl)
    add(UP, "Sort DESC", "Kiểm tra sort giảm dần cột " + lbl, UP,
        "1. Click header cột " + lbl + " lần 2", "1. Sắp xếp giảm dần theo " + lbl)

for co1, lbl in [("serial_number (製造番号)", "製造番号"),
                 ("management_unit (管理単位)", "管理単位"), ("remarks (備考)", "備考")]:
    add(co1, "No sort", "Kiểm tra cột không cho sort " + lbl, "Có data (đã bật cột)",
        "1. Click header cột " + lbl, "1. Không sắp xếp (cột không cho sort)")

# ============================================================
# S12 — Hiển thị/Xử lý sau Search
# ============================================================
add("Layout", "Sau search thành công", "Kiểm tra layout sau khi search thành công", "Đã thực hiện search thành công",
    "1. Kiểm tra layout tổng thể", "1. Layout không vỡ, giống trạng thái hiển thị ban đầu")

search_conds = [
    ("保安設備ID", "AND equipment.id IN equipment_code_condition"),
    ("担当技術者", "AND site_engineer.eid IN engineer_condition"),
    ("顧客名", "AND s.client_id IN client_condition"),
    ("事業場名", "AND site.id IN site_condition"),
    ("エリア", "AND site.inspection_area_id = area_condition"),
    ("機器名称", "AND se.id IN safety_equipment_name_condition"),
    ("製造者", "AND manufacturer.id IN manufacturer_condition"),
    ("設備タイプ", "AND em.equipment_master_type_id IN equipment_master_type_condition"),
    ("型式", "AND equipment_master.id IN model_number_condition"),
    ("製造年期間指定(from)", "AND from_manufacture_date <= equipment.manufacture_date"),
    ("製造年期間指定(to)", "AND to_manufacture_date >= equipment.manufacture_date"),
    ("更新予定年月（from）", "AND planned_update_date >= from_recommended_replacement_years"),
    ("更新予定年月（to）", "AND planned_update_date <= to_recommended_replacement_years"),
]
first = True
for fld, cond in search_conds:
    if first:
        add("search_btn (検索する)", "Search 1 điều kiện - " + fld, "Kiểm tra search theo điều kiện " + fld, "Có data",
            "1. Chọn/nhập giá trị trường " + fld + "\n2. Click button 検索する",
            "1. Ẩn phần detail search form\n2. Hiển thị kết quả search theo điều kiện: " + cond)
        first = False
    else:
        add(UP, "Search 1 điều kiện - " + fld, "Kiểm tra search theo điều kiện " + fld, "Có data",
            "1. Chọn/nhập giá trị trường " + fld + "\n2. Click 検索する",
            "1. Hiển thị kết quả search theo điều kiện: " + cond)

add(UP, "Search nhiều điều kiện", "Kiểm tra search nhiều điều kiện kết hợp AND", "Có data",
    "1. Chọn nhiều trường điều kiện\n2. Click 検索する", "1. Hiển thị kết quả thỏa tất cả điều kiện nối bằng AND")
add(UP, "Search không điều kiện", "Kiểm tra search khi không nhập điều kiện", "Có data",
    "1. Không nhập điều kiện\n2. Click 検索する", "1. Hiển thị tất cả kết quả theo điều kiện mặc định")
add(UP, "Search không kết quả", "Kiểm tra search không có kết quả", "Có data",
    "1. Nhập điều kiện không có kết quả\n2. Click 検索する",
    "1. Hiển thị E-MSG-007 ở khu vực bảng\n2. Disable nút search; nếu sửa điều kiện trong form thì enable lại")
add(UP, "Re-enable search", "Kiểm tra enable lại nút search khi sửa điều kiện", "Search vừa trả về không kết quả, nút search disable",
    "1. Sửa điều kiện trong form", "1. Nút 検索する được enable lại")
add(UP, "Decision - 低圧回路 + 設備タイプ", "Kiểm tra check 低圧回路 ảnh hưởng filter type id=17", "Có data type id=17",
    "1. Check 低圧回路表示\n2. Click 検索する", "1. Hiển thị kết quả AND equipment_master_type.id = 17")

add("download_csv (CSVダウンロード)", "Click", "Kiểm tra export CSV", "Có kết quả search",
    "1. Click CSVダウンロード", "1. Thực hiện xử lý export CSV (tham khảo COMMON-003.4) gọi POST /equipment/export")
add(UP, "Export theo filter", "Kiểm tra export theo điều kiện filter hiện tại", "Đã search có filter",
    "1. Search có filter\n2. Click CSVダウンロード", "1. File export chứa data theo filter_status hiện tại")
add(UP, "Export không có data", "Kiểm tra export khi không có kết quả", "Search không có kết quả",
    "1. Click CSVダウンロード khi không có data", "1. Xử lý theo COMMON-003.4 (không có data để export)")

# ============================================================
# S7 — Log
# ============================================================
add("Output log", "Log read", "Kiểm tra ghi log khi user access/search", "Đã login",
    "1. Thực hiện access/search màn hình\n2. Kiểm tra log",
    "1. Ghi log: User :logged_in_user_id read equipment list. page=:pageIndex page_size=:page_size filter_status=:filter_status (json) :access_url :date_time :ip_address :user_agent")
add(UP, "Log read - thất bại", "Kiểm tra khi access thất bại không ghi log read thành công", "API lỗi",
    "1. Access thất bại\n2. Kiểm tra log", "1. Không ghi log read thành công (hoặc ghi log lỗi tương ứng)")
add(UP, "Log export csv - thành công", "Kiểm tra ghi log khi export csv thành công", "Đã login",
    "1. Thực hiện export CSV thành công\n2. Kiểm tra log", "1. Ghi log liên quan export csv (tham khảo COMMON-003.4)")
add(UP, "Log export csv - thất bại", "Kiểm tra ghi log khi export csv thất bại", "Đã login",
    "1. Thực hiện export CSV thất bại\n2. Kiểm tra log", "1. Ghi log thất bại liên quan export csv (tham khảo COMMON-003.4)")
add(UP, "Log view-config", "Kiểm tra ghi log khi thay đổi view config", "Đã login",
    "1. Thay đổi 表示設定\n2. Kiểm tra log", "1. Ghi log liên quan view-config (tham khảo COMMON-009)")
add(UP, "Log favorite - lưu", "Kiểm tra ghi log khi lưu favorite search", "Đã login",
    "1. Lưu favorite search setting\n2. Kiểm tra log", "1. Ghi log liên quan favorite (tham khảo COMMON-006)")

# ============================================================
# S04/S05 bổ sung — Permission matrix theo từng action
# ============================================================
perm_actions = [
    ("Export CSV", "1. Engineer phụ trách (không có quyền EXPORT) click CSVダウンロード", "Thực hiện/không thực hiện export theo phân quyền export của user"),
    ("Display setting", "1. User click 表示設定", "Cho phép tùy chỉnh view config theo COMMON-009 (theo quyền)"),
    ("Save favorite", "1. User click 検索条件を保存", "Cho phép lưu favorite search theo COMMON-006 (theo quyền)"),
]
for act, step, exp in perm_actions:
    add("Permission - " + act, "Quyền engineer", "Kiểm tra phân quyền action " + act + " với user engineer-only",
        "User chỉ là engineer phụ trách (không có quyền admin)", step, "1. " + exp)

# ============================================================
# S12 bổ sung — search no-match per condition + kết hợp filter mặc định
# ============================================================
for fld, _cond in search_conds:
    add("search_btn (検索する)", "Search no-match - " + fld, "Kiểm tra search điều kiện " + fld + " không khớp record nào",
        "Có data nhưng không record nào khớp " + fld, "1. Chọn/nhập giá trị " + fld + " không có record\n2. Click 検索する",
        "1. Hiển thị E-MSG-007 (không có kết quả) ở khu vực bảng")

add("search_btn (検索する)", "Decision - 対象外 + search", "Kiểm tra check 対象外設備表示 kết hợp điều kiện search",
    "Có data inactive thỏa điều kiện search", "1. Check 対象外設備表示\n2. Chọn 1 điều kiện search\n3. Click 検索する",
    "1. Bỏ ※1 và áp thêm điều kiện search (kết quả gồm cả record không active thỏa điều kiện)")
add(UP, "Decision - 製造年空白 + search", "Kiểm tra check 製造年空白 kết hợp điều kiện search",
    "Có data thiếu manufacture_date thỏa điều kiện search", "1. Check 製造年空白\n2. Chọn 1 điều kiện search\n3. Click 検索する",
    "1. Bỏ ※2 và áp thêm điều kiện search (kết quả gồm cả record thiếu 製造年月 thỏa điều kiện)")
add(UP, "Decision - kết hợp 3 checkbox", "Kiểm tra check đồng thời 対象外設備表示 + 製造年空白 + 低圧回路表示",
    "Có data tương ứng", "1. Check cả 3 checkbox\n2. Click 検索する",
    "1. Bỏ ※1, bỏ ※2 và thêm AND equipment_master_type.id = 17")

# Sort kết hợp paging/search persistence
add("Sort + Paging", "Persistence", "Kiểm tra sort được giữ khi chuyển trang", "Có data nhiều trang đã sort",
    "1. Sort 1 cột\n2. Chuyển sang trang khác", "1. Thứ tự sort được giữ trên trang mới")
add("Sort + Search", "Persistence", "Kiểm tra sort sau khi search", "Đã search có kết quả",
    "1. Search\n2. Sort 1 cột", "1. Kết quả search được sắp xếp theo cột đã chọn")
add("Paging + Search", "Reset trang", "Kiểm tra reset về trang 1 sau khi search", "Đang ở trang 2",
    "1. Đang ở trang 2\n2. Thực hiện search mới", "1. Kết quả search hiển thị từ trang 1")

# Date boundary year min/max + picker vs manual
for co1, label in [("from_manufacture_date (製造年期間指定from)", "製造年期間指定(from)"),
                   ("from_recommended_replacement_years (更新予定年月from)", "更新予定年月（from）")]:
    add(co1, "Boundary - năm min", "Kiểm tra nhập năm nhỏ nhất hệ thống cho phép", "Đã login",
        "1. Nhập năm nhỏ nhất (vd 1900) cho " + label, "1. Chấp nhận hoặc báo lỗi theo giới hạn hệ thống")
    add(UP, "Boundary - năm tương lai xa", "Kiểm tra nhập năm tương lai xa", UP,
        "1. Nhập năm tương lai xa (vd 9999) cho " + label, "1. Chấp nhận hoặc báo lỗi theo giới hạn hệ thống")
    add(UP, "Picker vs manual đồng bộ", "Kiểm tra chọn lịch và nhập tay cho cùng giá trị", UP,
        "1. Chọn 1 ngày trên lịch\n2. So sánh với nhập tay cùng ngày", "1. Hai cách nhập cho cùng giá trị hiển thị")

# usage_purpose / number_years_passed thêm boundary
add("number_years_passed (経過年数)", "Boundary - đúng tròn năm", "Kiểm tra hiển thị khi đúng tròn N năm",
    "Record manufacture_date cách đây đúng 3 năm", "1. Quan sát cột 経過年数", "1. Hiển thị 3年")
add(UP, "Boundary - sát mốc năm", "Kiểm tra hiển thị khi 2.99 năm (làm tròn xuống)",
    "Record manufacture_date cách đây 2.99 năm", "1. Quan sát cột 経過年数", "1. Hiển thị 2年 (làm tròn xuống)")
add("usage_purpose (用途)", "Display - rỗng", "Kiểm tra hiển thị khi usage_purpose rỗng",
    "Record có usage_purpose rỗng", "1. Quan sát cột 用途", "1. Hiển thị rỗng/- (không có giá trị)")

# UI bổ sung — hover/disabled/empty states
ui_state = [
    ("search_btn (検索する)", "Trạng thái disabled", "Kiểm tra style nút search khi disabled (sau search no-result)", "1. Quan sát nút 検索する khi disabled", "Nút search hiển thị trạng thái disabled khớp Figma"),
    ("search_btn (検索する)", "Trạng thái hover", "Kiểm tra style nút search khi hover", "1. Di chuột qua nút 検索する", "Nút search đổi trạng thái hover khớp Figma"),
    ("to_manufacture_date (製造年期間指定to)", "Trạng thái disabled", "Kiểm tra style field to khi disabled", "1. Quan sát field 製造年期間指定(to) khi disabled", "Field hiển thị trạng thái disabled khớp Figma"),
    ("to_recommended_replacement_years (更新予定年月to)", "Trạng thái disabled", "Kiểm tra style field to khi disabled", "1. Quan sát field 更新予定年月（to）khi disabled", "Field hiển thị trạng thái disabled khớp Figma"),
    ("Empty state (E-MSG-007)", "Style", "Kiểm tra style khu vực không có kết quả", "1. Quan sát khu vực bảng khi không có data (E-MSG-007)", "Hiển thị message E-MSG-007 căn giữa khớp Figma"),
    ("Loading state", "Style", "Kiểm tra style animation loading", "1. Quan sát animation loading khu vực table", "Animation loading hiển thị khớp Figma"),
    ("textlink (設備ID, 設備マスタ名称)", "Trạng thái hover", "Kiểm tra hover textlink trong row", "1. Di chuột qua textlink 設備ID / 設備マスタ名称", "Textlink đổi màu/underline khi hover khớp Figma"),
    ("Table - scroll ngang", "Layout", "Kiểm tra scroll ngang khi bật nhiều cột", "1. Bật nhiều cột vượt chiều rộng\n2. Quan sát scroll", "Bảng cho scroll ngang, cột 設備ID cố định (fixed) khớp Figma"),
    ("Responsive", "Layout", "Kiểm tra layout khi thu nhỏ cửa sổ trình duyệt", "1. Thu nhỏ cửa sổ trình duyệt", "Layout không vỡ, các phần tử co giãn hợp lý khớp Figma"),
    ("Tag đã chọn (combobox)", "Style", "Kiểm tra style tag item đã chọn trong combobox", "1. Chọn vài item, quan sát các tag", "Tag đã chọn hiển thị (màu nền, nút xóa) khớp Figma"),
]
for co1, co2, content, step, exp in ui_state:
    add(co1, co2, content, "Đã login", "1. " + step.split(". ", 1)[-1] if step.startswith("1.") else "1. " + step, "1. " + exp)

# Inline-search SQL ORDER verification (decision/spec) per combobox
order_specs = [
    ("equipment_code_condition (保安設備ID)", "ORDER BY e.id ASC"),
    ("engineer_condition (担当技術者)", "ORDER BY e.id ASC (engineer_profile.name partial match)"),
    ("site_condition (事業場名)", "ORDER BY id ASC"),
    ("client_condition (顧客名)", "ORDER BY id ASC"),
    ("safety_equipment_name_condition (機器名称)", "ORDER BY id ASC"),
    ("manufacturer_condition (製造者)", "ORDER BY id ASC"),
    ("equipment_master_type_condition (設備タイプ)", "ORDER BY display_order ASC, is_active=1"),
    ("model_number_condition (型式)", "ORDER BY id ASC"),
]
for co1, order in order_specs:
    add(co1, "Inline search - thứ tự", "Kiểm tra thứ tự kết quả dropdown đúng spec", "Có nhiều data khớp keyword",
        "1. Type keyword khớp nhiều record\n2. Quan sát thứ tự dropdown", "1. Kết quả dropdown sắp xếp theo " + order)

# ============================================================
out = "/home/hello/IdeaProjects/rezil-support/report/testcase/EQUIP-003 Equipment List-UT.csv"
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
    w.writerow(HEADER)
    for i, r in enumerate(rows, start=1):
        co1, co2, content, pre, steps, expected = r
        w.writerow([i, co1, co2, content, pre, steps, expected, "", "", "", "", "", ""])
print("TOTAL", len(rows))

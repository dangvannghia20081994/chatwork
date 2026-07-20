---
name: gen-code
description: Sinh code FE / BE / LIB cho dự án Rezil ESMS (web Admin + mobile) từ Basic Design hoặc từ mô tả tự do, theo đúng convention thật của các repo. Dùng khi người dùng muốn generate code cho 1 màn/endpoint/feature, hoặc gõ /gen-code.
---

# gen-code — Sinh code FE / BE / LIB theo convention Rezil ESMS

Mục tiêu: từ **spec màn hình** (Basic Design) hoặc **mô tả feature** → sinh code đúng layer, đúng
**variant (web vs mobile)**, đúng package & style của repo tương ứng, để dán/commit thẳng vào repo code.

> Skill này **không tự đọc Google Sheet Basic Design**. Có spec thì đọc lại file trung gian
> `report/design/<ScreenCode>.md` (do plugin `read-basic-design` sinh qua MCP), giống `gen-testcase`. Chỉ có
> mô tả tự do thì bỏ qua bước đọc design.

## Các repo & stack (đường dẫn mặc định dưới `~/IdeaProjects/`)

| Layer   | Web                                       | Mobile                     | Stack                                                                                                                                                                                           |
| ------- | ----------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FE**  | `rezil-esms/app`                          | `rezil-esms-mobile/app`    | Svelte 5 (runes). Web = **SvelteKit**; Mobile = **Vite + Capacitor/Ionic** (không SvelteKit). Cả hai gọi API qua **aspida** (`api.<resource>.<sub>.$get/$post/...`).                            |
| **BE**  | `rezil-esms/be-api`                       | `rezil-esms-mobile/be-api` | **Scala 3.3.5 + Play**. 1 controller class / 1 endpoint. JSON = **Circe** + `ixias.core.util.JsonDecoder`. `JsonSuccess/request.decode/BaseAbstractController` từ **ixias** (`ixias.web.play`). |
| **LIB** | `rezil-esms-lib` (`framework/rezil-esms`) | (dùng chung)               | **Scala 3.3.1 + Ixias (`net.ixias`) + Slick**, publish `jp.co.rezil %% rezil-esms`. Domain model + repository sống ở đây, **cả 2 BE đều phụ thuộc**.                                            |

Còn có `rezil-esms-portal` (cùng khuôn web). Nếu repo không nằm đúng path trên → hỏi người dùng path thật.

## Bước 1 — Xác định đầu vào

Hỏi/làm rõ (đừng đoán nếu mơ hồ):

1. **Layer**: `FE` | `BE` | `LIB` (cho phép nhiều — vd "BE + FE cho EQUIP-004").
2. **Nếu có FE → chế độ FE**: **mockup** (dựng UI + state + validation với data giả, chưa gọi API — pha song song LIB ở bước 1 của pipeline) hay **integrate** (thay mock bằng aspida client thật — pha cuối, cần BE+OpenAPI đã xong)? Nếu chưa rõ thì hỏi. Mặc định khi làm cả pipeline: FE bắt đầu ở **mockup**, integrate sau.
3. **Variant**: **web (Admin)** hay **mobile**? — quyết định repo & convention; nếu chưa rõ thì hỏi.
4. **Nguồn spec**:
   - **Ưu tiên Basic Design**: người dùng đưa mã màn (vd `EQUIP-004 Edit Equipment`)
     → cần `report/design/<ScreenCode>.md`. ⚠️ File này thường nằm ở repo `rezil-support`, còn gen-code chạy ở
       repo code đích (xem Bước 2) → người dùng đưa **đường dẫn tuyệt đối** tới file design, hoặc copy vào cwd.
       **Thiếu/không tới được → gọi skill `/read-basic-design`** cho màn đó (nó đọc tab Basic Design qua MCP và ghi file).
       (gen-code không tự định vị plugin khác bằng path; gọi skill là chắc nhất.)
   - **Fallback mô tả tự do**: không có Basic Design thì người dùng mô tả resource/field/action/validation, sinh thẳng.
5. **Phạm vi**: endpoint/màn/model nào; tạo mới hay sửa file sẵn có.

## Bước 2 — Đọc spec & **luôn dò convention thật trong repo trước khi sinh**

- Có Basic Design: đọc `report/design/<ScreenCode>.md` — field ở `3. Screen Items` (Spec-ID, Data Type,
  Required, Value, Description), DB ở `4. Database`, event/flow/validation/error (`E-MSG-xxx`) ở `5. 処理`,
  Figma/COMMON ở `1. Interface`. Cần nội dung error chính xác → xem section 5 trong file design (hoặc gọi lại `/read-basic-design`).
- **Bắt buộc mở 1–2 file cùng loại gần nhất trong repo đích để bắt chước** (naming, import, style). Đừng
  hardcode theo trí nhớ — convention dưới đây là điểm khởi đầu, file thật là chuẩn cuối.
- ⛔ Nếu cwd **không phải** repo code (vd đang ở `rezil-support`) → báo người dùng `cd` sang repo đích
  (theo bảng trên) rồi chạy lại, hoặc xác nhận chỉ sinh "mẫu tham khảo".

## Bước 3 — Thứ tự sinh: LIB ‖ FE-mockup → BE → OpenAPI/aspida → Integrate

Khi sinh nhiều layer cho cùng 1 feature, theo đúng pipeline dưới (khớp `## Follow` trong CLAUDE.md).
**FE chia 2 pha**: dựng *mockup* sớm (song song LIB), rồi *integrate* API thật ở cuối.

1. **LIB ‖ FE (mockup)** — chạy **song song**:
   - **LIB**: domain model + Slick table + repository (`rezil-esms-lib`). Đây là cái BE sẽ inject. (Bỏ qua nếu đã có — kiểm tra trước.)
   - **FE mockup**: dựng UI + state + validation theo Screen Items, **dùng data giả** (hằng số / mock store), **chưa gọi API thật**. Đánh dấu rõ chỗ sẽ thay bằng aspida (vd `// TODO: thay bằng api.<resource>...`).
2. **BE** — controller + DTO (`reads/writes`) + `conf/routes` + `messages.ja`, dùng repo/model từ LIB ở bước 1.
   Đây là nơi **chốt hợp đồng API** (path, method, request/response shape). Cần LIB xong trước.
3. **OpenAPI & build aspida** — cập nhật spec `rezil-esms/etc/openapi/openapi.yaml` (và spec mobile tương ứng) cho
   endpoint vừa tạo ở bước 2 cho **khớp đúng request/response BE**, rồi **regenerate client**
   (`etc/openapi/build.sh` → `openapi2aspida` → `app/src/lib/api/defs/`). Cần BE xong trước.
4. **Integrate API BE↔FE** — quay lại FE mockup ở bước 1, **thay data giả bằng aspida client vừa build** ở bước 3
   (`await api.<resource>...`), nối loading/error/validation vào response thật. Pha cuối cùng.

> Nếu LIB cần `sbt publishLocal` để BE thấy artifact mới, nhắc người dùng chạy (skill không tự publish trừ khi được yêu cầu).
> Yêu cầu 1 layer lẻ (vd "chỉ FE mockup") → làm layer đó, nêu rõ phụ thuộc còn thiếu (endpoint/aspida path chưa có nên FE vẫn ở dạng mockup).

## Bước 4 — Sinh code theo layer + variant (chi tiết convention từng layer)

### 1️⃣ LIB — Scala 3.3.1 + Ixias (`net.ixias %% ixias`) + Slick (`rezil-esms-lib/framework/rezil-esms`)

Package `rezil.esms.<domain>.{model|persistence|persistence.table|util}`; domain: `common`, `udb`,
`workplace`, `equipment`, `inspection`, `customer`, `preference`, `util`. JSON ở LIB = **Circe**.
(File có header copyright Rezil; giữ header khi tạo file mới.)

- **Model** `…/<domain>/model/<Entity>.scala` — `case class … extends EntityModel[Id]`, companion với typedef + `object Id` + enum (nếu có), import `ixias.core.model.*` (`Now` đến từ đây):
  ```scala
  import ixias.core.model.*
  import Equipment.*
  case class Equipment(
    id:        Option[Id],
    siteId:    Site.Id,
    code:      String,
    name:      Option[String]        = None,   // nullable = Option[...]
    status:    Status                = Status.IS_ACTIVE,
    updatedAt: LocalDateTime         = Now,
    createdAt: LocalDateTime         = Now
  ) extends EntityModel[Id]

  object Equipment extends EquipmentSearchCriteria:   // (extends <Entity>SearchCriteria nếu có search)
    type Id         = Id.Repr
    type WithNoId   = Entity.WithNoId[Id, Equipment]
    type EmbeddedId = Entity.EmbeddedId[Id, Equipment]
    object Id extends Entity.Id[Long]
    enum Status(val code: Short) extends EnumStatus[Short]:
      case IS_ACTIVE extends Status(code = 1)
    enum SortKey(val code: String) extends EnumStatus[String]: case IS_UPDATED_AT extends SortKey("updatedAt")

  // SearchCriteria thường là 1 trait riêng cùng file, companion extends nó; Decoder = deriveDecoder.
  ```
- **Slick Table** `…/persistence/table/<Entity>.scala`:
  ```scala
  abstract class EquipmentTable[P <: JdbcProfile](using val driver: P) extends SlickTable[Equipment, P]:
    import api.*
    val ds = Map(
      HOSTSPEC_PRIMARY -> DataSource("rezil.db.mysql://primary/rezil_esms"),
      HOSTSPEC_REPLICA -> DataSource("rezil.db.mysql://replica/rezil_esms"))
    val query = TableQuery[Table]
    private val schemaName = ConfigFactory.load().getString("rezil.db.mysql.rezil_esms.schema")
    case class Table(tag: Tag) extends BasicTable(tag, Some(schemaName), "equipment"):
      def id   = column[Id]    ("id",   O.UInt64, O.PrimaryKey, O.AutoInc)
      def code = column[String]("code", O.AsciiChar255)
      // ... cột khác (O.Utf8Char255 / O.Date / O.Int16 / O.TsCurrent ...), index = index("idx_x", col)
      def * = (id.?, code, /*...*/) <> (
        Equipment.apply.tupled,
        Tuple.fromProductTyped[Equipment].andThen(_.copy(_N = Now)))   // _N = vị trí updatedAt
  ```
- **Repository** `…/persistence/<Entity>.scala` — `open case class …Repository[P <: JdbcProfile]()(using val driver: P, ec: ExecutionContext) extends SlickRepository[<Entity>.Id, <Entity>, P] with TableProvider[P]`. Read dùng `RunDBAction(<Entity>Table, HOSTSPEC_REPLICA)`, write dùng `RunDBAction(<Entity>Table)`:
  ```scala
  def get(id: Id): Future[Option[EntityEmbeddedId]] =
    RunDBAction(EquipmentTable, HOSTSPEC_REPLICA): slick =>
      slick.filter(_.id === id).filter(_.deletedAt.isEmpty).result.headOption
  def add(data: EntityWithNoId): Future[Id] =
    RunDBAction(EquipmentTable): slick => slick.returning(slick.map(_.id)) += data.v
  ```
- **Đăng ký**: table vào `…/persistence/table/package.scala` — `trait TableProvider[P <: JdbcProfile]: given driver: P; object <Entity>Table extends <Entity>Table(using driver)`. Repository vào `…/persistence/package.scala` — `@Singleton case class <Domain>Repositories @Inject() (driver: JdbcProfile, ec: ExecutionContext): given JdbcProfile = driver; given ExecutionContext = ec; object <Entity>Repository extends <Entity>Repository`.
- **Util/mapper** `…/util/<Name>.scala`: trait/object stateless dùng lại (vd `CodeGeneratorBase`).
- **Đặt ở LIB khi**: dùng lại bởi >1 BE (web/mobile/portal): domain model, repository, table, enum, SearchCriteria, util/mapper. **Để ở be-api khi**: controller/endpoint, DTO API-specific, orchestration, filter/permission Play.
- Xong LIB: nếu BE cần artifact mới → người dùng `sbt publishLocal` ở `rezil-esms-lib` (skill không tự publish trừ khi được yêu cầu).

### 2️⃣ BE — Scala 3 + Play (`rezil-esms/be-api`, `rezil-esms-mobile/be-api`)

Scala **3.3.5** + Play, JSON = **Circe** + `ixias.core.util.JsonDecoder`. `JsonSuccess`/`JsonFailure`/
`request.decode`/`BaseAbstractController` đều **từ thư viện ixias** (`ixias.web.play.*`), không tự định nghĩa.
`BaseControllerComponents` là type alias `ixias.web.play.BaseControllerComponents`. Cả 2 BE depend `jp.co.rezil %% rezil-esms`.
Một **endpoint = một controller class** `{Verb}{Entity}Controller`. Cú pháp web & mobile **giống hệt** trừ phần auth/permission + message scheme (xem cuối).

- **Controller** `app/controllers/api/<domain>/<Verb><Entity>.scala` — `@Inject()` (hoặc `@javax.inject.Inject()`), `extends BaseAbstractController(cc):` (Scala 3 indentation, không braces):
  ```scala
  class CreateEquipmentController @Inject() (
    cc:             BaseControllerComponents,
    equipmentRepos: EquipmentRepositories,   // repo từ LIB
    authAction:     AuthenticatedAction      // web: dùng PermissionBasedAction thay vào (xem dưới)
  )(using ec: ExecutionContext) extends BaseAbstractController(cc):

    def create = authAction.async: request =>
      implicit val messages: Messages        = messagesApi.preferred(request)
      val currentUser:       User.EmbeddedId = request.attrs(mvc.AttrKey.AuthUserKey)
      EitherT
        .fromEither[Future](request.decode[JsValueCreateEquipment])   // request.decode -> Either[Result, T]
        .semiflatMap: form =>
          equipmentRepos.EquipmentRepository.add(form.create(currentUser.id))
        .map: id =>
          JsonSuccess(messages("data.created")).withData(CreateEquipmentResponse(id.value)).build
        .value
        .map(_.merge)
  ```
  - `.build` ở cuối tạo `Result` (dùng trong EitherT). Khi gọi thẳng trong `Future.map` thì có thể `JsonSuccess(...).withData(...)` **không cần `.build`** (xem GetEquipment). Lỗi: `JsonFailure.notFound(messages("data.notfound"))` / `JsonFailure.badRequest(messages("E-MSG-014")).build`.
  - Phân tầng: Controller → (Service nếu logic phức tạp) → Repository (LIB) → Model (LIB).
  - **Service** (web: `app/controllers/services/<Entity>Service.scala`; mobile: `app/services/`): `@Inject()`, trả `Future[T]`, for-comprehension; batch load tránh N+1.
- **Request DTO** `app/model/reads/<domain>/<Entity>.scala`: `case class JsValue<Entity>(...)` + companion `extends JsonDecoder` với `given Decoder[...] = deriveDecoder` (đơn giản) **hoặc** `Decoder.instance { c => for { x <- c.downField("..").as[..] } yield ... }` (parse thủ công khi field phức tạp/đổi tên). Nullable = `Option[T]`. Thường có factory `.create(userId): <Entity>.WithNoId` (gọi `.toWithNoId`).
- **Response DTO** `app/model/writes/<domain>/<Entity>Response.scala`: `case class <Entity>Response(...)` + companion `given Encoder[...] = deriveEncoder`. Wrapper chung ở `model/writes/Api.scala` (`ApiSimpleResponse`/`ApiPagedResponse`/`ApiError`; encoder `.mapJsonObject(_.add("error", Json.fromBoolean(...)))`).
- **routes** `conf/routes`: `METHOD /path controllers.api.<domain>.<Verb><Entity>Controller.<action>(...)`. Id thường truyền dạng **`Box[<Entity>.Id]`** (vd `GET /equipment/$id<[0-9]+> ...Get...get(id: Box[Equipment.Id])`); một số nơi `id: Long` rồi `<Entity>.Id(id)` trong controller. Path verb riêng (`/equipment/create`, `/equipment/$id<[0-9]+>/remove`).
- **Error/message** `conf/messages.ja`: gọi `messages("...")`. Key generic dùng chung (`data.created/updated/deleted/fetched/notfound`, `error`). **Web** dùng code **`E-MSG-nnn`** + domain key (`EQUIP-002-001`); **mobile** dùng **`E-MOB-xxx-yyy`** cho lỗi đặc thù mobile (vd GPS). Tham số `{0}`,`{1}`.
- **Web ≠ mobile (chỉ khác ở đây, còn lại y hệt)**:
  - **Web có permission**: thay `authAction` bằng `permissionAction: PermissionBasedAction`, action mở đầu `permissionAction.andThen(permissionAction.apply(Seq(PermissionMode.IS_EDIT.code), SCREENS_LIST.<SCREEN>.code)).async: request =>` (hoặc `.applyAny(...)`). Sinh kèm khi spec nói quyền. **Mobile KHÔNG check permission** — chỉ `authAction.async` (`AuthenticatedAction` verbatim giống web).
  - **Mobile**: message `E-MOB-xxx`; có **endpoint `/.../offline`** dồn batch query (`.zip` nhiều repo + groupBy map) trả nguyên cụm cho client sync; token xoay vòng khi refresh. Chỉ sinh offline khi spec yêu cầu.

### 3️⃣ OpenAPI — chốt hợp đồng & regenerate aspida client

Sau khi BE đã có endpoint, **cập nhật spec OpenAPI cho khớp** rồi sinh lại client để FE dùng:

- **Web**: spec `rezil-esms/etc/openapi/openapi.yaml`. Thêm/sửa `paths`, `requestBody`, `responses`, `components/schemas`
  cho đúng request/response BE vừa tạo (kiểu, required). Regenerate bằng `rezil-esms/etc/openapi/build.sh`:
  `redocly bundle openapi.yaml -o .openapi.yaml` → `npx openapi2aspida -i .openapi.yaml -o ../../app/src/lib/api/defs`
  → sinh `app/src/lib/api/defs/$api.ts` + thư mục theo path. FE import từ đây.
- **Mobile**: `rezil-esms-mobile/app/src/lib/api/defs/` cũng là aspida (`$api.ts`) nhưng repo mobile **không có build script lộ ra** —
  defs được generate ngoài (CI/từ spec BE) rồi commit. Nếu cần endpoint mới cho mobile mà defs chưa có → báo người dùng cách team regenerate, đừng sửa tay `defs/`.
- Quy ước: spec/defs là **nguồn sự thật của hợp đồng API**; FE không tự định nghĩa shape. Chưa chắc kiểu/field → lấy từ DTO BE ở bước 2, đừng đoán.

### FE — Svelte + aspida (mockup ở bước 1, integrate ở bước 4)

Svelte 5 (runes) cả 2. Cùng convention dưới đây cho cả pha **mockup** (data giả) lẫn **integrate**; chỉ khác nguồn dữ liệu:
- **Mockup (bước 1)**: dựng đủ UI + state + validation, dữ liệu lấy từ mock/hằng số; đánh dấu `// TODO: aspida` ở chỗ sẽ gọi API.
- **Integrate (bước 4)**: thay mock bằng **aspida client đã generate** (`src/lib/api/defs/`). Aspida chưa có endpoint → quay lại bước 2/3 (BE + OpenAPI + regenerate); **không viết fetch tay**, để FE ở dạng mockup tới khi có client.

⚠️ Web và mobile khác nhau ở **alias import** và **cách đọc response** — bám đúng repo:

- **Web (`rezil-esms/app`, SvelteKit)** — feature ở `src/lib/modules/<feature>/`:
  - `import api from '$lib/api'`. Gọi: `await api.equipments.post({ body })`, `await api.equipment._id(Number(id)).$get()`.
    **Đọc response qua `.body`**: `const rows = response.body?.rows`.
  - Cấu trúc: `pages/<Feature>{List,Create,Edit,Detail}Page.svelte`, `components/<Feature>Form.svelte`, `FilterForm.svelte`, `schemas/*.ts` (Yup), `types/index.ts`, `stores/list.store.ts`, `logics/useListLogic.ts`.
  - Route: `src/routes/(admin)/admin/<feature>/+page.svelte` + `+page.ts` (`export const load = () => ({ title: '…' })`); title đặt qua `+page.ts` **và** `<svelte:head><title>{t('…')}</title>`.
  - Form: **custom** `useForm<T>({ initialValues, validationSchema, onSubmit })` import từ `$lib/components/molecules/forms/useForm.svelte.ts` (**không phải Felte**); trả `{ formAction, data, errors, touched, isValid, isSubmitting, isDirty, setFields, setErrors, validate, reset }`. Template bọc `<FormProvider data={$formData} errors={$errors} … form={formAction} …>`; store unwrap bằng `$` (`$formData`, `$errors`).
  - State local: runes `$state/$derived/$effect`. Global: store (`snackbar`, `permission.store`, `master-data.store`). Báo lỗi/thành công qua `snackbar.error/success(...)`, điều hướng `goto(PATHS...)`.
- **Mobile (`rezil-esms-mobile/app`, Vite+Capacitor/Ionic, KHÔNG SvelteKit)** — feature ở `src/features/<feature>/`:
  - `import api from '@lib/api'` (**alias `@lib`**, không phải `$lib`). Gọi: `await api.equipment.search.$post({ body })` (có `$`).
    **Đọc response qua `.data`** (lưu ý **2 tầng**): `const payload = response?.data; const rows = payload?.data ?? []; const total = payload?.total ?? 0`.
  - Cấu trúc: `pages/<Feature>{List,Detail,Create,Edit}.svelte`, `components/`, `logics/use<Feature>List.svelte.ts` (hook runes: `let x = $state(...)`, trả object **getter** `get listData(){…}` + actions), `stores/<feature>.store.ts` (gọi aspida), `schemas/<feature>.schemas.ts` (Yup), `types/index.ts`.
  - **Routing = IonNav qua `src/lib/nav.ts`** (không file-based): trong `namespace Nav` thêm `export const gotoX = () => closeModalsAndNavigate(() => getRoot().push(Nav.createPage(X_PAGE, { .. })))`; màn root đặt qua `getRoot().setRoot(...)`.
  - UI dùng `ion-*` (`ion-content`, `ion-input`, `ion-label`, `ion-button`, `ion-spinner`…); event Ionic `onionInput/onionChange/onionBlur`. Form: **cùng custom `useForm`** import từ `@lib/components/forms` (giống web, chỉ khác alias), `FormField/FormProvider` ở `@lib/components/forms`.
  - **Offline/SQLite**: phần lớn màn gọi API trực tiếp; nếu spec yêu cầu offline → thêm `features/<feature>/offline/` (`fetchData`/`saveData` + đăng ký `syncExecutor`). Không tự ý thêm nếu không có yêu cầu.
- **i18n cả 2**: `svelte-i18n` bọc bởi hàm `t` (web: `$lib/i18n`, mobile: `@lib/i18n`), dùng `t('KEY')` / `t('KEY', { values: { name } })` (**có wrapper `values:`**), key trong `src/lib/i18n/locales/ja/*.yaml`. Validation/error theo message id: **web `VALIDATION_MSG.E-MSG-xxx`**, **mobile cũng `E-MSG-xxx`/`E-MOB-xxx`** tùy key có sẵn — lấy đúng id từ spec, đừng tự chế.

## Bước 5 — Xuất & bàn giao

- **Ghi đúng vị trí package/đường dẫn** trong repo đích (không gom 1 chỗ tạm). Sửa file sẵn có (thêm route,
  thêm `gotoX` vào `nav.ts`, thêm key i18n) → dùng **Edit** chèn đúng chỗ, giữ nguyên phần còn lại.
- Liệt kê file đã tạo/sửa + 1 dòng mô tả mỗi file.
- Nêu rõ phần nào suy từ Basic Design vs phần **giả định cần xác nhận** (tên bảng/cột DB, tên endpoint/aspida path,
  message id chưa chắc, có cần permission/offline không).
- Gợi ý kiểm: FE web `npm run` regenerate aspida nếu thêm endpoint; BE/LIB `sbt compile`/test.

## Quy tắc đã chốt

- **1 skill chung**, chọn **layer `FE|BE|LIB` + variant `web|mobile`** khi chạy (cho nhiều layer cùng lúc).
- 🔢 **Thứ tự sinh khi nhiều layer (khớp `## Follow` của CLAUDE.md): LIB ‖ FE-mockup → BE → OpenAPI/aspida → Integrate.** FE chia 2 pha: *mockup* (data giả, song song LIB) rồi *integrate* (ghép aspida client thật ở cuối). BE cần LIB xong; OpenAPI cần BE xong; Integrate cần aspida xong. Yêu cầu 1 layer lẻ thì làm layer đó nhưng nêu rõ phụ thuộc còn thiếu.
- **Ưu tiên Basic Design** (`report/design/<ScreenCode>.md`; thiếu → `/read-basic-design`); **fallback** mô tả tự do. Không tự đọc Google Sheet.
- **Luôn dò file cùng loại trong repo đích trước khi sinh**; convention trong skill là khởi điểm, code thật là chuẩn cuối.
- **FE gọi API qua aspida client đã generate** (`src/lib/api/defs/`), không viết fetch tay. **Web: `import api from '$lib/api'`, đọc `response.body`; Mobile: `import api from '@lib/api'`, gọi `.$post(...)`, đọc `response.data` (2 tầng `payload.data`/`payload.total`).** Form 2 nền dùng **custom `useForm`** (KHÔNG phải Felte) + Yup. Thiếu endpoint → báo bổ sung OpenAPI + regenerate.
- **BE**: Scala 3.3.5 + Play, 1 controller/endpoint (`{Verb}{Entity}Controller`), `extends BaseAbstractController(cc):`; `JsonSuccess/JsonFailure/request.decode` là **của ixias**; Circe DTO ở `model/reads|writes` (`deriveDecoder/deriveEncoder` hoặc `Decoder.instance`); `EitherT`+`request.decode`+`JsonSuccess(...).withData(...).build`+`.value.map(_.merge)`; route id thường `Box[<Entity>.Id]`; `conf/routes` + `conf/messages.ja`. **Web `E-MSG-nnn` + permission (`permissionAction.andThen(permissionAction.apply(Seq(PermissionMode.X.code), SCREENS_LIST.Y.code))`); mobile `E-MOB-xxx`, chỉ `authAction`, có thể có `/offline`.**
- **Domain model & repository đặt ở LIB** (Scala 3.3.1 + Ixias `net.ixias`/Slick, `rezil.esms.<domain>.{model|persistence|persistence.table}`): model `extends EntityModel[Id]`, table `extends SlickTable` đăng ký `TableProvider` (`table/package.scala`), repo `extends SlickRepository … with TableProvider` đăng ký `@Singleton <Domain>Repositories @Inject()` (`persistence/package.scala`), `RunDBAction(Table, HOSTSPEC_REPLICA)` cho read / `RunDBAction(Table)` cho write. Không nhét vào be-api; chỉ phần dùng lại mới vào LIB.
- **Web ≠ mobile**: web=SvelteKit + `$lib` + `src/lib/modules` + route file-based + permission + `response.body`; mobile=Vite/Capacitor-Ionic + `@lib` + `src/features` + IonNav (`nav.ts`) + `ion-*` + offline/SQLite + `response.data`. BE thì cú pháp giống nhau, chỉ khác auth (permission vs authAction) + message scheme. Sinh theo đúng variant.
- ⚖️ **COMMON**: spec ghi "Tham khảo/Refer COMMON-xxx" → component/module chung đã có sẵn trong repo, **chỉ import/gọi/tái dùng, không sinh lại**. NHƯNG phần **cấu hình đặc thù màn** vẫn phải code (vd `default_view_config`: cột + thứ tự riêng của màn, screen_name, cột export). Dò file COMMON thật trong repo để gọi đúng API/props.
- Validation/error map 1-1 với spec theo message id (web `E-MSG-xxx`, mobile `E-MSG`/`E-MOB-xxx`); lấy đúng id từ spec, đừng tự chế.
- (Bổ sung dần khi người dùng góp ý.)

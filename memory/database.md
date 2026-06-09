# Database — rezil-esms

> MySQL 8.0, READ-ONLY by default when debugging. Two independent schemas.

## Schemas
- **`rezil_esms`** — core: users, sites, equipment, engineers, clients/contracts, RBAC.
- **`rezil_esms_inspection`** — inspections, plans, reports, issues, energy analytics.

## Migrations (Flyway)
- Location: `etc/database/<schema>/{common,env-<env>}/`. Tool: flyway-play + flyway-mysql.
- Naming: **`V<YYYYMMDDHHMMSS>__<desc>.sql`** (timestamp-based to avoid version collisions across branches). Legacy `V<YYYYMMDD>_<NN>__...` also present.
- Config in `be-api/conf/application.conf` (~L146): `outOfOrder=true`, `initOnMigrate=true`, locations `["common","env-<env>"]`.
- Run: `cd be-api && sbt migrateAll`. History in `flyway_schema_history` per schema.

## Access pattern (Scala)
- **Slick** ORM extended by **Ixias** (in-house framework, `ixias.db.slick.SlickTable` / `SlickRepository`).
- Repos & tables live in the shared lib: `rezil-esms-lib/framework/rezil-esms/src/main/scala/rezil/esms/<domain>/persistence/`.
- Repo methods: `get(id)`, `findByUUID`, `filterByIds`, etc. Master/replica aware — read-heavy queries pass `HOSTSPEC_REPLICA`.
- DI binding: `be-api/app/modules/DatabaseModule.scala` (binds `JdbcProfile` → Ixias MySQL profile).

## Connection / pool
- HikariCP (Play default): maxPool 10, minIdle 2, idleTimeout 30s, maxLifetime 15min.
- Ixias multi-host config under `rezil.db.mysql.*` (master/replica per schema). Timezone `Asia/Tokyo`.

## Key tables
**Core**: `user` (uuid, JWT subject, state ENUM), `site` (code, geo, capacities, inspection dates), `equipment` (UNIQUE code) + `equipment_master*` + `equipment_attribute_value` (EAV), `engineer`/`engineer_cert`, `client`/`contract`/`site_contract`, `permission`/`user_group`/`group_permission` (RBAC), `customer_account`, `entity_change_history` (audit).
**Inspection**: `inspection` (meter kWh, power factor), `plan` (schedule, state ENUM 1→13, idx (state,work_start)), `plan_assignment`, `report` (approval chain, current_step), `issue`/`issue_revision`/`issue_template`, `report_signature`/`report_workflow`, `inspection_equipment_*`, `insulation_monitoring_device`.

## Gotchas
- **Loose referential integrity**: only ~1 explicit FK (`customer_account → client`). FK/cascade enforced in app code, NOT the DB → coordinate deletes in application logic.
- **ENUMs stored as TINYINT/SMALLINT** (e.g. user state -1/1; plan state 1,10,11,12,13,20 — ordinal, validate order).
- EAV via `equipment_attribute_value` UNIQUE(equipment_id, type_attribute_id).
- Decimals: capacity DECIMAL(10,2) kW, energy DECIMAL(18,4), GPS DECIMAL(10,8)/(11,8).
- Dates: install/manufacture = DATE; work/inspection/approval = DATETIME (Asia/Tokyo).
- Multi-tenant is implicit via `site_id`/`client_id` (no explicit tenant_id).
- Most tables have `created_at`/`updated_at` (ON UPDATE CURRENT_TIMESTAMP).

## Refs
- `etc/database/MIGRATIONS.md` — migration policy
- DB MCP: `mysql_207` (MVP1), `mysql_165` (PreUAT MVP2-A)

# Common Bugs

> Recurring issues and their fixes, for faster diagnosis. Seeded from git history — extend over time.

| Symptom | Root cause | Fix | Ticket |
|---|---|---|---|
| Admin shows 500 right after a rebuild/deploy | Service worker serving stale `version.json` (cache-first) | Make `version.json` **network-first** in the service worker | REZIL-2172 |
| List / dropdown loads very slowly (e.g. equipment on ISSUE-001) | Missing composite index for the search/sort columns | Add composite index matching the query (`usage_purpose`, `created_at`, etc.) | REZIL-2312, REZIL-2298, REZIL-2178, REZIL-1880 |
| Change/edit not recorded in history, or blank↔null logged as a change | `diffFields` not normalizing empty values; cascade on init wiping dependent fields | Normalize blank values in `diffFields`; guard category cascade on init | REZIL-2303 |
| Equipment edit not saved to history when changing master type | History capture skipped on master-type change path | Persist history on equipment master-type change | REZIL-2150 |
| File delete/upload still bumps `updated_at` unexpectedly | `updated_at` written on file-only operations | Skip `updated_at` on delete/upload-only file ops | REZIL-2128 |
| Date picker shows "required" validation incorrectly | Form datepicker required-validation logic wrong | Fix required validation on form datepicker | REZIL-2156 |
| Phone number saved in wrong format | Phone not normalized before save | Normalize phone format on save | REZIL-2130 |
| Engineer/permission list returns wrong rows or 403 | Permission check on list endpoint incorrect | Fix permission check on engineer list | REZIL-2109, REZIL-2174 |
| API 400/parse error on call | Wrong parameter type sent to API | Fix parameter type when calling the API | REZIL-2313 |
| Soft-deleted customer account still appears | Query not filtering soft-deleted rows | Filter `customer_account` soft-deleted state | REZIL-2311 |

## Patterns to watch
- **Slow list/search → almost always a missing/incorrect index** (DB has loose FK & few indexes by default). Check `EXPLAIN` and add a composite index matching the WHERE+ORDER BY.
- **History/audit gaps** — verify `entity_change_history` is written on every mutation path, and blanks are normalized (null vs empty) before diffing.
- **Cache/service-worker staleness** after deploy — prefer network-first for version metadata.

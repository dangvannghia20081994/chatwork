# Jira History

> Log of handled tickets for context and traceability. Seeded from recent git history — append new rows as tickets are completed.

| Ticket     | Summary                                                                   | Screen    | Branch                                 | PR                                                                 | Status |
|------------|---------------------------------------------------------------------------|-----------|----------------------------------------|--------------------------------------------------------------------|--------|
| REZIL-2297 | Update filter label + conditional 低圧回路 option                             | EQUIP-003 | fix/2026-06-REZIL-2297-equip003-filter | [#1269](https://github.com/hybrid-tech-rezil/rezil-esms/pull/1269) | Done   |
| REZIL-2299 | Update logic get enum + level name, add join/column data                  | —         | fix/2026-06-REZIL-2299                 | —                                                                  | Done   |
| REZIL-2298 | Add composite index in equipment                                          | —         | fix/2026-06-REZIL-2298                 | —                                                                  | Done   |
| REZIL-2312 | Fix dropdown equipment loading very slow                                  | ISSUE-001 | fix/2026-06-REZIL-2312                 | —                                                                  | Done   |
| REZIL-2311 | Check customer account soft-deleted                                       | —         | fix/2026-06-REZIL-2311                 | —                                                                  | Done   |
| REZIL-2303 | Normalize diffFields blanks; guard category cascade; gallery after delete | —         | fix/2026-06-REZIL-2303                 | —                                                                  | Done   |
| REZIL-2172 | Fix admin 500 after rebuild (version.json network-first in SW)            | —         | fix/2026-05-REZIL-2172                 | —                                                                  | Done   |
| REZIL-2150 | Save history when changing equipment master type                          | —         | fix/2026-05-REZIL-2150                 | —                                                                  | Done   |
| REZIL-2156 | Fix datepicker required validation                                        | —         | fix/2026-05-REZIL-2156                 | —                                                                  | Done   |
| REZIL-2128 | Don't bump updated_at on file delete/upload                               | —         | fix/2026-05-REZIL-2128                 | —                                                                  | Done   |

## Notes
- PR numbers backfilled where known (REZIL-2297 → PR #1269). Fill the rest from `gh pr list` when needed.
- PR title convention: `[<phase>] <SCREEN-CODE> | REZIL-XXXX - <summary>` — phase `[PreUAT-MVP2-A]` for base `develop`, `[Sprint NN]` for `feature/mvp2-b`.
- Branch names reconstructed to the `fix/YYYY-MM-REZIL-XXXX-<desc>` convention; actual historical branches may differ.
- Status = Done for merged work. Update this table when you start/finish a ticket.

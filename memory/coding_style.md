# Coding Style — rezil-esms

General: keep changes small, reuse existing patterns, no unrelated refactor. Follow the team's
[Backend Pattern Guide] / [Frontend Pattern Guide] (linked in PR template).

## Backend (Scala 3.3.5 + Play)
- **Format**: scalafmt (`be-api/.scalafmt.conf`) — Scala 3 dialect, 200 cols, 2-space indent, `align=more`, trailing commas `preserve`.
- **Lint**: scalafix (`be-api/.scalafix.conf`) — **bans** `var`, `return`, `while`, `asInstanceOf`, XML literals, semicolons. Rules: DisableSyntax, NoValInForComprehension, RedundantSyntax, LeakingImplicitClassVal.
- **Patterns**: `case class` DTOs; Circe `deriveEncoder`; effects = `Future`; error handling via `cats.data.EitherT`; DI via Guice `@Inject()`.
- **Naming**: Controllers `*Controller`, services `*Service` (PascalCase). Models under `model/reads/` (request) & `model/writes/<domain>/` (response).
- **Check**: `sbt scalafmtCheckAll "scalafix --check"`. Fix: `sbt "scalafmtAll; scalafmtSbt; scalafixAll"`.

## Frontend (TS 5.9 + Svelte 5 + SvelteKit 2)
- TS **strict mode** (`app/tsconfig.json`), `checkJs: true`. Module resolution `bundler`.
- **No ESLint/Prettier** in repo — relies on SvelteKit defaults. Check: `npm run check` (svelte-check).
- Components: atomic design `src/lib/components/{atoms,molecules,organisms,layouts}/`, PascalCase files.
- Forms Felte+Yup; UI SMUI (Material beta); i18n svelte-i18n (Japanese). Path aliases `$styles`, `$assets`, `$stores`.

## Testing
- **Minimal automated tests** — no ScalaTest/vitest/playwright configured. QA is manual + PR checklist. Add tests where it makes sense but match existing (sparse) conventions.

## Commits & versions
- Commit format: **`REZIL-XXXX - <description>`** (no conventional-commits prefix).
  - Release-only exception (no ticket key): CHANGELOG commit on a release branch = **`chore: update CHANGELOG for X.Y.Z`**;
    version bump on `develop` = **`chore: bump version to X.Y.Z`**. Exact wording — history has older mixed styles
    (`docs(changelog): ...`, `Update changelog vX.Y.Z`, `Sync X.Y.Z`), do not copy them.
- Version source of truth: first `## X.Y.Z - YYYY-MM-DD` line in `CHANGELOG.md`.
- Releases are **tag-based** (no direct branch deploy): `dev1/v<X.Y.Z>`, `stg/v<X.Y.Z>`, `v<X.Y.Z>` (prod). See deployment.md.

## Quality / security gates (git hooks + PR)
- `hooks/pre-commit` → git-secrets (block credential leaks).
- `hooks/pre-push` → `sbt "scalafmtCheckAll; scalafmtSbtCheck; scalafixAll --check"`.
- PR gate → `./semgrep-rules/scan.sh` (35+ OWASP API Top 10 rules).
- Enable hooks: `git config core.hooksPath hooks`. Bypass push: `--no-verify` (avoid).

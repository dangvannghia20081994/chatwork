# Prompt: Review PR

## Goal
Review a PR for correctness and convention adherence. Flag issues — never merge.

## Input
- PR link / branch
- Repo

## Steps
1. Read the diff in full.
2. **Correctness**: logic, edge cases, null/empty handling, error paths, concurrency.
3. **Conventions**: follows Backend/Frontend Pattern Guide; matches surrounding code.
4. **Quality gates**: scalafmt/scalafix (BE) or `npm run check` (FE) would pass; semgrep clean.
5. **Scope**: no unrelated refactor; change is minimal.
6. **Tests**: adequate coverage for the change.
7. Post findings grouped by severity.

## Output
- **Blocking** issues / **Suggestions** / **Nits**
- Overall: approve-with-comments vs request-changes (advisory; human decides & merges)

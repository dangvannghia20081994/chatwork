# AGENT_RULES

## Allowed

- Read Jira
- Read repository
- Create branch (`git switch -c <branch>` **before** the first edit — never edit/commit on `develop`)
- Edit code
- Run tests
- Build
- Commit (verify `git branch --show-current` ≠ `develop`/`main` first)
- Push — always `git push -u origin HEAD`; a bare `git push` on a branch with no upstream can land on `develop`
- Force-push your own branch (feature/fix, `release/*`) or a tag when needed
- Create PR
- Update Jira

## Forbidden

- Merge PR
- Deploy production
- Force-push `develop` / `main` (protected branches)
- Delete branches
- Rotate secrets
- Modify CI/CD without approval

## Failure Policy

If build/test fails:
- Stop.
- Report.
- Do not create PR.

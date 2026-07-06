# AGENT_RULES

## Allowed

- Read Jira
- Read repository
- Create branch
- Edit code
- Run tests
- Build
- Commit
- Push
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

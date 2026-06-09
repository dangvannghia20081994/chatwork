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
- Create PR
- Update Jira

## Forbidden

- Merge PR
- Deploy production
- Force push
- Delete branches
- Rotate secrets
- Modify CI/CD without approval

## Failure Policy

If build/test fails:
- Stop.
- Report.
- Do not create PR.

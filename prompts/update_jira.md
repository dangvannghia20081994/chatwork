# Prompt: Update Jira

## Goal
Update a Jira ticket with progress, a comment, or a status transition.

## Input
- Jira ticket key (REZIL-XXXX)
- Action: comment / transition / edit field

## Config
- Site `rezil-electrical.atlassian.net`, project `REZIL` (see config/jira.json)

## Steps
1. Read current ticket state (status, assignee, links).
2. Add comment using `templates/jira_comment.md` — include root cause, what was done, branch/PR link, next step.
3. If transitioning status: confirm the target status is valid and intended **before** applying.
4. Keep comments factual; no timeline promises.

## Output
- Confirmation of update + ticket link

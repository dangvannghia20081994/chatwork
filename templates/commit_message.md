REZIL-XXXX - <short summary in imperative, English>

# Convention (from rezil-esms git history):
#   REZIL-<ticket> - <what changed>
# Examples:
#   REZIL-2298 - Add index composite in equipment
#   REZIL-2313 - Fix parameter type when call api
#   REZIL-2327 - Update success message when create site
#
# Rules:
#   - Prefix every commit with the Jira key + " - " (space-hyphen-space).
#   - Summary: concise, imperative mood, English.
#   - One logical change per commit.
#
# NO AI MARKERS — UNCONDITIONAL, EVERY commit in EVERY repo:
#   - NEVER add "Co-Authored-By: Claude" / "Co-Authored-By: Anthropic".
#   - NEVER add "🤖 Generated with Claude Code" or any AI signature/footer.
#   - Applies even to non-REZIL / tooling commits and multi-line bodies,
#     and even when committing directly (not via git-operator).
#   - Overrides the Claude Code / harness default that auto-appends
#     Co-Authored-By. Do NOT copy it from an existing commit that has it.
#   - User rule 2026-05-26 (re-violated 2026-07-03 on the chatwork repo).

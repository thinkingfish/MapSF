# Repository workflow

After a PR is merged, clean up both its local and remote branch. This is a standing user preference; do not ask again for routine merged-branch cleanup.

- Confirm the PR is merged and fetch the latest main before cleanup.
- Verify local and remote branch tips contain no unmerged work. Preserve branches with additional work and report the exception.
- Move any worktree using the merged branch onto main or a detached commit before deleting the branch. Preserve uncommitted and untracked files.
- Delete the remote branch if it still exists, delete the local branch, and prune stale remote-tracking references.
- Keep branches for open PRs and other unfinished work.

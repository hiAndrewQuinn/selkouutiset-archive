#!/bin/sh
# update.sh: point the site at the newest cleaned content, and push.
#
# Run periodically (after process.sh in selkouutiset-scrape-cleaned has pushed
# new content). Steps, each of which stops the run cleanly if it fails:
#   1. one run at a time (flock);
#   2. enough free space;
#   3. take in whatever GitHub's main has that this checkout lacks, e.g. a
#      merged PR, so the push below is not rejected (lib/git-sync.sh);
#   4. move the `content` submodule to the newest commit of its branch
#      (not recursive: content's own nested scrape submodule is never
#      checked out here);
#   5. if that moved the pointer, commit it and push (re-syncing and retrying
#      if GitHub moved meanwhile). GitHub Actions then builds and deploys.
#
# Safe to run by hand at any time, any number of times: with nothing new it
# changes nothing. POSIX sh.

set -u

REPO_DIR=$(cd "$(dirname "$0")/.." && pwd)
SUBMODULE_PATH="content"
GIT_REMOTE="${GIT_REMOTE:-origin}"
GIT_BRANCH="${GIT_BRANCH:-main}"
LOCK_FILE="${TMPDIR:-/tmp}/selkouutiset-archive-update.lock"
SCRIPT_NAME=$(basename "$0")
HOSTNAME=$(hostname -s 2>/dev/null || hostname 2>/dev/null || echo localhost)

log_message() {
  _ts=$(date '+%b %d %H:%M:%S')
  echo "$*" | while IFS= read -r _line; do
    printf '%s %s %s[%d]: %s\n' "$_ts" "$HOSTNAME" "$SCRIPT_NAME" "$$" "$_line"
  done
}

fail() {
  log_message "ERROR: $*"
  log_message "Script finished with an error."
  exit 1
}

log_message "Script started."
cd "$REPO_DIR" || fail "cannot cd to $REPO_DIR"

# 1. One run at a time.
command -v flock >/dev/null 2>&1 || fail "'flock' not found; cannot guarantee a single run."
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log_message "Another run holds '$LOCK_FILE'; exiting without doing anything."
  exit 0
fi

# 2 + 3. Room to work, and level with GitHub.
. "$REPO_DIR/lib/git-sync.sh" || fail "cannot load lib/git-sync.sh"
check_free_space || fail "not enough free space."
git_sync || fail "could not sync with $GIT_REMOTE/$GIT_BRANCH."

# 4. Newest content.
git submodule init "$SUBMODULE_PATH" >/dev/null || fail "git submodule init '$SUBMODULE_PATH' failed."
old=$(git ls-tree HEAD "$SUBMODULE_PATH" | awk '{ print $3 }')
git_net submodule update --remote "$SUBMODULE_PATH" || fail "could not update '$SUBMODULE_PATH' from its remote."
new=$(git -C "$SUBMODULE_PATH" rev-parse HEAD) || fail "cannot read '$SUBMODULE_PATH' HEAD."

if [ "$old" = "$new" ]; then
  log_message "'$SUBMODULE_PATH' is already at its newest commit ($new); nothing to do."
  # A pointer commit from an earlier run whose push failed is still only here.
  if [ -n "$(git rev-list "$GIT_REMOTE/$GIT_BRANCH..HEAD" 2>/dev/null)" ]; then
    log_message "Local commits not yet on $GIT_REMOTE/$GIT_BRANCH; pushing them."
    git_push || fail "push failed."
  fi
  log_message "Script finished."
  exit 0
fi

# 5. Record and publish the new pointer.
log_message "'$SUBMODULE_PATH' moved: $old -> $new."
git add "$SUBMODULE_PATH" || fail "git add '$SUBMODULE_PATH' failed."
git commit --quiet -m "Auto-update $SUBMODULE_PATH submodule to $new ($(date '+%Y-%m-%d %H:%M:%S %Z'))" ||
  fail "git commit failed."
git_push || fail "push failed."
log_message "Script finished successfully."
exit 0

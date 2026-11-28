# git-sync.sh: keep an automated checkout in step with its remote.
#
# Sourced (never run) by process.sh here and by update.sh in
# selkouutiset-archive; the two copies are identical, keep them so.
#
# The scripts sync before they work and again before they push, under their
# own lock, so a PR merged on GitHub mid-run never leaves a push rejected.
# POSIX sh only; every network call runs under `timeout`; git packs in little
# memory; and nothing starts without a minimum of free space.
#
# The caller defines log_message and sets GIT_REMOTE and GIT_BRANCH. Functions
# return non-zero on failure and never exit; the caller decides. They check
# every step themselves, since `set -e` is suspended inside a function called
# from `if` or `||`.

: "${GIT_NET_TIMEOUT:=300}"   # seconds allowed for one fetch or push
: "${GIT_NET_ATTEMPTS:=3}"    # tries per network operation
: "${GIT_RETRY_SLEEP:=30}"    # seconds before retry n is n * this
: "${MIN_FREE_MB:=100}"       # refuse to start below this much free space

# Never prompt (an unattended run has no terminal).
export GIT_TERMINAL_PROMPT=0
# Pack with one thread and a small window, so a repack (git gc --auto after a
# large commit) stays small in memory; and run gc in the foreground, inside the
# lock, instead of detached where it would race the next run.
export GIT_CONFIG_COUNT=3
export GIT_CONFIG_KEY_0=pack.threads GIT_CONFIG_VALUE_0=1
export GIT_CONFIG_KEY_1=pack.windowMemory GIT_CONFIG_VALUE_1=64m
export GIT_CONFIG_KEY_2=gc.autoDetach GIT_CONFIG_VALUE_2=false

# POSIX sh has no `local`: every variable is global, so each function keeps
# its own prefix (_net_, _push_, ...). git_push calls git_sync, which calls
# git_net; when they shared a retry counter, git_net reset git_push's on every
# retry and a push that kept failing retried forever, holding the lock.

# git_net ARGS...: run a network git command under a timeout, with retries.
git_net() {
  _net_n=1
  while :; do
    _net_rc=0
    timeout "$GIT_NET_TIMEOUT" git "$@" || _net_rc=$?
    [ "$_net_rc" -eq 0 ] && return 0
    if [ "$_net_n" -ge "$GIT_NET_ATTEMPTS" ]; then
      log_message "ERROR: 'git $*' failed $_net_n time(s); last status $_net_rc (124/143 = timed out)."
      return 1
    fi
    log_message "WARNING: 'git $*' failed (status $_net_rc), attempt $_net_n/$GIT_NET_ATTEMPTS; retrying in $((_net_n * GIT_RETRY_SLEEP))s."
    sleep $((_net_n * GIT_RETRY_SLEEP))
    _net_n=$((_net_n + 1))
  done
}

# check_free_space: fail if the filesystem holding the checkout is nearly full.
check_free_space() {
  _space_kb=$(df -Pk . 2>/dev/null | awk 'NR == 2 { print $4 }')
  case "$_space_kb" in
  '' | *[!0-9]*)
    log_message "WARNING: could not read free space from df; carrying on."
    return 0
    ;;
  esac
  if [ $((_space_kb / 1024)) -lt "$MIN_FREE_MB" ]; then
    log_message "CRITICAL ERROR: only $((_space_kb / 1024)) MB free here (need $MIN_FREE_MB MB); refusing to run."
    return 1
  fi
  log_message "Free space: $((_space_kb / 1024)) MB (minimum $MIN_FREE_MB MB)."
  return 0
}

# git_sync: bring HEAD level with GIT_REMOTE/GIT_BRANCH.
#   behind   -> fast-forward
#   ahead    -> nothing (the next push sends it)
#   diverged -> rebase our commits onto GitHub's; on conflict, abort the
#               rebase (leaving HEAD exactly as it was) and fail
# Uncommitted changes are carried across with --autostash.
git_sync() {
  _sync_up="$GIT_REMOTE/$GIT_BRANCH"
  git_net fetch --quiet "$GIT_REMOTE" "$GIT_BRANCH" || return 1
  if ! git rev-parse --verify --quiet "$_sync_up" >/dev/null; then
    log_message "ERROR: '$_sync_up' does not exist after fetching."
    return 1
  fi
  _sync_head=$(git rev-parse HEAD) || return 1
  _sync_upc=$(git rev-parse "$_sync_up") || return 1
  if [ "$_sync_head" = "$_sync_upc" ]; then
    log_message "git sync: level with $_sync_up ($(git rev-parse --short HEAD))."
    return 0
  fi
  _sync_behind=$(git rev-list --count "HEAD..$_sync_up") || return 1
  _sync_ahead=$(git rev-list --count "$_sync_up..HEAD") || return 1
  if [ "$_sync_behind" -eq 0 ]; then
    log_message "git sync: $_sync_ahead commit(s) ahead of $_sync_up; they go out with the next push."
    return 0
  fi
  if [ "$_sync_ahead" -eq 0 ]; then
    log_message "git sync: $_sync_behind commit(s) behind $_sync_up; fast-forwarding."
  else
    log_message "git sync: diverged from $_sync_up ($_sync_ahead ours, $_sync_behind theirs); rebasing ours on top."
  fi
  if ! git rebase --autostash --quiet "$_sync_up"; then
    git rebase --abort >/dev/null 2>&1
    log_message "CRITICAL ERROR: could not rebase onto $_sync_up (conflict?). Rebase aborted; HEAD left at $(git rev-parse --short HEAD). Needs a human."
    return 1
  fi
  log_message "git sync: now at $(git rev-parse --short HEAD)."
  return 0
}

# git_push: push HEAD to GIT_REMOTE/GIT_BRANCH. If GitHub moved in the meantime
# (a PR merged during the run), sync and try again.
git_push() {
  _push_n=1
  while :; do
    _push_rc=0
    timeout "$GIT_NET_TIMEOUT" git push --quiet "$GIT_REMOTE" "HEAD:refs/heads/$GIT_BRANCH" || _push_rc=$?
    if [ "$_push_rc" -eq 0 ]; then
      log_message "git push: $GIT_REMOTE/$GIT_BRANCH is now $(git rev-parse --short HEAD)."
      return 0
    fi
    if [ "$_push_n" -ge "$GIT_NET_ATTEMPTS" ]; then
      log_message "ERROR: push failed $_push_n time(s); last status $_push_rc. The commits stay here and go out with the next run."
      return 1
    fi
    log_message "WARNING: push failed (status $_push_rc), attempt $_push_n/$GIT_NET_ATTEMPTS; syncing and retrying in $((_push_n * GIT_RETRY_SLEEP))s."
    sleep $((_push_n * GIT_RETRY_SLEEP))
    git_sync || return 1
    _push_n=$((_push_n + 1))
  done
}

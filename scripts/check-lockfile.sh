#!/usr/bin/env bash
# Verify package-lock.json can satisfy package.json.
#
# The Cloudflare build installs with `npm clean-install`, which refuses to run
# when the lock file cannot describe a valid tree for package.json. Running the
# same command in --dry-run mode here reproduces that check without touching
# node_modules, so lock drift is caught before it reaches a deploy.

set -uo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

output="$(npm clean-install --dry-run --ignore-scripts --no-audit --no-fund 2>&1)"
status=$?

if [[ $status -eq 0 ]]; then
    echo "package-lock.json is in sync with package.json."
    exit 0
fi

if grep -qE 'EUSAGE|can only install packages when your package\.json' <<<"$output"; then
    cat >&2 <<'MESSAGE'
package-lock.json is out of sync with package.json.

`npm ci` will fail on the Cloudflare build with this same error, so the deploy
would break. Regenerate the lock file instead of editing it by hand:

    just relock

Never delete entries from package-lock.json directly. npm validates the lock
against a tree it recomputes from package.json, so hand-removed packages (for
example nested platform-specific optional dependencies) come back as "Missing
from lock file" errors on a clean install. Use the `overrides` field in
package.json if a resolved version genuinely needs to change.

npm reported:
MESSAGE
    # Drop npm's `npm ci` usage dump; the "Missing:" lines are the useful part.
    printf '%s\n' "$output" \
        | sed '/^npm error Clean install a project/,$d' \
        | sed 's/^/    /' >&2
    exit 1
fi

# Any other failure (offline, registry outage, auth) is not evidence that the
# lock file is wrong. Warn rather than block; CI runs a real install as the
# authoritative gate.
echo "warning: could not verify package-lock.json (npm exited $status)." >&2
echo "This is usually a network or registry problem, not lock drift." >&2
printf '%s\n' "$output" | sed 's/^/    /' >&2
exit 0

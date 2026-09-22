#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
required_node="$(tr -d '[:space:]' < "$repo_root/.nvmrc")"

# Desktop application harnesses can inject an Electron-backed Node shim. It is
# unsuitable for Vitest workers and other child processes used by this project.
unset ELECTRON_RUN_AS_NODE NODE_OPTIONS
if [[ -n "${FORCE_COLOR:-}" ]]; then
    unset NO_COLOR
fi

nvm_script="${NVM_DIR:-$HOME/.nvm}/nvm.sh"
if [[ -s "$nvm_script" ]]; then
    # shellcheck disable=SC1090
    source "$nvm_script"
    # nvm may not hold the pinned version (CI runners ship nvm but install Node
    # another way, e.g. actions/setup-node); the PATH check below still applies.
    nvm use --silent "$required_node" >/dev/null 2>&1 || true
fi

if ! command -v node >/dev/null 2>&1; then
    echo "Node.js $required_node is required but Node.js is not available." >&2
    exit 1
fi

actual_node="$(node --version)"
if [[ "$actual_node" != "v$required_node" ]]; then
    echo "Node.js $required_node is required; found ${actual_node#v}. Run 'nvm install'." >&2
    exit 1
fi

exec "$@"

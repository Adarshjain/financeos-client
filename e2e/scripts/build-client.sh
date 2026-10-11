#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

NODE_VER=$(tr -d '[:space:]' < .nvmrc)
[[ "$NODE_VER" == v* ]] || NODE_VER="v$NODE_VER"
if [[ -d "$HOME/.nvm/versions/node/$NODE_VER/bin" ]]; then
  export PATH="$HOME/.nvm/versions/node/$NODE_VER/bin:$PATH"
fi

echo "Building Next.js client for production..."
NEXT_PUBLIC_FARO_URL="" NEXT_PUBLIC_FARO_APP_KEY="" npm run build

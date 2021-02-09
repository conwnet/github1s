#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/../.."
APP_ROOT=$(pwd)

# sync src/* to vscode
function main() {
	cd ${APP_ROOT}
	rsync -a src/ lib/vscode/src
}

main "$@"

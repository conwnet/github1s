#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/.."
APP_ROOT=$(pwd)
echo $APP_ROOT

# sync src/* to vscode
function main() {
	cd ${APP_ROOT}
	rsync -a src/ lib/vscode/src
	rsync -a extensions/ lib/vscode/extensions
}

main "$@"

#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/.."
APP_ROOT=$(pwd)
echo $APP_ROOT

# sync src/* to vscode
function main() {
	cd ${APP_ROOT}
	rsync -a src/ lib/vscode/src
	if [ -e extensions ]; then
		rsync -a extensions/ lib/vscode/extensions
	fi
	if [ -e build ]; then
		rsync -a build/ lib/vscode/build
	fi
}

main "$@"

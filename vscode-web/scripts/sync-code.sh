#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/.."
VSCODE_WEB_ROOT=$(pwd)
echo $VSCODE_WEB_ROOT

# sync src/* to vscode
function main() {
	cd ${VSCODE_WEB_ROOT}
	rsync -a src/ lib/vscode/src
	if [ -e extensions ]; then
		rsync -a extensions/ lib/vscode/extensions
	fi
	if [ -e build ]; then
		rsync -a build/ lib/vscode/build
	fi
}

main "$@"

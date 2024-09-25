#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/.."
VSCODE_WEB_ROOT=$(pwd)
echo $VSCODE_WEB_ROOT

# build vscode source and vscode builtin extensions
function main() {
	cd ${VSCODE_WEB_ROOT}/lib/vscode

	yarn gulp vscode-web-min

	echo "build vscode done!"
}

main "$@"

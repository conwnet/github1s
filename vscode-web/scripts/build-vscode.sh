#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/.."
APP_ROOT=$(pwd)
echo $APP_ROOT

# build vscode source and vscode builtin extensions
function main() {
	cd ${APP_ROOT}/lib/vscode

	yarn gulp vscode-web-min

	echo "build vscode done!"
}

main "$@"

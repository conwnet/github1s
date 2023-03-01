#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/.."
APP_ROOT=$(pwd)

# execute all necessary tasks
function main() {
	cd ${APP_ROOT}
	rm -rf dist extensions/**/dist && echo "clean dist"
	rm -rf vscode-web/lib vscode-web/node_modules && echo "clean vscode-web"
	rm -rf node_modules extensions/**/node_modules && echo "clean node_modules"
	echo "clean all"
}

main "$@"
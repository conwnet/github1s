#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/.."
VSCODE_WEB_ROOT=$(pwd)
function ensureBuiltinExtensitions() {
	cd "${VSCODE_WEB_ROOT}/lib/vscode"
	EXTENSIONS_DIRTY=0 && git diff --exit-code --name-only extensions || EXTENSIONS_DIRTY=$?
	if [ $EXTENSIONS_DIRTY != 0 ] || [ ! -e ".build/web/extensions" ]
	then
		echo "compile vscode builtin extensions..."
		yarn gulp compile-web-extensions-build
	else
		echo "vscode builtin extensions is up-to-date, skip compiling."
	fi
}

function main() {
	ensureBuiltinExtensitions
	cd ${VSCODE_WEB_ROOT}
	mkdir -p "dist/extensions"
	cp -R ${VSCODE_WEB_ROOT}/lib/vscode/.build/web/extensions/* ${VSCODE_WEB_ROOT}/dist/extensions

	echo "copy vscode builtin extensions done!"
}

main "$@"


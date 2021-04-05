#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/.."
APP_ROOT=$(pwd)

function ensureBuiltinExtensitions() {
	cd "${APP_ROOT}/lib/vscode"
	if [ ! -e "extensions/emmet/dist/browser" ]
	then
		echo "compile vscode builtin extensions..."
		yarn gulp compile-web
		yarn gulp compile-extension-media
	fi
}

function main() {
	ensureBuiltinExtensitions
	cd ${APP_ROOT}
	mkdir -p "dist/extensions"
	node scripts/copy-extensions.js

	echo "copy vscode builtin extensions done!"
}

main "$@"

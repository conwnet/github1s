#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/../.."
APP_ROOT=$(pwd)

function ensureBuiltinExtensitions() {
	cd "${APP_ROOT}/lib/vscode"
	if [ ! -e "extensions/emmet/dist/browser" ]
	then
		echo "compile vscode builtin extensions..."
		yarn gulp compile-web
	fi
}

function main() {
	ensureBuiltinExtensitions
	cd ${APP_ROOT}
	mkdir -p dist/static/extensions
	node scripts/package/copy-extensions.js

	echo "copy vscode builtin extensions done!"
}

main "$@"

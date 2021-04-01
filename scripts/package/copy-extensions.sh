#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/../.."
APP_ROOT=$(pwd)

function main() {
	cd ${APP_ROOT}
	TARGET="vscode-web-github1s/dist"
	mkdir -p "${TARGET}/extensions"
	node scripts/package/copy-extensions.js

	echo "copy vscode builtin extensions done!"
}

main "$@"

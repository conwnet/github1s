#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/../.."
APP_ROOT=$(pwd)

function main() {
	cd ${APP_ROOT}
	node scripts/package/copy-extensions.js

	echo "copy vscode builtin extensions done!"
}

main "$@"

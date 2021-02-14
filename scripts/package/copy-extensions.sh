#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/../.."
APP_ROOT=$(pwd)

function main() {
	# ensureBuiltinExtensitions
	cd ${APP_ROOT}
	# mkdir -p dist/static/extensions
	node scripts/package/copy-extensions.js

	echo "copy github1s extensions done!"
}

main "$@"

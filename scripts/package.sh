#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/.."
APP_ROOT=$(pwd)

function main() {
	cd "${APP_ROOT}/scripts"
	./package/copy-vscode.sh
	./package/copy-extensions.sh
	./package/copy-node_modules.sh
	./package/copy-resources.sh
	node ./package/generate-config.js

	echo "all copy done!"
}

main "$@"

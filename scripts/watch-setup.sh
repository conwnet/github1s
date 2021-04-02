#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/.."
APP_ROOT=$(pwd)

# execute all necessary tasks
function main() {
	cd "${APP_ROOT}/scripts"
	./package/copy-resources.sh
	./package/copy-node_modules.sh
	./package/copy-extensions.sh
	node ./package/generate-config.js
}

main "$@"

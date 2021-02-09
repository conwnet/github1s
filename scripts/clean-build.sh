#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/.."
APP_ROOT=$(pwd)

# execute all necessary tasks
function main() {
	cd ${APP_ROOT}
	rm -rf dist extensions/github1s/dist
	echo "remove dist"
}

main "$@"
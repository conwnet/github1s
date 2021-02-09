#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/.."
APP_ROOT=$(pwd)

# execute all necessary tasks
function main() {
	./scripts/clean-build.sh
	cd ${APP_ROOT}
	rm -rf node_modules lib extensions/github1s/node_modules
	echo "clean all"
}

main "$@"
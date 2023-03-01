#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/.."
APP_ROOT=$(pwd)

function build_github1s_extensions() {
	for entry in "${APP_ROOT}/extensions"/*
	do
		if [ -f "$entry/package.json" ]
		then
			cd $entry
			yarn compile
		fi
	done
}

# execute all necessary tasks
function main() {
	rm -rf "${APP_ROOT}/dist"
	cd "${APP_ROOT}"
	build_github1s_extensions
	cd "${APP_ROOT}"
	yarn webpack

	echo "all build done!"
}

main "$@"

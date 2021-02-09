#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/.."
APP_ROOT=$(pwd)

function watch_vscode() {
	cd ${APP_ROOT}/lib/vscode
	yarn watch 2>&1 > /dev/null &
	echo "watching vscode"
}

function watch_github1s() {
	cd ${APP_ROOT}/scripts/watch
	node watch-src.js 2>&1 > /dev/null &
	echo "watching github1s"
}

function watch_github1s_extension() {
	cd ${APP_ROOT}/extensions/github1s
	yarn dev 2>&1 > /dev/null &
	echo "watching github1s_extensions"
}

function watch_dist() {
	cd ${APP_ROOT}/scripts/watch
	node watch-dist.js
	echo "auto sync to dist"
}

# execute all necessary tasks
function main() {
	rm -rf "${APP_ROOT}/dist"
	cd "${APP_ROOT}/scripts"
	./package/copy-resources.sh
	./package/copy-node_modules.sh
	./package/copy-extensions.sh
	node ./package/generate-config.js
	watch_vscode
	watch_github1s
	watch_github1s_extension

	echo 'please waiting...'
	while [ ! -e "${APP_ROOT}/lib/vscode/out" ]
	do
		echo "waiting for vsocde build..."
		sleep 3
	done
	watch_dist
}

main "$@"

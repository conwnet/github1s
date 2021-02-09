#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/.."
APP_ROOT=$(pwd)

function main() {
	# install github1s extension dependencies
	cd ${APP_ROOT}/extensions/github1s
	yarn ${CI+--frozen-lockfile}

	# clone vscode and install dependencies
	cd ${APP_ROOT}
	mkdir -p lib
	cd lib
	git clone --depth 1 -b 1.52.1 https://github.com/microsoft/vscode.git vscode
	cd vscode
	yarn ${CI+--frozen-lockfile}
}

main "$@"

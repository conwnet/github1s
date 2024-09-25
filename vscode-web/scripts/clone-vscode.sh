#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/.."
VSCODE_WEB_ROOT=$(pwd)

function main() {
	# clone vscode and install dependencies
	cd ${VSCODE_WEB_ROOT}
	if [ -d "lib/vscode" ]; then
		echo "./lib/vscode already exists, skip clone."
		exit 0
	fi
	mkdir -p lib
	cd lib
	git clone --depth 1 -b `cat ${VSCODE_WEB_ROOT}/.VERSION` https://github.com/microsoft/vscode.git vscode
	node ${VSCODE_WEB_ROOT}/scripts/patch.js
	cd vscode
	yarn --frozen-lockfile
}

main "$@"

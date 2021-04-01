#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/../.."
APP_ROOT=$(pwd)

function main() {
	cd ${APP_ROOT}
	TARGET="vscode-web-github1s/dist"
	mkdir -p "${TARGET}/vscode"
	rsync -a --del lib/vscode/out-vscode-min/ "${TARGET}/vscode"

	echo "copy vscode done!"
}

main "$@"

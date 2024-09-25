#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/.."
VSCODE_WEB_ROOT=$(pwd)

function main() {
	cd ${VSCODE_WEB_ROOT}
	TARGET="dist/vscode"
	mkdir -p ${TARGET}
	rsync -a --del lib/vscode/out-vscode-web-min/ "${TARGET}"

	echo "copy vscode done!"
}

main "$@"

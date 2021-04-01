#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/../.."
APP_ROOT=$(pwd)

function main() {
	cd ${APP_ROOT}
	TARGET="vscode-web-github1s/dist/"
	rm -rf ${TARGET}
	mkdir -p ${TARGET}
	rsync -a --del lib/vscode/out-vscode-min/ ${TARGET}

	echo "copy vscode done!"
}

main "$@"

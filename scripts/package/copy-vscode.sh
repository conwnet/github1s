#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/../.."
APP_ROOT=$(pwd)

function main() {
	cd ${APP_ROOT}
	mkdir -p dist/static
	rsync -a --del lib/vscode/out-vscode-min/ dist/static/vscode

	echo "copy vscode done!"
}

main "$@"

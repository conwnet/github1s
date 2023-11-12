#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/.."
APP_ROOT=$(pwd)

function main() {
	# install dependencies for the @github1s/vscode-web
	cd "${APP_ROOT}/vscode-web"
	yarn --frozen-lockfile
}

main "$@"

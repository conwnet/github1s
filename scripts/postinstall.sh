#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/.."
APP_ROOT=$(pwd)

function main() {
	# install github1s extensions dependencies
	for entry in "${APP_ROOT}/extensions"/*
	do
		if [ -d "$entry" ]
		then
			cd $entry
			yarn --frozen-lockfile
		fi
	done

	# clone vscode and install dependencies
	cd ${APP_ROOT}
	if [ -d "lib/vscode" ]; then
		echo "./lib/vscode already exists, skip clone."
		exit 0
	fi
	mkdir -p lib
	cd lib
	git clone --depth 1 -b 1.52.1 https://github.com/microsoft/vscode.git vscode
	cd vscode
	yarn --frozen-lockfile
}

main "$@"

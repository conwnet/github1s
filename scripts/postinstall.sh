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
}

main "$@"

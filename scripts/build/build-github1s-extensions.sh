#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/../.."
APP_ROOT=$(pwd)

function main() {
	for entry in "${APP_ROOT}/extensions"/*
	do
		if [ -f "$entry/package.json" ]
		then
			cd $entry
			yarn compile
		fi
	done
}

main "$@"

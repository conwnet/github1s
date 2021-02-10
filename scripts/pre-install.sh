#!/usr/bin/env bash
set -eo pipefail

cd "$(dirname "${0}")/.."
APP_ROOT=$(pwd)

# execute all necessary tasks
function main() {
	if [ "$VERCEL" = 1 ]; then
		echo "On Vercel"
		yum install libx11-dev libxkbfile-dev libxkbfile-dev -y
	fi
}

main "$@"

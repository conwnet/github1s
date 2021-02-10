#!/usr/bin/env bash
set -eo pipefail

cd "$(dirname "${0}")/.."
APP_ROOT=$(pwd)

# execute all necessary tasks
function main() {
	if [ "$VERCEL" = 1 ]; then
		echo "On Vercel"
		amazon-linux-extras install xkbfile
	fi
}

main "$@"

#!/usr/bin/env bash
set -eo pipefail

cd "$(dirname "${0}")/.."
APP_ROOT=$(pwd)

# execute all necessary tasks
function main() {
	if [ "$VERCEL" = 1 ]; then
		echo "On Vercel"
		yum groupinstall "Development Tools"
		yum install libX11-devel.x86_64 libxkbfile-devel.x86_64 libsecret-devel rsync
	fi
}

main "$@"

#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/../.."
APP_ROOT=$(pwd)

# build vscode source and vscode builtin extensions
function main() {
	cd ${APP_ROOT}
	rsync -a resources/gulp-github1s.js lib/vscode
	cd lib/vscode

	yarn gulp compile-build
	yarn gulp optimize --gulpfile ./gulp-github1s.js
	yarn gulp minify --gulpfile ./gulp-github1s.js

	echo "build vscode done!"
}

main "$@"

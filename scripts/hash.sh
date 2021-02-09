#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/.."
APP_ROOT=$(pwd)

COMMIT_ID=$(git rev-parse HEAD)
SHORT_COMMIT_ID=${COMMIT_ID:0:7}
STATIC_FOLDER_NAME="static-${SHORT_COMMIT_ID-unknown}"

if [ -e "${APP_ROOT}/dist/static" ]; then
	mv "${APP_ROOT}/dist/static" "${APP_ROOT}/dist/${STATIC_FOLDER_NAME}"
	sed "s/{STATIC_FOLDER}/${STATIC_FOLDER_NAME}/" "${APP_ROOT}/resources/index-hash.html" > "${APP_ROOT}/dist/index.html"
	echo "hash static files done"
else
	echo "Please build github1s first"
fi

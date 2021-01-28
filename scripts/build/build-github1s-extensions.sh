#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${0}")/../.."
APP_ROOT=$(pwd)

function main() {
  cd "${APP_ROOT}/extensions/github1s"
  yarn build
  echo "build github1s-extensions done!"
}

main "$@"

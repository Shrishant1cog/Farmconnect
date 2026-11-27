#!/usr/bin/env bash
#
# FarmConnect — production release build.
#
# Produces the release APK and the Play Store App Bundle against the live
# FarmConnect backend on Render. The API host is pinned here so a release
# build can never accidentally ship the local emulator URL
# (http://10.0.2.2:5000).
#
# Usage:
#   ./tool/build_production.sh            # APK + App Bundle
#   ./tool/build_production.sh apk        # APK only
#   ./tool/build_production.sh bundle     # App Bundle only
#
# Requirements:
#   * Flutter 3.47 or newer on the PATH
#   * A JDK configured for Flutter (`flutter config --jdk-dir=...`)
#
# Signing:
#   The build is signed with the DEBUG key unless the project owner has
#   created `android/key.properties` pointing at their upload keystore. See
#   `android/app/build.gradle.kts` and docs/ANDROID_LIVE_DEPLOYMENT.md.
#
set -euo pipefail

readonly API_BASE_URL="https://farmconnect-api-sn98.onrender.com/api"
readonly SOCKET_URL="https://farmconnect-api-sn98.onrender.com"

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

TARGET="${1:-all}"

cd "${PROJECT_DIR}"

if ! command -v flutter >/dev/null 2>&1; then
  echo "error: flutter was not found on the PATH" >&2
  exit 1
fi

echo "==> FarmConnect production build"
echo "    API_BASE_URL = ${API_BASE_URL}"
echo "    SOCKET_URL   = ${SOCKET_URL}"
echo "    target       = ${TARGET}"
echo

echo "==> flutter pub get"
flutter pub get
echo

echo "==> flutter analyze"
flutter analyze
echo

echo "==> flutter test"
flutter test
echo

build_release() {
  flutter build "$1" --release \
    --dart-define="API_BASE_URL=${API_BASE_URL}" \
    --dart-define="SOCKET_URL=${SOCKET_URL}"
}

case "${TARGET}" in
  apk)
    build_release apk
    ;;
  bundle)
    build_release appbundle
    ;;
  all)
    build_release apk
    echo
    build_release appbundle
    ;;
  *)
    echo "error: unknown target '${TARGET}' (expected: apk, bundle or all)" >&2
    exit 2
    ;;
esac

echo
echo "==> Artefacts"
for artefact in \
  "build/app/outputs/flutter-apk/app-release.apk" \
  "build/app/outputs/bundle/release/app-release.aab"; do
  if [ -f "${PROJECT_DIR}/${artefact}" ]; then
    size="$(du -h "${PROJECT_DIR}/${artefact}" | cut -f1)"
    echo "    ${artefact}  (${size})"
  fi
done

echo
echo "Done. Remember: a release artefact is Play Store ready ONLY when"
echo "android/key.properties points at the owner's upload keystore."

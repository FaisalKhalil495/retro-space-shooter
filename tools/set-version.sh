#!/bin/sh
# Usage: tools/set-version.sh 0.2.0
# Updates the game's version number everywhere at once: the label shown in
# the game, and the "?v=" on every file link. The "?v=" makes phones fetch
# fresh files after an update instead of mixing old and new ones.
set -e
NEW="$1"
if [ -z "$NEW" ]; then
  echo "usage: $0 <version>" >&2
  exit 1
fi
cd "$(dirname "$0")/.."
sed -i -E "s/\?v=[0-9]+\.[0-9]+\.[0-9]+/?v=$NEW/g" index.html js/*.js
sed -i -E "s/^export const VERSION = '[^']*';/export const VERSION = '$NEW';/" js/config.js
# Every link must now carry the same version.
if grep -hoE '\?v=[0-9.]+' index.html js/*.js | sort -u | grep -v "?v=$NEW\$"; then
  echo "error: some links still have an old version" >&2
  exit 1
fi
echo "Version set to $NEW"

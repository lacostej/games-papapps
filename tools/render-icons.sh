#!/bin/sh
# Renders icons/*.png from icon.svg with headless Chrome. Usage: tools/render-icons.sh
set -e
cd "$(dirname "$0")/.."
chrome="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
for size in 180 192 512; do
  page="$(mktemp -d)/icon.html"
  printf '<style>html,body{margin:0}img{display:block;width:%spx;height:%spx}</style><img src="file://%s/icon.svg">' "$size" "$size" "$PWD" > "$page"
  "$chrome" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size="$size,$size" --screenshot="$PWD/icons/icon-$size.png" "file://$page" 2>/dev/null
done
mv icons/icon-180.png icons/apple-touch-icon.png

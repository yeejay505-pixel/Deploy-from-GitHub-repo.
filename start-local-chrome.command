#!/bin/bash
set -e
PROFILE="$HOME/.yeejay-dxb-chrome"
mkdir -p "$PROFILE"

open -na "Google Chrome" --args \
  --remote-debugging-address=127.0.0.1 \
  --remote-debugging-port=9222 \
  --user-data-dir="$PROFILE" \
  "https://dxbinteract.com/dubai-property-prices"

echo ""
echo "Dedicated DXBinteract Chrome opened."
echo "Complete Cloudflare/RERA sign-in manually in that window."
echo "Keep this Chrome window open while the local agent is running."

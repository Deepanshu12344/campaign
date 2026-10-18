#!/bin/bash
ARTIFACTS_DIR="/home/sam-sepiol/.gemini/antigravity/brain/1c105991-83fb-4325-9fbe-0ee2baa21fc1"
CHROME="google-chrome --headless=new --no-sandbox --disable-gpu --user-data-dir=/tmp/chrome-test-profile --virtual-time-budget=3000"

$CHROME --window-size=360,640 --screenshot="${ARTIFACTS_DIR}/home_before_360x640.png" "http://localhost:4173/"
$CHROME --window-size=390,844 --screenshot="${ARTIFACTS_DIR}/home_before_390x844.png" "http://localhost:4173/"
$CHROME --window-size=360,640 --screenshot="${ARTIFACTS_DIR}/profile_before_360x640.png" "http://localhost:4173/profile"
$CHROME --window-size=390,844 --screenshot="${ARTIFACTS_DIR}/profile_before_390x844.png" "http://localhost:4173/profile"

ls -lh "${ARTIFACTS_DIR}"/*_before_*.png

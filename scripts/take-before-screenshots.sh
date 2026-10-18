#!/bin/bash
ARTIFACTS_DIR="/home/sam-sepiol/.gemini/antigravity/brain/1c105991-83fb-4325-9fbe-0ee2baa21fc1"

echo "Capturing Home Before 360x640..."
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --virtual-time-budget=6000 --window-size=360,640 --screenshot="${ARTIFACTS_DIR}/home_before_360x640.png" "http://localhost:4173/"

echo "Capturing Home Before 390x844..."
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --virtual-time-budget=6000 --window-size=390,844 --screenshot="${ARTIFACTS_DIR}/home_before_390x844.png" "http://localhost:4173/"

echo "Capturing Profile Before 360x640..."
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --virtual-time-budget=6000 --window-size=360,640 --screenshot="${ARTIFACTS_DIR}/profile_before_360x640.png" "http://localhost:4173/profile"

echo "Capturing Profile Before 390x844..."
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --virtual-time-budget=6000 --window-size=390,844 --screenshot="${ARTIFACTS_DIR}/profile_before_390x844.png" "http://localhost:4173/profile"

ls -la "${ARTIFACTS_DIR}"/*_before_*.png

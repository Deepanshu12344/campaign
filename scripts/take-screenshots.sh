#!/bin/bash
ARTIFACTS_DIR="/home/sam-sepiol/.gemini/antigravity/brain/1c105991-83fb-4325-9fbe-0ee2baa21fc1"

echo "Capturing Welcome 360x640..."
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --virtual-time-budget=6000 --window-size=360,640 --screenshot="${ARTIFACTS_DIR}/welcome_360x640.png" "http://localhost:4173/welcome"

echo "Capturing Welcome 390x844..."
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --virtual-time-budget=6000 --window-size=390,844 --screenshot="${ARTIFACTS_DIR}/welcome_390x844.png" "http://localhost:4173/welcome"

echo "Capturing Onboarding 360x640..."
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --virtual-time-budget=6000 --window-size=360,640 --screenshot="${ARTIFACTS_DIR}/onboarding_360x640.png" "http://localhost:4173/onboarding"

echo "Capturing Onboarding 390x844..."
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --virtual-time-budget=6000 --window-size=390,844 --screenshot="${ARTIFACTS_DIR}/onboarding_390x844.png" "http://localhost:4173/onboarding"

echo "Capturing Components Gallery 360x640..."
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --virtual-time-budget=6000 --window-size=360,640 --screenshot="${ARTIFACTS_DIR}/components_360x640.png" "http://localhost:4173/dev/components"

echo "Capturing Components Gallery 390x844..."
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --virtual-time-budget=6000 --window-size=390,844 --screenshot="${ARTIFACTS_DIR}/components_390x844.png" "http://localhost:4173/dev/components"

ls -lh "${ARTIFACTS_DIR}"/*_360x640.png "${ARTIFACTS_DIR}"/*_390x844.png

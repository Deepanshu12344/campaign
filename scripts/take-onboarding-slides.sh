#!/bin/bash
ARTIFACTS_DIR="/home/sam-sepiol/.gemini/antigravity/brain/1c105991-83fb-4325-9fbe-0ee2baa21fc1"

google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --virtual-time-budget=6000 --window-size=360,640 --screenshot="${ARTIFACTS_DIR}/onboarding_slide1_360x640.png" "http://localhost:4173/onboarding?slide=1"

google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --virtual-time-budget=6000 --window-size=360,640 --screenshot="${ARTIFACTS_DIR}/onboarding_slide2_360x640.png" "http://localhost:4173/onboarding?slide=2"

google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --virtual-time-budget=6000 --window-size=360,640 --screenshot="${ARTIFACTS_DIR}/onboarding_slide3_360x640.png" "http://localhost:4173/onboarding?slide=3"

ls -la "${ARTIFACTS_DIR}"/onboarding_slide*.png

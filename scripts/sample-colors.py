import os
from PIL import Image
from collections import Counter

def rgb_to_hex(rgb):
    return '#{:02X}{:02X}{:02X}'.format(rgb[0], rgb[1], rgb[2])

def sample_area(im, box):
    # box = (left, top, right, bottom)
    pixels = []
    for x in range(box[0], box[2]):
        for y in range(box[1], box[3]):
            pixels.append(im.getpixel((x, y)))
    counts = Counter(pixels)
    most_common = counts.most_common(5)
    return most_common[0][0], [c[0] for c in most_common]

# 1. Splash screen: WhatsApp Image 2026-10-17 at 20.49.40.jpeg
splash = Image.open('docs/reference/WhatsApp Image 2026-10-17 at 20.49.40.jpeg')
splash_bg, _ = sample_area(splash, (100, 200, 150, 250))
splash_logo, _ = sample_area(splash, (340, 750, 360, 770))
print(f"SPLASH BACKGROUND: {rgb_to_hex(splash_bg)} (rgb: {splash_bg})")
print(f"SPLASH LOGO: {rgb_to_hex(splash_logo)} (rgb: {splash_logo})")

# 2. Travel Card screen: WhatsApp Image 2026-10-17 at 20.49.41.jpeg
cards_img = Image.open('docs/reference/WhatsApp Image 2026-10-17 at 20.49.41.jpeg')
app_bg, _ = sample_area(cards_img, (20, 200, 40, 250))
card_surface, _ = sample_area(cards_img, (100, 400, 200, 450))
lime_btn, _ = sample_area(cards_img, (580, 500, 600, 520))
back_btn_bg, _ = sample_area(cards_img, (40, 90, 80, 110))
back_btn_icon, _ = sample_area(cards_img, (50, 95, 60, 105)) # arrow
white_text, _ = sample_area(cards_img, (120, 305, 130, 320))
grey_pill_bg, _ = sample_area(cards_img, (530, 325, 580, 345))
grey_pill_text, _ = sample_area(cards_img, (535, 330, 545, 340))
print(f"APP BACKGROUND: {rgb_to_hex(app_bg)} (rgb: {app_bg})")
print(f"CARD SURFACE: {rgb_to_hex(card_surface)} (rgb: {card_surface})")
print(f"LIME ARROW BUTTON: {rgb_to_hex(lime_btn)} (rgb: {lime_btn})")
print(f"BACK BUTTON BG: {rgb_to_hex(back_btn_bg)} (rgb: {back_btn_bg})")
print(f"TAG PILL BG ('Free'): {rgb_to_hex(grey_pill_bg)} (rgb: {grey_pill_bg})")
print(f"DISPLAY HEADLINE TEXT: {rgb_to_hex(white_text)} (rgb: {white_text})")

# 3. Skeleton screen: WhatsApp Image 2026-10-17 at 20.49.38.jpeg
skel_img = Image.open('docs/reference/WhatsApp Image 2026-10-17 at 20.49.38.jpeg')
skel_block, _ = sample_area(skel_img, (100, 360, 200, 380))
skel_tab_bg, _ = sample_area(skel_img, (100, 1540, 200, 1560))
skel_tab_active, _ = sample_area(skel_img, (80, 940, 90, 950))
print(f"SKELETON BLOCK: {rgb_to_hex(skel_block)} (rgb: {skel_block})")
print(f"TAB BAR BACKGROUND: {rgb_to_hex(skel_tab_bg)} (rgb: {skel_tab_bg})")

# 4. Onboarding button & text: WhatsApp Image 2026-10-17 at 20.49.38(1).jpeg
onb_img = Image.open('docs/reference/WhatsApp Image 2026-10-17 at 20.49.38(1).jpeg')
onb_btn_bg, _ = sample_area(onb_img, (300, 1470, 400, 1490))
onb_btn_text, _ = sample_area(onb_img, (340, 1460, 350, 1475))
onb_prog_bg, _ = sample_area(onb_img, (400, 68, 500, 72))
onb_prog_fill, _ = sample_area(onb_img, (100, 68, 200, 72))
print(f"ONBOARDING LIME BUTTON: {rgb_to_hex(onb_btn_bg)} (rgb: {onb_btn_bg})")
print(f"DARK TEXT ON LIME: {rgb_to_hex(onb_btn_text)} (rgb: {onb_btn_text})")
print(f"SEGMENTED PROGRESS TRACK: {rgb_to_hex(onb_prog_bg)} (rgb: {onb_prog_bg})")
print(f"SEGMENTED PROGRESS FILL: {rgb_to_hex(onb_prog_fill)} (rgb: {onb_prog_fill})")

# 5. Home screen: WhatsApp Image 2026-10-17 at 20.49.41(1).jpeg
home_img = Image.open('docs/reference/WhatsApp Image 2026-10-17 at 20.49.41(1).jpeg')
w, h = home_img.size
print(f"Home image size: {w}x{h}")
# Let's inspect some sample coordinates across home
# Action pills are around y=170..210
# Promo card is around y=300..500
# Transfer calculator is around y=600..900

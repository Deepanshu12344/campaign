import math
from PIL import Image, ImageDraw

LIME_BG = (159, 232, 112, 255)      # #9FE870
DARK_GREEN = (22, 51, 0, 255)       # #163300
TRANSPARENT = (0, 0, 0, 0)
WHITE = (255, 255, 255, 255)
BLACK = (0, 0, 0, 255)

def render_raw_mark(mark_color=DARK_GREEN, inner_cut_color=LIME_BG):
    ss = 4
    canvas_w = 1200 * ss
    canvas_h = 1200 * ss
    img = Image.new("RGBA", (canvas_w, canvas_h), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    # Base coords in 512-coordinate space
    body_pts = [
        (120, 220), (140, 200), (170, 200),
        (280, 148), (306, 165), (306, 347),
        (280, 364), (170, 312), (140, 312),
        (120, 292)
    ]
    draw.polygon([(x * ss, y * ss) for x, y in body_pts], fill=mark_color)
    draw.rounded_rectangle(
        [115 * ss, 200 * ss, 155 * ss, 312 * ss],
        radius=14 * ss,
        fill=mark_color
    )

    # Sound circle cut
    circle_r = 26 * ss
    cx, cy = 215 * ss, 256 * ss
    draw.ellipse([cx - circle_r, cy - circle_r, cx + circle_r, cy + circle_r], fill=inner_cut_color)

    # Arc 1 (inner arc)
    arc1 = [(352 - 90) * ss, (256 - 90) * ss, (352 + 90) * ss, (256 + 90) * ss]
    draw.arc(arc1, start=315, end=45, fill=mark_color, width=int(36 * ss))

    # Arc 2 (outer arc)
    arc2 = [(405 - 155) * ss, (256 - 155) * ss, (405 + 155) * ss, (256 + 155) * ss]
    draw.arc(arc2, start=315, end=45, fill=mark_color, width=int(36 * ss))

    bbox = img.getbbox()
    return img.crop(bbox)

def make_centered_image(target_w, target_h, mark_w, bg_color=TRANSPARENT, mark_color=DARK_GREEN, inner_cut_color=LIME_BG):
    mark = render_raw_mark(mark_color=mark_color, inner_cut_color=inner_cut_color)
    bw, bh = mark.size
    aspect = bh / bw
    mark_h = int(mark_w * aspect)

    scaled_mark = mark.resize((mark_w, mark_h), Image.Resampling.LANCZOS)
    img = Image.new("RGBA", (target_w, target_h), bg_color)
    pos_x = (target_w - mark_w) // 2
    pos_y = (target_h - mark_h) // 2
    img.paste(scaled_mark, (pos_x, pos_y), scaled_mark)
    return img

def generate_all():
    # 1. 1024x1024 app store icon with lime background
    icon_1024 = make_centered_image(1024, 1024, 560, bg_color=LIME_BG, mark_color=DARK_GREEN, inner_cut_color=LIME_BG)
    icon_1024.save("apps/mobile/assets/images/icon.png")
    print("Saved apps/mobile/assets/images/icon.png (1024x1024)")

    # 2. 512x512 splash screen logo icon (centered, transparent)
    splash = make_centered_image(512, 512, 340, bg_color=TRANSPARENT, mark_color=DARK_GREEN, inner_cut_color=LIME_BG)
    splash.save("apps/mobile/assets/images/splash-icon.png")
    print("Saved apps/mobile/assets/images/splash-icon.png (512x512)")

    # 3. 512x512 adaptive icon foreground (mark scaled inside 338px safe zone circle)
    # Width 270px -> radius sqrt((135)^2 + (66)^2) = 150px < 169px safe zone radius
    adaptive_fg = make_centered_image(512, 512, 270, bg_color=TRANSPARENT, mark_color=DARK_GREEN, inner_cut_color=LIME_BG)
    adaptive_fg.save("apps/mobile/assets/images/android-icon-foreground.png")
    print("Saved apps/mobile/assets/images/android-icon-foreground.png (512x512)")

    # 4. 512x512 adaptive icon background (solid #9FE870 lime)
    adaptive_bg = Image.new("RGBA", (512, 512), LIME_BG)
    adaptive_bg.save("apps/mobile/assets/images/android-icon-background.png")
    print("Saved apps/mobile/assets/images/android-icon-background.png (512x512)")

    # 5. 512x512 adaptive icon monochrome (for Android 13+ themed icons)
    # In monochrome, mask color is pure white or black with transparent cut
    adaptive_mono = make_centered_image(512, 512, 270, bg_color=TRANSPARENT, mark_color=WHITE, inner_cut_color=TRANSPARENT)
    adaptive_mono.save("apps/mobile/assets/images/android-icon-monochrome.png")
    print("Saved apps/mobile/assets/images/android-icon-monochrome.png (512x512)")

    # 6. 48x48 favicon
    fav = icon_1024.resize((48, 48), Image.Resampling.LANCZOS)
    fav.save("apps/mobile/assets/images/favicon.png")
    print("Saved apps/mobile/assets/images/favicon.png (48x48)")

if __name__ == "__main__":
    generate_all()

import math
from PIL import Image, ImageDraw

def draw_mark(draw, scale, color=(22, 51, 0, 255), inner_cut_color=(159, 232, 112, 255), offset_x=0, offset_y=0):
    # Base coordinates in 512x512 space
    # Megaphone body
    body_pts = [
        (120, 220), (140, 200), (170, 200),
        (280, 148), (306, 165), (306, 347),
        (280, 364), (170, 312), (140, 312),
        (120, 292)
    ]
    scaled_body = [((x + offset_x) * scale, (y + offset_y) * scale) for x, y in body_pts]
    draw.polygon(scaled_body, fill=color)

    # Rounded end cap on the left
    left_x = (120 + offset_x) * scale
    draw.rounded_rectangle(
        [(115 + offset_x) * scale, (200 + offset_y) * scale, (155 + offset_x) * scale, (312 + offset_y) * scale],
        radius=14 * scale,
        fill=color
    )

    # Sound circle cut
    circle_r = 26 * scale
    circle_cx = (215 + offset_x) * scale
    circle_cy = (256 + offset_y) * scale
    draw.ellipse(
        [circle_cx - circle_r, circle_cy - circle_r, circle_cx + circle_r, circle_cy + circle_r],
        fill=inner_cut_color
    )

    # Arc 1 (inner arc)
    arc1_bbox = [
        (352 - 90 + offset_x) * scale, (256 - 90 + offset_y) * scale,
        (352 + 90 + offset_x) * scale, (256 + 90 + offset_y) * scale
    ]
    draw.arc(arc1_bbox, start=315, end=45, fill=color, width=int(36 * scale))

    # Arc 2 (outer arc)
    arc2_bbox = [
        (405 - 155 + offset_x) * scale, (256 - 155 + offset_y) * scale,
        (405 + 155 + offset_x) * scale, (256 + 155 + offset_y) * scale
    ]
    draw.arc(arc2_bbox, start=315, end=45, fill=color, width=int(36 * scale))

def make_splash_icon():
    # 512x512 transparent PNG with centered mark
    ss = 4
    img = Image.new("RGBA", (512 * ss, 512 * ss), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_mark(draw, ss, color=(22, 51, 0, 255), inner_cut_color=(159, 232, 112, 255), offset_x=0, offset_y=0)
    out = img.resize((512, 512), Image.Resampling.LANCZOS)
    out.save("apps/mobile/assets/images/splash-icon.png")
    print("Created splash-icon.png")

def make_adaptive_foreground():
    # 512x512 transparent PNG, mark scaled down to safe zone (~66% = 340px)
    ss = 4
    canvas_size = 512
    img = Image.new("RGBA", (canvas_size * ss, canvas_size * ss), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Center and scale down
    # Original mark is ~350 wide (115 to 450) and ~250 tall (140 to 370), center at ~(280, 256)
    mark_img = Image.new("RGBA", (512 * ss, 512 * ss), (0, 0, 0, 0))
    mark_draw = ImageDraw.Draw(mark_img)
    draw_mark(mark_draw, ss, color=(22, 51, 0, 255), inner_cut_color=(159, 232, 112, 255))
    mark_resized = mark_img.resize((320, 320), Image.Resampling.LANCZOS)
    
    final_img = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    final_img.paste(mark_resized, (96, 96), mark_resized)
    final_img.save("apps/mobile/assets/images/android-icon-foreground.png")
    print("Created android-icon-foreground.png")

def make_app_icon():
    # 1024x1024 solid lime #9FE870 background with mark centered
    ss = 2
    size = 1024
    img = Image.new("RGBA", (size * ss, size * ss), (159, 232, 112, 255))
    draw = ImageDraw.Draw(img)
    
    # Mark in 1024 space (scaled by 2 * ss)
    # Target mark width ~640px centered in 1024
    mark_scale = (640 / 512) * ss
    offset_x = (1024 / (mark_scale / ss) - 512) / 2
    offset_y = (1024 / (mark_scale / ss) - 512) / 2
    draw_mark(draw, mark_scale, color=(22, 51, 0, 255), inner_cut_color=(159, 232, 112, 255), offset_x=offset_x, offset_y=offset_y)
    
    out = img.resize((size, size), Image.Resampling.LANCZOS)
    out.save("apps/mobile/assets/images/icon.png")
    print("Created icon.png")

def make_favicon():
    img = Image.open("apps/mobile/assets/images/icon.png")
    fav = img.resize((48, 48), Image.Resampling.LANCZOS)
    fav.save("apps/mobile/assets/images/favicon.png")
    print("Created favicon.png")

make_splash_icon()
make_adaptive_foreground()
make_app_icon()
make_favicon()

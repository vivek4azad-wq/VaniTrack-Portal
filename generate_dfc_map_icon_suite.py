import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def draw_track_and_pin(draw, size, cx, cy, scale=1.0):
    # scale factor allows adjusting size for adaptive safe zone vs full icon
    def bezier_point(t, p0, p1, p2, p3):
        u = 1 - t
        tt = t * t
        uu = u * u
        uuu = uu * u
        ttt = tt * t
        x = uuu * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + ttt * p3[0]
        y = uuu * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + ttt * p3[1]
        return (x, y)

    def bezier_tangent(t, p0, p1, p2, p3):
        u = 1 - t
        dx = 3 * (u**2) * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * (t**2) * (p3[0] - p2[0])
        dy = 3 * (u**2) * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * (t**2) * (p3[1] - p2[1])
        length = math.hypot(dx, dy)
        if length == 0:
            return (1, 0)
        return (dx / length, dy / length)

    # Base coords scaled around center
    def sc(x, y):
        return (cx + (x - 512) * scale, cy + (y - 512) * scale)

    p0 = sc(120, 930)
    p1 = sc(320, 780)
    p2 = sc(540, 420)
    p3 = sc(900, 200)

    gauge_half = 38 * scale

    # Sleepers
    num_sleepers = 24
    for i in range(num_sleepers):
        t = (i + 0.5) / num_sleepers
        pt = bezier_point(t, p0, p1, p2, p3)
        tx, ty = bezier_tangent(t, p0, p1, p2, p3)
        nx, ny = -ty, tx
        
        sleeper_len = 58 * scale
        s_p1 = (pt[0] - nx * sleeper_len, pt[1] - ny * sleeper_len)
        s_p2 = (pt[0] + nx * sleeper_len, pt[1] + ny * sleeper_len)
        
        # Sleeper shadow
        draw.line([(s_p1[0] + 2*scale, s_p1[1] + 3*scale), (s_p2[0] + 2*scale, s_p2[1] + 3*scale)], 
                  fill=(0, 0, 0, 140), width=int(16 * scale))
        # Concrete sleeper
        draw.line([s_p1, s_p2], fill=(220, 225, 235, 240), width=int(12 * scale))
        # Gold fasteners
        for clip_offset in [-gauge_half, gauge_half]:
            cx_c = pt[0] + nx * clip_offset
            cy_c = pt[1] + ny * clip_offset
            draw.rectangle([cx_c - 3*scale, cy_c - 3*scale, cx_c + 3*scale, cy_c + 3*scale], 
                           fill=(255, 190, 0, 255))

    # Steel Rails
    for offset in [-gauge_half, gauge_half]:
        rail_points = []
        rail_shadow = []
        for step in range(100):
            t = step / 99.0
            pt = bezier_point(t, p0, p1, p2, p3)
            tx, ty = bezier_tangent(t, p0, p1, p2, p3)
            nx, ny = -ty, tx
            rx = pt[0] + nx * offset
            ry = pt[1] + ny * offset
            rail_points.append((rx, ry))
            rail_shadow.append((rx + 2*scale, ry + 3*scale))
            
        draw.line(rail_shadow, fill=(0, 0, 0, 160), width=int(14 * scale))
        draw.line(rail_points, fill=(65, 85, 110, 255), width=int(12 * scale))
        draw.line(rail_points, fill=(240, 248, 255, 255), width=int(7 * scale))
        draw.line(rail_points, fill=(0, 242, 254, 220), width=max(2, int(2.5 * scale)))

    # GPS Pin
    pin_tip_x, pin_tip_y = sc(500, 600)
    pin_head_cy = pin_tip_y - 145 * scale
    pin_r = 110 * scale

    # Radar pulse rings
    for r_p, alpha, w_p in [(35, 180, 5), (70, 110, 3.5), (110, 50, 2.5)]:
        r_sc = r_p * scale
        draw.ellipse(
            [pin_tip_x - r_sc * 1.6, pin_tip_y - r_sc * 0.7, pin_tip_x + r_sc * 1.6, pin_tip_y + r_sc * 0.7],
            outline=(0, 242, 254, alpha), width=max(1, int(w_p * scale))
        )

    # Pin Shadow
    draw.ellipse(
        [pin_tip_x - 55*scale, pin_tip_y - 12*scale, pin_tip_x + 65*scale, pin_tip_y + 24*scale],
        fill=(0, 0, 0, 150)
    )

    # Pin Polygon
    dx_ct = pin_tip_x - cx
    dy_ct = pin_tip_y - pin_head_cy
    dist_ct = math.hypot(dx_ct, dy_ct)
    alpha_ang = math.acos(pin_r / dist_ct)
    base_ang = math.atan2(dy_ct, dx_ct)
    
    ang1 = base_ang + alpha_ang
    ang2 = base_ang - alpha_ang
    
    t1_x = cx + pin_r * math.cos(ang1)
    t1_y = pin_head_cy + pin_r * math.sin(ang1)
    t2_x = cx + pin_r * math.cos(ang2)
    t2_y = pin_head_cy + pin_r * math.sin(ang2)

    pin_poly = [(pin_tip_x, pin_tip_y), (t1_x, t1_y)]
    start_deg = math.degrees(ang1)
    end_deg = math.degrees(ang2)
    if end_deg < start_deg:
        end_deg += 360
        
    for step in range(1, 36):
        frac = step / 36.0
        cur_ang = math.radians(start_deg + frac * (end_deg - start_deg))
        pin_poly.append((cx + pin_r * math.cos(cur_ang), pin_head_cy + pin_r * math.sin(cur_ang)))
        
    pin_poly.append((t2_x, t2_y))
    pin_poly.append((pin_tip_x, pin_tip_y))

    # Fill Pin with Ruby/Coral Red
    draw.polygon(pin_poly, fill=(245, 35, 75, 255))
    # Add subtle 3D highlight on left of pin
    draw.line([(t1_x, t1_y), (pin_tip_x, pin_tip_y)], fill=(255, 120, 150, 220), width=max(2, int(4*scale)))

    # Pin Inner White Target Circle
    inner_r = 54 * scale
    draw.ellipse(
        [cx - inner_r, pin_head_cy - inner_r, cx + inner_r, pin_head_cy + inner_r],
        fill=(255, 255, 255, 255), outline=(230, 235, 245, 255), width=max(1, int(3 * scale))
    )
    # Dark Navy target ring
    core_r = 26 * scale
    draw.ellipse(
        [cx - core_r, pin_head_cy - core_r, cx + core_r, pin_head_cy + core_r],
        fill=(13, 27, 42, 255)
    )
    # Cyan center dot
    draw.ellipse(
        [cx - 11*scale, pin_head_cy - 11*scale, cx + 11*scale, pin_head_cy + 11*scale],
        fill=(0, 242, 254, 255)
    )

    # Fonts
    font_main = None
    font_sub = None
    for fpath in [
        "/System/Library/Fonts/Supplemental/Arial Black.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/HelveticaNeue.ttc"
    ]:
        try:
            font_main = ImageFont.truetype(fpath, int(112 * scale))
            font_sub = ImageFont.truetype(fpath, int(54 * scale))
            break
        except Exception:
            continue

    if font_main is None:
        font_main = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    # Sleek High-Tech Bottom Banner
    bw = 540 * scale
    bh = 130 * scale
    bx0 = cx - bw / 2
    by0 = cy + 175 * scale
    bx1 = cx + bw / 2
    by1 = by0 + bh

    # Banner Shadow
    draw.rounded_rectangle([bx0, by0 + 6*scale, bx1, by1 + 9*scale], radius=int(28*scale), fill=(0, 0, 0, 160))
    # Banner Body
    draw.rounded_rectangle([bx0, by0, bx1, by1], radius=int(28*scale), fill=(10, 25, 47, 250), 
                           outline=(0, 242, 254, 240), width=max(2, int(4.5 * scale)))

    dfc_txt = "DFC"
    map_txt = " MAP"
    dfc_bb = draw.textbbox((0, 0), dfc_txt, font=font_main)
    map_bb = draw.textbbox((0, 0), map_txt, font=font_main)
    w_dfc = dfc_bb[2] - dfc_bb[0]
    w_map = map_bb[2] - map_bb[0]
    total_w = w_dfc + w_map
    tx0 = cx - total_w / 2
    ty0 = by0 + (bh - (dfc_bb[3] - dfc_bb[1])) / 2 - 10 * scale

    # Text Shadows
    draw.text((tx0 + 2*scale, ty0 + 3*scale), dfc_txt, font=font_main, fill=(0, 0, 0, 220))
    draw.text((tx0 + w_dfc + 2*scale, ty0 + 3*scale), map_txt, font=font_main, fill=(0, 0, 0, 220))

    # Text
    draw.text((tx0, ty0), dfc_txt, font=font_main, fill=(255, 255, 255, 255))
    draw.text((tx0 + w_dfc, ty0), map_txt, font=font_main, fill=(0, 242, 254, 255))

    # Top Sub-Pill
    sub_txt = "GIS TRACKER"
    sub_bb = draw.textbbox((0, 0), sub_txt, font=font_sub)
    w_sub = sub_bb[2] - sub_bb[0]
    h_sub = sub_bb[3] - sub_bb[1]
    stx = cx - w_sub / 2
    sty = cy - 290 * scale

    pad_x = 22 * scale
    pad_y = 7 * scale
    draw.rounded_rectangle(
        [stx - pad_x, sty - pad_y, stx + w_sub + pad_x, sty + h_sub + pad_y],
        radius=int(18 * scale), fill=(12, 26, 48, 230), outline=(255, 215, 0, 230), width=max(1, int(2.5 * scale))
    )
    draw.text((stx, sty - 2*scale), sub_txt, font=font_sub, fill=(255, 215, 0, 255))


def generate_full_icon(size=1024, is_round=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Navy gradient
    for y in range(size):
        factor = y / float(size)
        r = int(10 * (1 - factor) + 16 * factor)
        g = int(22 * (1 - factor) + 36 * factor)
        b = int(48 * (1 - factor) + 72 * factor)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    # GIS Grid
    grid_col = (0, 242, 254, 22)
    step = int(size / 8)
    for s in range(step, size, step):
        draw.line([(s, 0), (s, size)], fill=grid_col, width=2)
        draw.line([(0, s), (size, s)], fill=grid_col, width=2)

    # Concentric Radar rings
    cx, cy = size / 2, size / 2
    for ring_r in [size * 0.22, size * 0.36, size * 0.5]:
        draw.ellipse([cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r], outline=(0, 242, 254, 30), width=2)

    # Scale 1.1 for full icon
    draw_track_and_pin(draw, size, cx, cy, scale=1.05)

    if is_round:
        mask = Image.new("L", (size, size), 0)
        m_draw = ImageDraw.Draw(mask)
        m_draw.ellipse([10, 10, size - 10, size - 10], fill=255)
        out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        out.paste(img, (0, 0), mask=mask)
        return out

    return img


def generate_adaptive_foreground(size=1024):
    # Android Adaptive Foreground: 108dp canvas, safe zone is inner 66% (diameter ~675px)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = size / 2, size / 2
    # Use scale 0.72 so that all graphics strictly sit inside the safe zone
    draw_track_and_pin(draw, size, cx, cy, scale=0.72)
    return img


def generate_adaptive_background(size=1024):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for y in range(size):
        factor = y / float(size)
        r = int(10 * (1 - factor) + 16 * factor)
        g = int(22 * (1 - factor) + 36 * factor)
        b = int(48 * (1 - factor) + 72 * factor)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))
    grid_col = (0, 242, 254, 25)
    step = int(size / 8)
    for s in range(step, size, step):
        draw.line([(s, 0), (s, size)], fill=grid_col, width=2)
        draw.line([(0, s), (size, s)], fill=grid_col, width=2)
    cx, cy = size / 2, size / 2
    for ring_r in [size * 0.22, size * 0.36, size * 0.5]:
        draw.ellipse([cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r], outline=(0, 242, 254, 35), width=2)
    return img


if __name__ == "__main__":
    res_base = "/Users/vivekazad/Desktop/Vani/android-app/VaniTrackLinear/app/src/main/res"
    
    # 1. Generate Master 1024x1024 icons
    master_full = generate_full_icon(1024, is_round=False)
    master_round = generate_full_icon(1024, is_round=True)
    master_fg = generate_adaptive_foreground(1024)
    master_bg = generate_adaptive_background(1024)

    # 512x512 Store Asset
    store_icon = master_full.resize((512, 512), Image.Resampling.LANCZOS)
    store_icon.save("/Users/vivekazad/Desktop/Vani/android-app/VaniTrackLinear/app/src/main/ic_launcher-playstore.png", "PNG")
    store_icon.save("/Users/vivekazad/Desktop/DFC_MAP_Icon_512.png", "PNG")
    print("Saved 512x512 Play Store icon to Desktop and app/src/main")

    # Mipmap densities:
    # mdpi: 48x48 (fg: 108x108)
    # hdpi: 72x72 (fg: 162x162)
    # xhdpi: 96x96 (fg: 216x216)
    # xxhdpi: 144x144 (fg: 324x324)
    # xxxhdpi: 192x192 (fg: 432x432)
    densities = {
        "mipmap-mdpi": (48, 108),
        "mipmap-hdpi": (72, 162),
        "mipmap-xhdpi": (96, 216),
        "mipmap-xxhdpi": (144, 324),
        "mipmap-xxxhdpi": (192, 432)
    }

    for folder, (icon_sz, fg_sz) in densities.items():
        dir_path = os.path.join(res_base, folder)
        os.makedirs(dir_path, exist_ok=True)
        
        # Remove old webp icons
        for old_f in ["ic_launcher.webp", "ic_launcher_round.webp"]:
            old_path = os.path.join(dir_path, old_f)
            if os.path.exists(old_path):
                os.remove(old_path)
                print(f"Removed {old_path}")

        # Save ic_launcher.png
        ic_full = master_full.resize((icon_sz, icon_sz), Image.Resampling.LANCZOS)
        ic_full.save(os.path.join(dir_path, "ic_launcher.png"), "PNG")

        # Save ic_launcher_round.png
        ic_rnd = master_round.resize((icon_sz, icon_sz), Image.Resampling.LANCZOS)
        ic_rnd.save(os.path.join(dir_path, "ic_launcher_round.png"), "PNG")

        # Save ic_launcher_foreground.png
        ic_fg = master_fg.resize((fg_sz, fg_sz), Image.Resampling.LANCZOS)
        ic_fg.save(os.path.join(dir_path, "ic_launcher_foreground.png"), "PNG")
        
        print(f"Generated PNG icons for {folder}: full={icon_sz}x{icon_sz}, fg={fg_sz}x{fg_sz}")

    # Also save adaptive background PNG to drawable / mipmap
    for folder, (_, fg_sz) in densities.items():
        dir_path = os.path.join(res_base, folder)
        ic_bg = master_bg.resize((fg_sz, fg_sz), Image.Resampling.LANCZOS)
        ic_bg.save(os.path.join(dir_path, "ic_launcher_background.png"), "PNG")

    print("All icons generated successfully!")

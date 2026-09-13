import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_dfc_map_icon(size=1024, is_foreground_only=False, is_round=False):
    # 1024x1024 super-sampled master
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx, cy = size / 2, size / 2

    if not is_foreground_only:
        # Background: Midnight Navy Blue Gradient with Geo-Grid
        bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        bg_draw = ImageDraw.Draw(bg)
        
        # Draw radial/linear gradient
        for y in range(size):
            factor = y / float(size)
            r = int(10 * (1 - factor) + 15 * factor)
            g = int(22 * (1 - factor) + 32 * factor)
            b = int(45 * (1 - factor) + 65 * factor)
            bg_draw.line([(0, y), (size, y)], fill=(r, g, b, 255))
            
        # Subtle GIS Grid lines
        grid_color = (0, 242, 254, 25) # cyan with low alpha
        for step in range(128, size, 128):
            bg_draw.line([(step, 0), (step, size)], fill=grid_color, width=2)
            bg_draw.line([(0, step), (size, step)], fill=grid_color, width=2)
            
        # Subtle concentric radar rings in background
        radar_color = (0, 242, 254, 30)
        for r_ring in [200, 350, 500]:
            bg_draw.ellipse([cx - r_ring, cy - r_ring, cx + r_ring, cy + r_ring], outline=radar_color, width=2)

        # Composite background
        img.paste(bg, (0, 0))

    # Master Layer for Railway Track & Map Pin
    track_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    t_draw = ImageDraw.Draw(track_layer)

    # Let's draw curved railway tracks
    # Parametric curve from bottom-left (150, 950) curving up to upper-right (874, 200)
    # Using quadratic bezier or cubic bezier
    # Points: P0=(120, 950), P1=(450, 750), P2=(600, 350), P3=(920, 150)
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
        # Derivative of cubic bezier
        dx = 3 * (u**2) * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * (t**2) * (p3[0] - p2[0])
        dy = 3 * (u**2) * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * (t**2) * (p3[1] - p2[1])
        length = math.hypot(dx, dy)
        if length == 0:
            return (1, 0)
        return (dx / length, dy / length)

    p0 = (80, 950)
    p1 = (350, 800)
    p2 = (550, 400)
    p3 = (950, 180)

    # Rail spacing (gauge width)
    gauge_half = 46

    # 1. Draw Sleepers (Railway ties)
    num_sleepers = 28
    for i in range(num_sleepers):
        t = (i + 0.5) / num_sleepers
        pt = bezier_point(t, p0, p1, p2, p3)
        tx, ty = bezier_tangent(t, p0, p1, p2, p3)
        # Normal vector (-ty, tx)
        nx, ny = -ty, tx
        
        sleeper_len = 70
        s_p1 = (pt[0] - nx * sleeper_len, pt[1] - ny * sleeper_len)
        s_p2 = (pt[0] + nx * sleeper_len, pt[1] + ny * sleeper_len)
        
        # Sleeper shadow
        t_draw.line([(s_p1[0] + 3, s_p1[1] + 5), (s_p2[0] + 3, s_p2[1] + 5)], fill=(0, 0, 0, 120), width=18)
        # Concrete sleeper (light warm grey)
        t_draw.line([s_p1, s_p2], fill=(210, 215, 225, 240), width=14)
        # Sleeper fastener clips
        for clip_offset in [-gauge_half, gauge_half]:
            cx_c = pt[0] + nx * clip_offset
            cy_c = pt[1] + ny * clip_offset
            t_draw.rectangle([cx_c - 4, cy_c - 4, cx_c + 4, cy_c + 4], fill=(255, 180, 0, 255))

    # 2. Draw Steel Rails (dual parallel lines)
    for offset in [-gauge_half, gauge_half]:
        rail_points = []
        rail_shadow = []
        for step in range(120):
            t = step / 119.0
            pt = bezier_point(t, p0, p1, p2, p3)
            tx, ty = bezier_tangent(t, p0, p1, p2, p3)
            nx, ny = -ty, tx
            rx = pt[0] + nx * offset
            ry = pt[1] + ny * offset
            rail_points.append((rx, ry))
            rail_shadow.append((rx + 3, ry + 4))
            
        # Shadow
        t_draw.line(rail_shadow, fill=(0, 0, 0, 140), width=16)
        # Steel rail base
        t_draw.line(rail_points, fill=(60, 80, 105, 255), width=14)
        # Steel rail shiny top
        t_draw.line(rail_points, fill=(230, 245, 255, 255), width=8)
        # Glowing center line
        t_draw.line(rail_points, fill=(0, 242, 254, 200), width=3)

    # 3. GPS Pin Pulse Effect (Wave Rings)
    pin_tip_x = cx - 10
    pin_tip_y = cy + 90
    
    pulse_rings = [
        (45, (0, 242, 254, 180), 6),
        (85, (0, 242, 254, 110), 4),
        (130, (0, 242, 254, 50), 3)
    ]
    for r_p, col_p, w_p in pulse_rings:
        t_draw.ellipse(
            [pin_tip_x - r_p * 1.6, pin_tip_y - r_p * 0.7, pin_tip_x + r_p * 1.6, pin_tip_y + r_p * 0.7],
            outline=col_p, width=w_p
        )

    # 4. Draw GPS Map Pin
    pin_head_cy = cy - 80
    pin_r = 135

    # Pin Shadow
    pin_shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(pin_shadow)
    s_draw.ellipse(
        [pin_tip_x - 70, pin_tip_y - 15, pin_tip_x + 90, pin_tip_y + 35],
        fill=(0, 0, 0, 160)
    )
    pin_shadow = pin_shadow.filter(ImageFilter.GaussianBlur(12))
    track_layer = Image.alpha_composite(track_layer, pin_shadow)
    t_draw = ImageDraw.Draw(track_layer)

    # Pin Polygon shape: Circle on top tapering to point at (pin_tip_x, pin_tip_y)
    # Tangent angles from (pin_tip_x, pin_tip_y) to circle centered at (cx, pin_head_cy)
    # Circle equation: (x - cx)^2 + (y - pin_head_cy)^2 = pin_r^2
    # Distance D from center to tip:
    dx_ct = pin_tip_x - cx
    dy_ct = pin_tip_y - pin_head_cy
    dist_ct = math.hypot(dx_ct, dy_ct)
    alpha = math.acos(pin_r / dist_ct)
    base_angle = math.atan2(dy_ct, dx_ct)
    
    ang1 = base_angle + alpha
    ang2 = base_angle - alpha
    
    t1_x = cx + pin_r * math.cos(ang1)
    t1_y = pin_head_cy + pin_r * math.sin(ang1)
    t2_x = cx + pin_r * math.cos(ang2)
    t2_y = pin_head_cy + pin_r * math.sin(ang2)

    # Build the pin path
    pin_poly = [(pin_tip_x, pin_tip_y), (t1_x, t1_y)]
    # arc from ang1 to ang2 around top of circle
    # we step angles counter-clockwise or clockwise
    start_deg = math.degrees(ang1)
    end_deg = math.degrees(ang2)
    if end_deg < start_deg:
        end_deg += 360
        
    for step in range(1, 40):
        frac = step / 40.0
        cur_ang = math.radians(start_deg + frac * (end_deg - start_deg))
        pin_poly.append((cx + pin_r * math.cos(cur_ang), pin_head_cy + pin_r * math.sin(cur_ang)))
        
    pin_poly.append((t2_x, t2_y))
    pin_poly.append((pin_tip_x, pin_tip_y))

    # Fill Pin with Vibrant Red/Coral Gradient
    pin_mask = Image.new("L", (size, size), 0)
    p_draw = ImageDraw.Draw(pin_mask)
    p_draw.polygon(pin_poly, fill=255)
    
    # Render Pin Gradient
    pin_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    p_grad = ImageDraw.Draw(pin_img)
    y_min = int(pin_head_cy - pin_r)
    y_max = int(pin_tip_y)
    for y in range(y_min, y_max + 1):
        f = (y - y_min) / float(y_max - y_min + 1)
        # Gradient: Vivid Coral Red (#FF1E56 to #FF5E3A)
        pr = int(255 * (1 - f) + 255 * f)
        pg = int(30 * (1 - f) + 94 * f)
        pb = int(86 * (1 - f) + 58 * f)
        p_grad.line([(int(cx - pin_r - 20), y), (int(cx + pin_r + 20), y)], fill=(pr, pg, pb, 255))
        
    # Apply pin mask
    pin_img.putalpha(pin_mask)
    track_layer = Image.alpha_composite(track_layer, pin_img)
    t_draw = ImageDraw.Draw(track_layer)

    # Pin Inner White Circle (Target)
    inner_r = 68
    t_draw.ellipse(
        [cx - inner_r, pin_head_cy - inner_r, cx + inner_r, pin_head_cy + inner_r],
        fill=(255, 255, 255, 255), outline=(240, 240, 240, 255), width=3
    )
    
    # Center Navigation Symbol / Compass Star inside Pin
    core_r = 32
    t_draw.ellipse(
        [cx - core_r, pin_head_cy - core_r, cx + core_r, pin_head_cy + core_r],
        fill=(13, 27, 42, 255) # Deep navy core
    )
    # Cyan center radar blip
    t_draw.ellipse(
        [cx - 14, pin_head_cy - 14, cx + 14, pin_head_cy + 14],
        fill=(0, 242, 254, 255)
    )

    # 5. Badges / Text: "DFC" & "MAP"
    # Try loading Arial Bold or Helvetica
    font_large = None
    font_small = None
    for fpath in [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Black.ttf",
        "/System/Library/Fonts/HelveticaNeue.ttc"
    ]:
        try:
            font_large = ImageFont.truetype(fpath, 136)
            font_small = ImageFont.truetype(fpath, 76)
            break
        except Exception:
            continue

    if font_large is None:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Sleek High-Tech Bottom Banner for Text
    # Centered at cy + 310
    banner_w = 680
    banner_h = 160
    bx0 = cx - banner_w / 2
    by0 = cy + 220
    bx1 = cx + banner_w / 2
    by1 = by0 + banner_h

    # Banner Shadow
    b_shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bs_draw = ImageDraw.Draw(b_shadow)
    bs_draw.rounded_rectangle([bx0, by0 + 8, bx1, by1 + 12], radius=36, fill=(0, 0, 0, 180))
    b_shadow = b_shadow.filter(ImageFilter.GaussianBlur(10))
    track_layer = Image.alpha_composite(track_layer, b_shadow)
    t_draw = ImageDraw.Draw(track_layer)

    # Banner Capsule
    t_draw.rounded_rectangle([bx0, by0, bx1, by1], radius=36, fill=(10, 25, 47, 245), outline=(0, 242, 254, 200), width=5)

    # Text: "DFC" in Pure White, "MAP" in Glowing Electric Cyan
    dfc_text = "DFC"
    map_text = " MAP"
    
    # Measure text
    dfc_bbox = t_draw.textbbox((0, 0), dfc_text, font=font_large)
    dfc_w = dfc_bbox[2] - dfc_bbox[0]
    map_bbox = t_draw.textbbox((0, 0), map_text, font=font_large)
    map_w = map_bbox[2] - map_bbox[0]
    
    total_w = dfc_w + map_w
    text_x = cx - total_w / 2
    text_y = by0 + (banner_h - (dfc_bbox[3] - dfc_bbox[1])) / 2 - 14

    # Drop shadows for text
    t_draw.text((text_x + 3, text_y + 4), dfc_text, font=font_large, fill=(0, 0, 0, 200))
    t_draw.text((text_x + dfc_w + 3, text_y + 4), map_text, font=font_large, fill=(0, 0, 0, 200))

    # Actual text
    t_draw.text((text_x, text_y), dfc_text, font=font_large, fill=(255, 255, 255, 255))
    t_draw.text((text_x + dfc_w, text_y), map_text, font=font_large, fill=(0, 242, 254, 255))

    # Top Sub-badge: "RAILWAY GIS TRACKER"
    sub_text = "RAILWAY GIS"
    sub_bbox = t_draw.textbbox((0, 0), sub_text, font=font_small)
    sub_w = sub_bbox[2] - sub_bbox[0]
    sub_x = cx - sub_w / 2
    sub_y = 65
    
    # Sub badge pill
    sp_pad_x = 28
    sp_pad_y = 10
    t_draw.rounded_rectangle(
        [sub_x - sp_pad_x, sub_y - sp_pad_y, sub_x + sub_w + sp_pad_x, sub_y + (sub_bbox[3] - sub_bbox[1]) + sp_pad_y],
        radius=24, fill=(15, 30, 55, 230), outline=(255, 215, 0, 200), width=3
    )
    t_draw.text((sub_x, sub_y), sub_text, font=font_small, fill=(255, 215, 0, 255))

    # Composite layers
    img = Image.alpha_composite(img, track_layer)

    if is_round:
        # Create circular mask
        mask = Image.new("L", (size, size), 0)
        m_draw = ImageDraw.Draw(mask)
        m_draw.ellipse([12, 12, size - 12, size - 12], fill=255)
        # Apply circular mask
        final_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        final_img.paste(img, (0, 0), mask=mask)
        return final_img

    return img

if __name__ == "__main__":
    # Test generation of master icons
    master = create_dfc_map_icon(1024, is_foreground_only=False, is_round=False)
    master.save("/Users/vivekazad/Desktop/Vani/dfc_map_master_1024.png", "PNG")
    print("Created dfc_map_master_1024.png successfully")

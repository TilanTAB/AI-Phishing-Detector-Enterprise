"""Generate Marketplace icons from SVG source."""
import cairosvg
from PIL import Image, ImageDraw, ImageFont
import os

ICON_SVG = os.path.join(os.path.dirname(__file__), "icon.svg")
OUT_DIR = "D:/AIProjects/PhishingChecker/docs/screenshots"

# Icon sizes required by Marketplace
ICON_SIZES = [32, 48, 96, 128]

# Generate square icons
for size in ICON_SIZES:
    out_path = os.path.join(OUT_DIR, f"icon_{size}x{size}.png")
    cairosvg.svg2png(
        url=ICON_SVG,
        write_to=out_path,
        output_width=size,
        output_height=size,
    )
    print(f"Created {out_path}")

# Generate banner (220x140)
# Render icon at 100px, center on 220x140 canvas with gradient-like background
icon_bytes = cairosvg.svg2png(url=ICON_SVG, output_width=100, output_height=100)

# Create banner canvas
banner = Image.new("RGBA", (220, 140), (245, 245, 245, 255))

# Paste icon centered horizontally, slightly above center vertically
from io import BytesIO
icon_img = Image.open(BytesIO(icon_bytes)).convert("RGBA")
icon_x = (220 - 100) // 2
icon_y = 8
banner.paste(icon_img, (icon_x, icon_y), icon_img)

# Add text "Phishing Checker" below the icon
draw = ImageDraw.Draw(banner)
text = "Phishing Checker"
try:
    font = ImageFont.truetype("arial.ttf", 14)
except OSError:
    font = ImageFont.load_default()

bbox = draw.textbbox((0, 0), text, font=font)
text_width = bbox[2] - bbox[0]
text_x = (220 - text_width) // 2
text_y = 114
draw.text((text_x, text_y), text, fill=(51, 51, 51, 255), font=font)

banner_path = os.path.join(OUT_DIR, "banner_220x140.png")
banner.save(banner_path)
print(f"Created {banner_path}")

print("Done — all icons generated.")

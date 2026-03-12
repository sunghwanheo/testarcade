from PIL import Image
import os

nobg_dir = r"D:\github\Web\ActiveArcade\graphic\nobg"

files = [f for f in os.listdir(nobg_dir) if f.endswith(".png")]

for fname in files:
    path = os.path.join(nobg_dir, fname)
    img = Image.open(path).convert("RGBA")
    bbox = img.getbbox()
    if bbox:
        cropped = img.crop(bbox)
        cropped.save(path)
        print(f"{fname}: {img.size} -> {cropped.size}")
    else:
        print(f"{fname}: empty image, skipped")

print(f"\nDone! {len(files)} images trimmed.")

from rembg import remove
from PIL import Image
import os

graphic_dir = r"D:\github\Web\ActiveArcade\graphic"
output_dir = os.path.join(graphic_dir, "nobg")
os.makedirs(output_dir, exist_ok=True)

files = [f for f in os.listdir(graphic_dir) if f.endswith(".png")]

for fname in files:
    input_path = os.path.join(graphic_dir, fname)
    output_path = os.path.join(output_dir, fname)

    print(f"Processing: {fname}...")
    img = Image.open(input_path)
    result = remove(img)
    result.save(output_path)
    print(f"  -> Saved: {output_path}")

print(f"\nDone! {len(files)} images processed.")

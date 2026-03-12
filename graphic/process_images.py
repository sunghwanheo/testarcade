import os
from pathlib import Path
from PIL import Image
from rembg import remove
import numpy as np

def tight_crop(img):
    """Crops the image to its non-transparent bounds."""
    # Ensure the image is in RGBA mode
    img = img.convert("RGBA")
    
    # Get the bounding box of the non-zero alpha channel
    bbox = img.getbbox()
    if bbox:
        return img.crop(bbox)
    return img

def process_images(src_dir, dest_dir):
    """Removes background and tight-crops images from src_dir to dest_dir."""
    src_path = Path(src_dir)
    dest_path = Path(dest_dir)
    os.makedirs(dest_path, exist_ok=True)
    
    print(f"Processing images from {src_path} and saving to {dest_path}")
    
    for ext in ["*.png", "*.jpg", "*.jpeg"]:
        for file_path in src_path.glob(ext):
            print(f"Processing {file_path.name}...")
            try:
                # 1. Open image
                with Image.open(file_path) as img:
                    # 2. Remove background using rembg
                    # Note: rembg's remove function takes bytes or Image and returns it
                    img_nobg = remove(img)
                    
                    # 3. Tight crop (재단)
                    cropped_img = tight_crop(img_nobg)
                    
                    # 4. Save
                    # Force output to PNG for transparency support
                    save_path = dest_path / (file_path.stem + ".png")
                    cropped_img.save(save_path, "PNG")
                    print(f"  Successfully saved to {save_path}")
            except Exception as e:
                print(f"  Failed to process {file_path.name}: {e}")

if __name__ == "__main__":
    SRC = r"d:\github\Web\ActiveArcade\graphic\casual"
    DEST = r"d:\github\Web\ActiveArcade\graphic\casualnobg"
    process_images(SRC, DEST)

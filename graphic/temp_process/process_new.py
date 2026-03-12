import os
from pathlib import Path
from PIL import Image
from rembg import remove

def process_and_resize(input_path, output_path, ref_size=(640, 640)):
    print(f"Processing {input_path}...")
    with Image.open(input_path) as img:
        # 1. Remove background
        img_nobg = remove(img)
        
        # 2. Tight crop
        bbox = img_nobg.getbbox()
        if bbox:
            img_cropped = img_nobg.crop(bbox)
        else:
            img_cropped = img_nobg
            
        # 3. Resize to match reference size (maintaining aspect ratio or forced?)
        # For game assets, usually we want them centered in a fixed square or just the tight crop.
        # The user asked for "same size", which usually means the canvas size or the visual scale.
        # Since the 100 version is 640x640, let's make these 640x640 with the content centered.
        
        # Create a new transparent 640x640 canvas
        canvas = Image.new("RGBA", ref_size, (0, 0, 0, 0))
        
        # Calculate scaling to fit nicely (e.g. 90% of the canvas)
        max_size = int(ref_size[0] * 0.9)
        width, height = img_cropped.size
        scale = min(max_size / width, max_size / height)
        new_size = (int(width * scale), int(height * scale))
        
        img_resized = img_cropped.resize(new_size, Image.Resampling.LANCZOS)
        
        # Paste centered
        offset = ((ref_size[0] - new_size[0]) // 2, (ref_size[1] - new_size[1]) // 2)
        canvas.paste(img_resized, offset, img_resized)
        
        # Save
        canvas.save(output_path, "PNG")
        print(f"Saved to {output_path}")

if __name__ == "__main__":
    BASE_DIR = r"d:\github\Web\ActiveArcade\graphic"
    TEMP_DIR = Path(BASE_DIR) / "temp_process"
    CASUAL_DIR = Path(BASE_DIR) / "casual"
    CASUALNOBG_DIR = Path(BASE_DIR) / "casualnobg"
    
    mapping = {
        "input_file_1.png": "s1_snow_round_75.png",
        "input_file_2.png": "s1_snow_round_50.png",
        "input_file_0.png": "s1_snow_round_25.png"
    }
    
    for input_name, output_name in mapping.items():
        input_p = TEMP_DIR / input_name
        if not input_p.exists():
            print(f"Error: {input_p} does not exist.")
            continue
            
        # Save to casual (with background, but user asked for "content similar", usually implies the processed version)
        # Actually, let's follow the user's previous flow: save to casual then process to casualnobg.
        # But here I'm doing rembg anyway.
        
        dest_casual = CASUAL_DIR / output_name
        process_and_resize(input_p, dest_casual)
        
        # Also save to casualnobg (tight crop only)
        dest_nobg = CASUALNOBG_DIR / output_name
        with Image.open(dest_casual) as img:
            # Re-crop to be tight for nobg folder
            bbox = img.getbbox()
            if bbox:
                img.crop(bbox).save(dest_nobg, "PNG")

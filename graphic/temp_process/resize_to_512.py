from PIL import Image
import os

def resize_assets(file_list, target_max_size=512):
    for file_path in file_list:
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            continue
            
        with Image.open(file_path) as img:
            width, height = img.size
            if width > target_max_size or height > target_max_size:
                # Calculate new size maintaining aspect ratio
                if width > height:
                    new_width = target_max_size
                    new_height = int(height * (target_max_size / width))
                else:
                    new_height = target_max_size
                    new_width = int(width * (target_max_size / height))
                
                img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                img_resized.save(file_path, "PNG")
                print(f"Resized {os.path.basename(file_path)} to {new_width}x{new_height}")
            else:
                print(f"{os.path.basename(file_path)} is already {width}x{height}, skipping.")

if __name__ == "__main__":
    assets = [
        r"d:\github\Web\ActiveArcade\graphic\casualnobg\s1_snow_round_25.png",
        r"d:\github\Web\ActiveArcade\graphic\casualnobg\s1_snow_round_50.png",
        r"d:\github\Web\ActiveArcade\graphic\casualnobg\s1_snow_round_75.png",
        r"d:\github\Web\ActiveArcade\graphic\casualnobg\s1_snow_round_100.png"
    ]
    resize_assets(assets)

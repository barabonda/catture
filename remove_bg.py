from rembg import remove
from PIL import Image

input_path = 'public/cat_character.png'
output_path = 'public/cat_character.png'

try:
    input_image = Image.open(input_path)
    output_image = remove(input_image)
    output_image.save(output_path)
    print("Background removed successfully!")
except Exception as e:
    print(f"Error: {e}")

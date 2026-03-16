import sys
from rembg import remove
from PIL import Image

input_path = sys.argv[1]
output_path = sys.argv[2]

input_image = Image.open(input_path)

output = remove(input_image)

output.save(output_path)
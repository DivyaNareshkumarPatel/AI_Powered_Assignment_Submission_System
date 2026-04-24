import os
import base64
from ai_model import grader
import fitz

doc = fitz.open()
page = doc.new_page()
page.insert_text((50, 50), "Q1: What is the sky? A1: Blue.", fontsize=24)
pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
base64_img = base64.b64encode(pix.tobytes("jpeg")).decode('utf-8')

print("Sending to Vision API...")
result = grader.extract_text_from_image(base64_img)
print("VISION TEXT:", result)

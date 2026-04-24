import os
import json
from ai_model import grader

text = """
Q1: What is 2+2?
A: 4

Q2: What is the capital of France?
A: Paris
"""

result = grader.parse_qa_from_text(text)
print("EXTRACTED:")
print(json.dumps(result, indent=2))

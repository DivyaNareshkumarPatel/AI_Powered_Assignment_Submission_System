from sentence_transformers import SentenceTransformer

print("⏳ Downloading model for the first time...")
model = SentenceTransformer('all-MiniLM-L6-v2')

# Save it to a folder named 'model_brain' right next to your script
model.save("model_brain")
print("✅ Model saved to 'model_brain' folder!")
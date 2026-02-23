import cv2
import numpy as np
from deepface import DeepFace
from scipy.spatial.distance import cosine

# Note: We completely removed the in-memory 'registered_faces' dictionary!

def decode_image_bytes(image_bytes: bytes):
    """Helper function to convert raw bytes into an OpenCV image array."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def generate_face_embedding(image_bytes: bytes) -> dict:
    """
    Extracts a face from the image and returns its mathematical embedding.
    Node.js will save this embedding in the PostgreSQL database.
    """
    try:
        img = decode_image_bytes(image_bytes)
        
        # Extract the face embedding using Facenet (creates a 512-dimensional vector)
        embedding_objs = DeepFace.represent(
            img_path=img, 
            model_name="Facenet", 
            enforce_detection=True, 
            detector_backend="opencv"
        )
        
        if len(embedding_objs) > 1:
            return {"status": "ERROR", "message": "Multiple faces detected! Please ensure only the student is in the frame."}
            
        # Get the actual embedding array
        embedding = embedding_objs[0]["embedding"]
        
        return {"status": "SUCCESS", "embedding": embedding}
        
    except ValueError:
        return {"status": "ERROR", "message": "No face found. Please look directly at the camera with good lighting."}
    except Exception as e:
        return {"status": "ERROR", "message": str(e)}

def verify_student_face(stored_embedding: list, live_image_bytes: bytes) -> str:
    """
    Verifies a live webcam photo against the embedding stored in PostgreSQL.
    """
    try:
        live_img = decode_image_bytes(live_image_bytes)
        
        # 1. Get the embedding of the live webcam image
        live_embedding_objs = DeepFace.represent(
            img_path=live_img, 
            model_name="Facenet", 
            enforce_detection=True, 
            detector_backend="opencv"
        )
        live_embedding = live_embedding_objs[0]["embedding"]
        
        # 2. Compare the live embedding with the stored embedding from the database
        # We use Cosine Distance. For Facenet, a distance < 0.40 is generally a match.
        distance = cosine(stored_embedding, live_embedding)
        threshold = 0.40 
        
        if distance <= threshold:
            return "OK" # It's the same person!
        else:
            return "WRONG_PERSON" # Faces don't match
            
    except ValueError:
        return "NO_FACE" # DeepFace couldn't find a face in the live video
    except Exception as e:
        print(f"Face Check Error: {e}")
        return "ERROR"
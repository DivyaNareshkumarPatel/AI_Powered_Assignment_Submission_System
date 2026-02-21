import cv2
import numpy as np
from deepface import DeepFace

# --- IN-MEMORY DATABASE ---
registered_faces = {}

def decode_image_bytes(image_bytes: bytes):
    """Helper function to convert raw bytes into an OpenCV image array."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def register_student_face(student_id: str, image_bytes: bytes) -> dict:
    """Extracts a face and stores it in the in-memory dictionary."""
    try:
        img = decode_image_bytes(image_bytes)
        
        faces = DeepFace.extract_faces(img_path=img, enforce_detection=True, detector_backend="opencv")
        
        if len(faces) > 1: 
            return {"status": "ERROR", "message": "Multiple faces detected!"}
            
        registered_faces[student_id] = img
        return {"status": "SUCCESS", "message": f"Student {student_id} registered successfully."}
        
    except ValueError:
        return {"status": "ERROR", "message": "No face found. Please try again."}
    except Exception as e:
        return {"status": "ERROR", "message": str(e)}

def verify_student_face(student_id: str, image_bytes: bytes) -> str:
    """Verifies a live face against the stored face for the given student ID."""
    if student_id not in registered_faces:
        return "UNREGISTERED"

    try:
        live_img = decode_image_bytes(image_bytes)
        result = DeepFace.verify(
            img1_path=registered_faces[student_id], 
            img2_path=live_img, 
            model_name="Facenet",
            detector_backend="opencv", 
            enforce_detection=False 
        )
        if not result["verified"]: 
            return "WRONG_PERSON"
            
        return "OK"
        
    except Exception as e:
        print(f"Face Check Error: {e}")
        return "NO_FACE"
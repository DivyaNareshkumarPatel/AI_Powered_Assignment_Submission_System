import os
import shutil
import fitz  # PyMuPDF
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import uuid
import uvicorn
import re
from dotenv import load_dotenv

# Import our custom modules
from ai_model import grader
from face_recognition import register_student_face, verify_student_face

# Load environment variables
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print("✅ SYSTEM READY! MODULAR GRADING API ACTIVE.")

# =====================================================
# 🌐 FASTAPI ENDPOINTS
# =====================================================

@app.post("/register-face")
async def register_face(student_id: str = Form(...), image: UploadFile = File(...)):
    image_bytes = await image.read()
    result = register_student_face(student_id, image_bytes)
    return result

@app.post("/grade")
async def grade(
    question: str = Form(...), 
    user_text: str = Form(...), 
    correct_answer: str = Form(...),
    student_id: str = Form(...), 
    image: UploadFile = File(...) 
):
    try:
        # 1. Face Verification
        image_bytes = await image.read()
        face_status = verify_student_face(student_id, image_bytes)

        # 2. AI Grading
        grading_result = grader.get_score(question, user_text, correct_answer)
        score = grading_result["final_score"]
        feedback = grading_result["feedback"]
        details = grading_result.get("details", {})

        # 3. Calculate breakdown for UI mapping
        primary_points = details.get("primary_points", [])
        constraints = details.get("question_constraints", {})
        global_req = constraints.get("global_required", 0) or 0
        groups = constraints.get("groups", [])
        
        req_primary = global_req if global_req > 0 else sum(g.get("required", 0) or 0 for g in groups)
        if req_primary == 0:
            req_primary = len(primary_points)
            
        stud_primary = sum(1 for p in primary_points if p.get("status", "").lower() in ["correct", "partially_correct"])
        stud_primary = min(stud_primary, req_primary) if req_primary > 0 else stud_primary

        return {
            "score": score, 
            "feedback": feedback,
            "face_status": face_status,
            "breakdown": {
                "student_primary": stud_primary,
                "required_primary": req_primary,
                "student_secondary": 0, 
                "required_secondary": 0
            }
        }
    except Exception as e:
        return {"score": 0, "feedback": str(e), "face_status": "ERROR", "breakdown": {}}

@app.post("/process-pdf")
async def process_pdf(file: UploadFile = File(...)):
    unique_filename = f"temp_{uuid.uuid4()}.pdf"
    try:
        with open(unique_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        doc = fitz.open(unique_filename)
        raw_text = "\n".join([page.get_text() for page in doc])
        doc.close()
        os.remove(unique_filename)

        pattern = r"(?is)\bQ(?:uestion)?\s*\d*[:.)-]\s*(.*?)\bA(?:nswer|ns)?\s*[:.)-]\s*(.*?)(?=\bQ(?:uestion)?\s*\d*[:.)-]|\Z)"
        matches = re.findall(pattern, raw_text)
        
        cleaned_data = []
        for q, a in matches:
            clean_q = " ".join(q.split())
            clean_a = " ".join(a.split())
            if len(clean_q) > 3 and len(clean_a) > 2:
                cleaned_data.append({"question": clean_q, "answer": clean_a})

        return cleaned_data
    except Exception as e:
        print(f"PDF Error: {e}")
        return []

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host=host, port=port)
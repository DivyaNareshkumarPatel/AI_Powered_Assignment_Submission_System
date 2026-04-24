import os
import shutil
import fitz  # PyMuPDF
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uuid
import uvicorn
import re
import json
import base64
from dotenv import load_dotenv

# Import custom modules
from ai_model import grader
from face_recognition import generate_face_embedding, verify_student_face

# Load environment variables
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print("✅ SYSTEM READY! HOLISTIC AI GRADING API ACTIVE.")

# =====================================================
# 🌐 FACE REGISTRATION
# =====================================================

@app.post("/generate_embedding")
async def register_face(file: UploadFile = File(...)):
    """
    Generate mathematical face embedding during student registration.
    """
    try:
        image_bytes = await file.read()
        result = generate_face_embedding(image_bytes)

        if result.get("status") == "ERROR":
            raise HTTPException(status_code=400, detail=result.get("message"))

        return JSONResponse(content={"embedding": result.get("embedding")})

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# 🧠 HOLISTIC GRADING + FACE VERIFICATION
# =====================================================

@app.post("/grade")
async def grade(
    question: str = Form(...),
    user_text: str = Form(...),
    correct_answer: str = Form(...),
    max_marks: int = Form(...),
    stored_embedding: str = Form(...),
    image: UploadFile = File(...)
):
    """
    Grades answer holistically and verifies face simultaneously.
    """

    try:
        # -------------------------
        # 1️⃣ FACE VERIFICATION
        # -------------------------
        embedding_list = json.loads(stored_embedding)
        image_bytes = await image.read()
        face_status = verify_student_face(embedding_list, image_bytes)

        # -------------------------
        # 2️⃣ AI HOLISTIC GRADING
        # -------------------------
        grading_result = grader.get_score(
            question=question,
            student_answer=user_text,
            teacher_answer=correct_answer,
            max_marks=max_marks
        )

        # Safety validation
        if not isinstance(grading_result, dict):
            raise Exception("Invalid grading response format")

        return {
            "score": grading_result.get("final_marks", 0),
            "max_marks": grading_result.get("max_marks", max_marks),
            "semantic_match_percentage": grading_result.get("semantic_match_percentage", 0),
            "conceptual_match_score": grading_result.get("conceptual_match_score", 0),
            "is_fatal_contradiction": grading_result.get("is_fatal_contradiction", False),
            "feedback": grading_result.get("ai_feedback", "No feedback generated."),
            "face_status": face_status
        }

    except Exception as e:
        print(f"Grading Route Error: {e}")
        return {
            "score": 0,
            "max_marks": max_marks,
            "semantic_match_percentage": 0,
            "conceptual_match_score": 0,
            "is_fatal_contradiction": False,
            "feedback": f"Grading error: {str(e)}",
            "face_status": "ERROR"
        }


# =====================================================
# 📄 PDF PROCESSING
# =====================================================

@app.post("/process-pdf")
async def process_pdf(file: UploadFile = File(...)):
    """
    Extract Question/Answer pairs from PDF.
    """

    unique_filename = f"temp_{uuid.uuid4()}.pdf"

    try:
        with open(unique_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        doc = fitz.open(unique_filename)
        
        extracted_texts = []
        for page in doc:
            page_text = page.get_text().strip()
            
            # ALWAYS run Vision API. Scanned PDFs or worksheets often have mixed typed/handwritten 
            # text or watermarks, which trick the len(page_text) < 20 check.
            print(f"\n[OCR] Extracting text and handwriting from page via Vision API...")
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            img_bytes = pix.tobytes("jpeg")
            base64_img = base64.b64encode(img_bytes).decode('utf-8')
            vision_text = grader.extract_text_from_image(base64_img)
            
            # Combine both to ensure nothing is missed
            extracted_texts.append(f"{page_text}\n{vision_text}")

        raw_text = "\n".join(extracted_texts)
        doc.close()
        os.remove(unique_filename)

        print("\n=== RAW PDF TEXT ===")
        print(raw_text)
        print("====================\n")

        # Use Groq LLM to intelligently extract Q&A pairs regardless of formatting
        cleaned_data = grader.parse_qa_from_text(raw_text)

        print("\n=== EXTRACTED Q&A ===")
        print(json.dumps(cleaned_data, indent=2))
        print("=====================\n")

        return cleaned_data

    except Exception as e:
        print(f"PDF Error: {e}")
        return []


# =====================================================
# 👁 CONTINUOUS FACE VERIFICATION
# =====================================================

@app.post("/verify_face")
async def verify_face(
    stored_embedding: str = Form(...),
    image: UploadFile = File(...)
):
    """
    Dedicated endpoint for continuous face verification.
    """

    try:
        embedding_list = json.loads(stored_embedding)
        image_bytes = await image.read()

        face_status = verify_student_face(embedding_list, image_bytes)

        return {"status": face_status}

    except Exception as e:
        print(f"Verify Face Route Error: {e}")
        return {"status": "ERROR"}


# =====================================================
# 📝 BACKGROUND TEXT-ONLY GRADING (For Cron Job)
# =====================================================

@app.post("/grade_text")
async def grade_text(
    question: str = Form(...),
    user_text: str = Form(...),
    correct_answer: str = Form(...),
    max_marks: int = Form(...)
):
    """
    Dedicated endpoint for grading text ONLY. Bypasses face verification.
    This is called by the Node.js background Cron Job to handle high-volume grading.
    """
    try:
        # Call the Groq LLM logic directly
        grading_result = grader.get_score(
            question=question,
            student_answer=user_text,
            teacher_answer=correct_answer,
            max_marks=max_marks
        )

        # Safety validation
        if not isinstance(grading_result, dict):
            raise Exception("Invalid grading response format")

        return {
            "score": grading_result.get("final_marks", 0),
            "max_marks": grading_result.get("max_marks", max_marks),
            "semantic_match_percentage": grading_result.get("semantic_match_percentage", 0),
            "conceptual_match_score": grading_result.get("conceptual_match_score", 0),
            "is_fatal_contradiction": grading_result.get("is_fatal_contradiction", False),
            "feedback": grading_result.get("ai_feedback", "No feedback generated."),
            "breakdown": grading_result # Send the full breakdown back to Node
        }

    except Exception as e:
        print(f"Background Grading Error: {e}")
        return {
            "score": 0,
            "max_marks": max_marks,
            "semantic_match_percentage": 0,
            "conceptual_match_score": 0,
            "is_fatal_contradiction": False,
            "feedback": f"Grading error: {str(e)}",
            "breakdown": {}
        }

# =====================================================
# 🚀 SERVER START
# =====================================================

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host=host, port=port)
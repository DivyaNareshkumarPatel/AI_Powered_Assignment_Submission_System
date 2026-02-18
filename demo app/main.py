import os
import shutil
import fitz  # PyMuPDF
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
import uuid
import uvicorn
import cv2
import numpy as np
import re
from sentence_transformers import SentenceTransformer, util

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AI MODELS ---
print("⏳ Loading AI Models...")
if os.path.exists("./model_brain"):
    semantic_model = SentenceTransformer("./model_brain")
else:
    semantic_model = SentenceTransformer('all-MiniLM-L6-v2')
    semantic_model.save("./model_brain")

whisper_model = WhisperModel("small", device="cpu", compute_type="int8")

# 🟢 FACE DETECTION
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

print("✅ SYSTEM READY!")

class SentenceFactGrader:
    def __init__(self):
        self.model = semantic_model
        # Verbs that imply a full sentence is being spoken
        self.verb_checks = ["is", "are", "was", "were", "uses", "use", "contains", "has", "have", "differs"]
        # Words to ignore in strict keyword checking
        self.stop_words = set(["a", "an", "the", "in", "on", "at", "to", "for", "of", "and", "but", "is", "are", "it", "that", "this"])

    def split_into_facts(self, text):
        """Splits answer into logical scoring units."""
        sentences = re.split(r'[.!?;]', text)
        facts = []
        for sent in sentences:
            sent = sent.strip()
            if not sent: continue
            
            # Split complex sentences by connectors
            if "while" in sent or "whereas" in sent:
                parts = re.split(r'\s+(?:while|whereas)\s+', sent)
                for p in parts:
                    if len(p.split()) > 3: facts.append(p.strip())
            elif " and " in sent and len(sent.split()) > 10:
                parts = sent.split(" and ")
                for p in parts:
                    if len(p.split()) > 3: facts.append(p.strip())
            else:
                if len(sent.split()) > 2: facts.append(sent)
        return facts

    def has_proper_structure(self, text):
        text_lower = text.lower()
        return any(verb in text_lower for verb in self.verb_checks)

    def check_keyword_overlap(self, ref_fact, stud_text):
        """
        Calculates percentage of 'content words' from reference found in student text.
        """
        # Clean and Tokenize Reference (Remove stop words)
        ref_tokens = [w.lower() for w in re.findall(r'\w+', ref_fact) if w.lower() not in self.stop_words]
        
        # If reference is too short (e.g. "It is."), skip keyword check
        if len(ref_tokens) < 2: return 1.0

        # Clean and Tokenize Student Input
        stud_tokens = set([w.lower() for w in re.findall(r'\w+', stud_text)])

        # Count Matches
        matches = [w for w in ref_tokens if w in stud_tokens]
        
        # Calculate Overlap Ratio
        return len(matches) / len(ref_tokens)

    def get_score(self, student_text, correct_answer_raw):
        if not student_text or len(student_text.strip()) < 2:
            return 0.0, "No answer provided."

        # 1. ZERO TOLERANCE STRUCTURE CHECK
        if not self.has_proper_structure(student_text):
            return 0.0, "Structure Error: You are speaking keywords (0/10). Please speak full sentences."

        # 2. EXTRACT FACTS
        ref_facts = self.split_into_facts(correct_answer_raw)
        total_facts = len(ref_facts)
        if total_facts == 0:
            ref_facts = [correct_answer_raw]
            total_facts = 1

        # 3. CHECK EACH FACT
        matched_count = 0
        missing_facts = []

        student_emb = self.model.encode(student_text)

        for fact in ref_facts:
            fact_emb = self.model.encode(fact)
            
            # A. Semantic Score
            sim = util.cos_sim(student_emb, fact_emb).item()
            
            # B. Keyword Integrity (Strict)
            overlap = self.check_keyword_overlap(fact, student_text)

            # 🟢 STRICTER LOGIC: NO BYPASS
            # You ONLY pass if you have good meaning (>0.60) AND good keywords (>0.60).
            # Even if semantic is 0.99, if overlap is 0.5, you FAIL.
            
            if sim > 0.60 and overlap > 0.60:
                matched_count += 1
            else:
                missing_facts.append(fact)

        # 4. SCORING
        final_score = (matched_count / total_facts) * 10
        final_score = round(final_score, 1)

        # 5. FEEDBACK
        if matched_count == total_facts:
            feedback = "Excellent! You covered all points correctly."
        elif matched_count == 0:
            feedback = "Incorrect. You missed the key concepts."
        else:
            short_miss = missing_facts[0] if len(missing_facts[0]) < 50 else missing_facts[0][:50] + "..."
            feedback = f"You covered {matched_count}/{total_facts} points. You missed: '{short_miss}'"

        return final_score, feedback

grader = SentenceFactGrader()

# --- ENDPOINTS ---

@app.post("/check-face")
async def check_face(image: UploadFile = File(...)):
    try:
        image_bytes = await image.read()
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 5)
        if len(faces) == 0: return {"status": "NO_FACE"}
        if len(faces) > 1: return {"status": "MULTIPLE_FACES"}
        return {"status": "OK"}
    except: return {"status": "ERROR"}

@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    unique_wav = f"temp_{uuid.uuid4()}.wav"
    try:
        with open(unique_wav, "wb") as b: shutil.copyfileobj(audio.file, b)
        segments, _ = whisper_model.transcribe(unique_wav, language="en")
        text = " ".join([s.text for s in segments]).strip()
        os.remove(unique_wav)
        return {"text": text if text else ""}
    except: return {"text": ""}

@app.post("/grade")
async def grade(
    user_text: str = Form(...), 
    correct_answer: str = Form(...),
    image: UploadFile = File(...) 
):
    try:
        image_bytes = await image.read()
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 5)
        face_status = "OK" if len(faces) == 1 else ("NO_FACE" if len(faces) == 0 else "MULTIPLE_FACES")

        score, feedback = grader.get_score(user_text, correct_answer)

        return {
            "score": score, 
            "feedback": feedback,
            "face_status": face_status
        }
    except Exception as e:
        return {"score": 0, "feedback": str(e), "face_status": "ERROR"}

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
    except: return []

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
import os
import re
import json
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv()


class GradingAgent:
    def __init__(self):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.model_name = os.getenv("AI_MODEL_NAME", "llama-3.1-8b-instant")
        self.prompt_file = "prompt_template.txt"

    # --------------------------------------------------
    # BUILD PROMPT
    # --------------------------------------------------
    def build_prompt(self, question, student_answer, teacher_answer, max_marks):

        if not os.path.exists(self.prompt_file):
            raise FileNotFoundError(f"Missing {self.prompt_file}! Please create it.")

        with open(self.prompt_file, "r", encoding="utf-8") as file:
            prompt = file.read()

        prompt = prompt.replace("{{QUESTION}}", question)
        prompt = prompt.replace("{{TEACHER_REFERENCE}}", teacher_answer)
        prompt = prompt.replace("{{STUDENT_ANSWER}}", student_answer)
        prompt = prompt.replace("{{MAX_MARKS}}", str(max_marks))

        return prompt

    # --------------------------------------------------
    # SAFE JSON PARSE
    # --------------------------------------------------
    def safe_json_parse(self, text):
        try:
            cleaned = text.strip()
            cleaned = cleaned.replace("```json", "").replace("```", "")
            return json.loads(cleaned)
        except Exception:
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group())
                except:
                    pass
        return None

    # --------------------------------------------------
    # MAIN GRADING FUNCTION
    # --------------------------------------------------
    def get_score(self, question, student_answer, teacher_answer, max_marks):

        # Basic empty-answer guard
        if not student_answer or len(student_answer.strip()) < 5:
            return {
                "reasoning": "No meaningful content provided.",
                "conceptual_match_score": 0,
                "semantic_match_percentage": 0,
                "final_marks": 0.0,
                "max_marks": max_marks,
                "is_fatal_contradiction": False,
                "ai_feedback": "No meaningful answer was submitted."
            }

        try:
            prompt = self.build_prompt(
                question,
                student_answer,
                teacher_answer,
                max_marks
            )
        except FileNotFoundError as e:
            return {
                "reasoning": str(e),
                "conceptual_match_score": 0,
                "semantic_match_percentage": 0,
                "final_marks": 0.0,
                "max_marks": max_marks,
                "is_fatal_contradiction": False,
                "ai_feedback": str(e)
            }

        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a university-level grading engine. Always return valid JSON only."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.0,
                response_format={"type": "json_object"}
            )

            raw_text = response.choices[0].message.content
            ai_response = self.safe_json_parse(raw_text)

            if not ai_response:
                raise Exception("AI returned invalid JSON.")

            # ---- Safety clamp layer ----
            final_marks = float(ai_response.get("final_marks", 0))
            final_marks = max(0.0, min(final_marks, float(max_marks)))

            ai_response["final_marks"] = round(final_marks, 1)
            ai_response["max_marks"] = max_marks

            # Ensure required fields exist
            required_fields = [
                "reasoning",
                "conceptual_match_score",
                "semantic_match_percentage",
                "final_marks",
                "max_marks",
                "is_fatal_contradiction",
                "ai_feedback"
            ]

            for field in required_fields:
                if field not in ai_response:
                    raise Exception(f"Missing field in AI response: {field}")

            print("\n--- 🤖 HOLISTIC AI GRADING RESULT ---")
            print(json.dumps(ai_response, indent=2))
            print("-------------------------------------\n")

            return ai_response

        except Exception as e:
            return {
                "reasoning": "System grading error.",
                "conceptual_match_score": 0,
                "semantic_match_percentage": 0,
                "final_marks": 0.0,
                "max_marks": max_marks,
                "is_fatal_contradiction": False,
                "ai_feedback": f"Grading failed: {str(e)}"
            }

    # --------------------------------------------------
    # EXTRACT TEXT FROM IMAGE (Using Gemini Vision)
    # --------------------------------------------------
    def extract_text_from_image(self, base64_image):
        import google.generativeai as genai
        
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        if not gemini_api_key:
            print("Vision API Error: GEMINI_API_KEY not found in environment.")
            return ""
            
        genai.configure(api_key=gemini_api_key)
        
        try:
            model = genai.GenerativeModel('gemini-flash-latest')
            response = model.generate_content([
                {"mime_type": "image/jpeg", "data": base64_image},
                "Extract and transcribe all handwritten and printed text from this image exactly as it appears. Do not add any extra commentary or markdown formatting."
            ])
            return response.text
        except Exception as e:
            print(f"Vision API Error: {e}")
            return ""

    # --------------------------------------------------
    # PARSE Q&A USING LLM
    # --------------------------------------------------
    def parse_qa_from_text(self, text):
        prompt = f"""
        You are a document parsing engine. Your job is to extract all the Question and Answer pairs from the following text.
        Return ONLY a JSON array of objects, where each object has a 'question' key and an 'answer' key.
        If the student only provided answers without explicitly writing out the questions, infer the question based on the context or label it as "Question 1", "Question 2", etc.
        If you cannot find any clear questions or answers, return an empty array [].
        Do not include any explanation or markdown formatting outside the JSON array.
        
        TEXT:
        {text}
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a precise JSON parsing assistant. Always return valid JSON only."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.0
            )
            raw_text = response.choices[0].message.content
            cleaned = raw_text.strip().replace("```json", "").replace("```", "")
            
            # Find the JSON array part
            match = re.search(r"\[.*\]", cleaned, re.DOTALL)
            if match:
                data = json.loads(match.group())
            else:
                data = json.loads(cleaned)
                
            if isinstance(data, list):
                return data
            return []
        except Exception as e:
            print(f"LLM Parsing Error: {e}")
            return []


# Singleton instance
grader = GradingAgent()
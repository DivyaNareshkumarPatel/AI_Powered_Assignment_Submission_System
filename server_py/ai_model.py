import os
import re
import json
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv()

class GradingAgent:
    def __init__(self):
        # Initialize the official Groq client
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.model_name = os.getenv("AI_MODEL_NAME", "llama-3.1-8b-instant")
        self.prompt_file = "prompt_template.txt"

    def build_prompt(self, question, student_text, correct_answer_raw):
        if not os.path.exists(self.prompt_file):
            raise FileNotFoundError(f"Missing {self.prompt_file}! Please create it.")
            
        with open(self.prompt_file, "r", encoding="utf-8") as file:
            prompt = file.read()
            
        # Hot-inject dynamic variables
        prompt = prompt.replace("{{QUESTION}}", question)
        prompt = prompt.replace("{{TEACHER_REFERENCE}}", correct_answer_raw)
        prompt = prompt.replace("{{STUDENT_ANSWER}}", student_text)
        
        return prompt

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

    def compute_score(self, ai_response):
        constraints = ai_response.get("question_constraints", {})
        global_req = constraints.get("global_required")
        groups = constraints.get("groups", [])
        
        primary = ai_response.get("primary_points", [])
        secondary = ai_response.get("secondary_points", [])

        is_constrained = (global_req is not None and global_req > 0) or any(g.get("required") for g in groups)

        # OVERRIDE: Collapse partials for enumerations
        if is_constrained:
            for p in primary:
                if p.get("status", "").lower() == "partially_correct":
                    p["status"] = "correct"

        raw_score = 0.0

        # --- DETERMINISTIC MATH SCORING ---
        if groups and any(g.get("required") for g in groups):
            group_scores = []
            for g in groups:
                req = g.get("required")
                if not req: continue
                
                ent = g.get("entity")
                cat = g.get("category")
                
                correct_in_group = sum(
                    1 for p in primary 
                    if p.get("status", "").lower() == "correct" 
                    and p.get("entity") == ent 
                    and p.get("category") == cat
                )
                
                group_scores.append(min(correct_in_group, req) / req)
            
            raw_score = (sum(group_scores) / len(group_scores)) * 10 if group_scores else 0.0
            
        elif global_req is not None and global_req > 0:
            correct_count = sum(1 for p in primary if p.get("status", "").lower() == "correct")
            capped_correct = min(correct_count, global_req)
            raw_score = (capped_correct / global_req) * 10
            
        else:
            correct_count = 0.0
            for p in primary:
                st = p.get("status", "").lower()
                if st == "correct": correct_count += 1.0
                elif st == "partially_correct": correct_count += 0.5
                
            primary_total = len(primary)
            
            secondary_score = 0.0
            for s in secondary:
                st = s.get("status", "").lower()
                if st == "correct": secondary_score += 0.5
                elif st == "incorrect": secondary_score -= 0.25
                
            max_secondary = len(secondary) * 0.5
            max_total = primary_total + max_secondary
            
            if max_total > 0:
                raw_score = ((correct_count + secondary_score) / max_total) * 10
            else:
                raw_score = 0.0

        # --- MATHEMATICAL SAFETY LAYER ---
        if ai_response.get("is_fatal_contradiction", False):
            if raw_score >= 5.0:
                ai_response["is_fatal_contradiction"] = False
                ai_response["reasoning"] += " [System Note: False contradiction flag overridden by Python math layer]."
            else:
                return 0.0

        return max(0.0, min(round(raw_score, 1), 10.0))

    def get_score(self, question, student_text, correct_answer_raw):
        if not student_text or len(student_text.strip()) < 5:
            return {"final_score": 0.0, "feedback": "No meaningful answer provided.", "details": {}}

        try:
            prompt = self.build_prompt(question, student_text, correct_answer_raw)
        except FileNotFoundError as e:
            return {"final_score": 0.0, "feedback": str(e), "details": {}}

        try:
            # Native Groq API call forcing structured JSON output
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are a strict grading engine. Always return valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.0,
                response_format={"type": "json_object"}
            )

            raw_text = response.choices[0].message.content
            ai_response = self.safe_json_parse(raw_text)

            if not ai_response:
                return {"final_score": 0.0, "feedback": "AI returned invalid JSON.", "details": {}}

            final_score = self.compute_score(ai_response)

            if ai_response.get("is_fatal_contradiction", False):
                feedback = "Fatal Error: Definition reversal or direct contradiction detected."
            elif final_score >= 9.0:
                feedback = "Excellent answer."
            else:
                feedback = ai_response.get("reasoning", "Evaluation complete.").strip()

            print("\n--- 🤖 UNIVERSAL CONSTRAINT MATRIX ---")
            print(f"Calculated Score: {final_score}/10.0")
            print(f"Constraints: {json.dumps(ai_response.get('question_constraints'), indent=2)}")
            print(f"Reasoning: {feedback}")
            print("--------------------------------------\n")

            return {
                "final_score": final_score,
                "feedback": feedback,
                "details": ai_response
            }

        except Exception as e:
            return {"final_score": 0.0, "feedback": f"Grading failed: {str(e)}", "details": {}}

# Create a singleton instance to be imported by main.py
grader = GradingAgent()
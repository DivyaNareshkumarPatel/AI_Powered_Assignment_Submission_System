const pool = require('../config/db');
const fs = require('fs');
const { parseAssignmentPDF, verifyStudentFace, evaluateVivaAnswer } = require('../services/aiService');

const getPendingAssignments = async (req, res) => {
    const student_id = req.user.id;

    try {
        const student = await pool.query('SELECT class_id FROM users WHERE user_id = $1', [student_id]);
        if (student.rows.length === 0 || !student.rows[0].class_id) {
            return res.json([]);
        }
        const class_id = student.rows[0].class_id;

        const result = await pool.query(
            `SELECT a.assignment_id, a.title, a.description, a.deadline, a.question_file_url, 
                    s.name as subject_name, s.code as subject_code,
                    t.name as teacher_name,
                    ay.name as academic_year, ay.is_active as is_active_year,
                    sem.name as semester_name,
                    c.name as class_name
             FROM assignments a
             JOIN subjects s ON a.subject_id = s.subject_id
             JOIN users t ON a.teacher_id = t.user_id
             JOIN classes c ON a.class_id = c.class_id
             JOIN semesters sem ON c.semester_id = sem.semester_id
             JOIN academic_years ay ON sem.academic_year_id = ay.academic_year_id
             WHERE a.class_id = $1
             AND ay.start_date <= CURRENT_DATE 
             AND a.assignment_id NOT IN (
                 SELECT assignment_id FROM submissions WHERE student_id = $2
             )
             ORDER BY a.deadline ASC`,
            [class_id, student_id]
        );
        res.json(result.rows);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

const getStudentHistory = async (req, res) => {
    const student_id = req.user.id;
    try {
        const result = await pool.query(
            `SELECT s.*, a.title, a.question_file_url, a.deadline,
                    sub.name as subject_name, sub.code as subject_code,
                    ay.name as academic_year, ay.is_active as is_active_year,
                    sem.name as semester_name, c.name as class_name
             FROM submissions s
             JOIN assignments a ON s.assignment_id = a.assignment_id
             JOIN subjects sub ON a.subject_id = sub.subject_id
             JOIN classes c ON a.class_id = c.class_id
             JOIN semesters sem ON c.semester_id = sem.semester_id
             JOIN academic_years ay ON sem.academic_year_id = ay.academic_year_id
             WHERE s.student_id = $1
             ORDER BY s.submitted_at DESC`,
            [student_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

const submitAssignment = async (req, res) => {
    const { assignment_id } = req.body;
    const student_id = req.user.id;

    if (!req.file) return res.status(400).json({ error: "No PDF file uploaded." });

    try {
        const asgCheck = await pool.query('SELECT parsed_qa FROM assignments WHERE assignment_id = $1', [assignment_id]);
        if (asgCheck.rows.length === 0) throw new Error("Assignment not found.");

        const teacherQA = asgCheck.rows[0].parsed_qa || [];
        const expectedCount = teacherQA.length;

        const studentPath = req.file.path;
        console.log("Analyzing Student PDF format...");
        const studentQA = await parseAssignmentPDF(studentPath);
        const actualCount = studentQA.length;

        if (expectedCount > 0 && actualCount !== expectedCount) {
            fs.unlinkSync(studentPath);
            return res.status(400).json({
                error: `Format Mismatch! The teacher assigned ${expectedCount} questions, but we detected ${actualCount} answers in your PDF.`
            });
        }

        const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/';
        const file_url = BASE_URL + studentPath.replace(/\\/g, "/");

        const result = await pool.query(
            `INSERT INTO submissions (assignment_id, student_id, file_url, status)
             VALUES ($1, $2, $3, 'PENDING') RETURNING submission_id`,
            [assignment_id, student_id, file_url]
        );

        res.json({ message: "PDF Validated!", submission_id: result.rows[0].submission_id });

    } catch (err) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error("Submission Error:", err);
        res.status(500).json({ error: "Server error during submission." });
    }
};

const continuousFaceCheck = async (req, res) => {
    const student_id = req.user.id;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No frame captured." });

    try {
        const userCheck = await pool.query('SELECT face_embedding FROM users WHERE user_id = $1', [student_id]);
        const storedEmbedding = userCheck.rows[0]?.face_embedding;

        if (!storedEmbedding) {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            return res.status(400).json({ error: "No registered face found." });
        }

        const imageBuffer = fs.readFileSync(file.path);
        const aiResponse = await verifyStudentFace(storedEmbedding, imageBuffer);

        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

        res.json({ face_status: aiResponse.status });

    } catch (err) {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        console.error("Face Check Error:", err.message);
        res.status(500).json({ error: "Face check failed." });
    }
};

const getStudentSubmissionDetails = async (req, res) => {
    try {
        const { submission_id } = req.params;
        const student_id = req.user.id; 

        const submissionCheck = await pool.query(`SELECT * FROM submissions WHERE submission_id = $1 AND student_id = $2`, [submission_id, student_id]);
        if (submissionCheck.rows.length === 0) return res.status(403).json({ msg: "Unauthorized" });

        // ORDER BY created_at DESC ensures you always see your newest test!
        const sessionResult = await pool.query(`SELECT * FROM viva_sessions WHERE submission_id = $1 ORDER BY created_at DESC LIMIT 1`, [submission_id]);
        const vivaSession = sessionResult.rows[0] || null;

        let vivaLogs = [];
        if (vivaSession) {
            const logsResult = await pool.query(`SELECT * FROM viva_logs WHERE session_id = $1 ORDER BY created_at ASC`, [vivaSession.session_id]);
            vivaLogs = logsResult.rows;
        }

        const reportResult = await pool.query(`SELECT * FROM grading_reports WHERE submission_id = $1 ORDER BY created_at DESC LIMIT 1`, [submission_id]);
        const aiReport = reportResult.rows[0] || null;

        res.json({ vivaSession, vivaLogs, aiReport });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// 1. Start the Viva Session (🔴 FIXED FOR DUPLICATES)
const startVivaSession = async (req, res) => {
    const { submission_id } = req.body;
    try {
        // Fetch the parsed Q&A data from the original assignment
        const subQuery = await pool.query(
            `SELECT a.parsed_qa FROM submissions s 
             JOIN assignments a ON s.assignment_id = a.assignment_id 
             WHERE s.submission_id = $1 AND s.student_id = $2`,
            [submission_id, req.user.id]
        );
        if (subQuery.rows.length === 0) return res.status(404).json({ error: "Submission not found" });

        // 🔴 PREVENT DUPLICATES: Check if an active session already exists!
        const existingSession = await pool.query(
            `SELECT session_id FROM viva_sessions 
             WHERE submission_id = $1 AND ended_at IS NULL 
             ORDER BY created_at DESC LIMIT 1`,
            [submission_id]
        );

        if (existingSession.rows.length > 0) {
            // Return the already created session instead of making a duplicate
            return res.json({
                session_id: existingSession.rows[0].session_id,
                questions: subQuery.rows[0].parsed_qa
            });
        }

        // If no active session exists, create a new one
        const session = await pool.query(
            `INSERT INTO viva_sessions (submission_id, started_at) VALUES ($1, CURRENT_TIMESTAMP) RETURNING session_id`,
            [submission_id]
        );

        res.json({
            session_id: session.rows[0].session_id,
            questions: subQuery.rows[0].parsed_qa
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to start Viva session" });
    }
};

// 🔴 THE BULLETPROOF FIX: This ensures data ALWAYS saves to PostgreSQL!
const submitVivaAnswer = async (req, res) => {
    const { session_id, question, answer, correct_answer } = req.body;
    const file = req.file;

    try {
        const userCheck = await pool.query('SELECT face_embedding FROM users WHERE user_id = $1', [req.user.id]);
        const storedEmbedding = userCheck.rows[0]?.face_embedding;

        if (!file || !storedEmbedding) {
            if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
            return res.status(400).json({ error: "Missing webcam frame or face embedding" });
        }

        const imageBuffer = fs.readFileSync(file.path);

        let aiEvaluation = { 
            score: 0, 
            feedback: "Processing...", 
            face_status: "OK",
            breakdown: {}
        };

        try {
            aiEvaluation = await evaluateVivaAnswer(question, answer, correct_answer, storedEmbedding, imageBuffer);
        } catch (aiError) {
            console.error("⚠️ Python AI Grading Error:", aiError.message);
            aiEvaluation.feedback = "System Error: AI failed to analyze, but your answer was successfully recorded.";
            aiEvaluation.face_status = "ERROR";
        }

        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

        // ALWAYS INSERT INTO DATABASE NO MATTER WHAT!
        await pool.query(
            `INSERT INTO viva_logs (session_id, question_text, student_answer_transcript, ai_evaluation, is_satisfactory)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                session_id, 
                question, 
                answer || "No answer provided", 
                JSON.stringify(aiEvaluation), 
                aiEvaluation.score >= 50
            ]
        );

        res.json({ success: true, evaluation: aiEvaluation, faceStatus: aiEvaluation.face_status });

    } catch (err) {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        console.error("Critical Database Error in submitVivaAnswer:", err);
        res.status(500).json({ error: "Failed to process answer" });
    }
};

const finalizeViva = async (req, res) => {
    const { session_id, submission_id, integrity_score, face_match_score } = req.body;
    const file = req.file; 
    
    let video_url = null;
    if (file) {
        const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/';
        video_url = BASE_URL + file.path.replace(/\\/g, "/");
    }

    try {
        const logs = await pool.query(`SELECT ai_evaluation FROM viva_logs WHERE session_id = $1`, [session_id]);
        
        let totalScore = 0;
        logs.rows.forEach(log => {
            let evalData = log.ai_evaluation;
            if (typeof evalData === 'string') {
                try { evalData = JSON.parse(evalData); } catch(e) {}
            }
            totalScore += (evalData?.score || 0);
        });
        const averageScore = logs.rows.length > 0 ? (totalScore / logs.rows.length) : 0;

        const overallFeedback = { summary: "AI Evaluation complete." };

        await pool.query(
            `UPDATE viva_sessions 
             SET ended_at = CURRENT_TIMESTAMP, video_url = $1, integrity_score = $2, face_match_score = $3 
             WHERE session_id = $4`, 
            [video_url, integrity_score || 100, face_match_score || 100, session_id]
        );

        await pool.query(
            `INSERT INTO grading_reports (submission_id, initial_score, feedback_json) VALUES ($1, $2, $3)`,
            [submission_id, averageScore, JSON.stringify(overallFeedback)]
        );

        await pool.query(`UPDATE submissions SET status = 'AI_GRADED', final_score = $1 WHERE submission_id = $2`, [averageScore, submission_id]);

        res.json({ success: true, final_score: averageScore });
    } catch (err) {
        console.error("Finalize Error:", err);
        res.status(500).json({ error: "Failed to finalize Viva" });
    }
};

module.exports = { getPendingAssignments, getStudentHistory, submitAssignment, getStudentSubmissionDetails, continuousFaceCheck, startVivaSession, submitVivaAnswer, finalizeViva };
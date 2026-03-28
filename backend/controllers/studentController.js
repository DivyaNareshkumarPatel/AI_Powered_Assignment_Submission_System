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
             AND a.is_accepting_submissions = true 
             AND a.assignment_id NOT IN (
                 SELECT assignment_id FROM submissions WHERE student_id = $2
             )
             ORDER BY a.deadline ASC`,
            [class_id, student_id]
        );
        res.json(result.rows);

    } catch (err) {
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
        res.status(500).json({ error: "Face check failed." });
    }
};

const getStudentSubmissionDetails = async (req, res) => {
    try {
        const { submission_id } = req.params;
        const student_id = req.user.id; 

        const submissionCheck = await pool.query(`SELECT * FROM submissions WHERE submission_id = $1 AND student_id = $2`, [submission_id, student_id]);
        if (submissionCheck.rows.length === 0) return res.status(403).json({ msg: "Unauthorized" });

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
        res.status(500).send("Server Error");
    }
};

const startVivaSession = async (req, res) => {
    const { submission_id } = req.body;
    try {
        const subQuery = await pool.query(
            `SELECT a.parsed_qa FROM submissions s 
             JOIN assignments a ON s.assignment_id = a.assignment_id 
             WHERE s.submission_id = $1 AND s.student_id = $2`,
            [submission_id, req.user.id]
        );
        if (subQuery.rows.length === 0) return res.status(404).json({ error: "Submission not found" });

        const existingSession = await pool.query(
            `SELECT session_id FROM viva_sessions 
             WHERE submission_id = $1 AND ended_at IS NULL 
             ORDER BY created_at DESC LIMIT 1`,
            [submission_id]
        );

        if (existingSession.rows.length > 0) {
            return res.json({
                session_id: existingSession.rows[0].session_id,
                questions: subQuery.rows[0].parsed_qa
            });
        }

        const session = await pool.query(
            `INSERT INTO viva_sessions (submission_id, started_at) VALUES ($1, CURRENT_TIMESTAMP) RETURNING session_id`,
            [submission_id]
        );

        res.json({
            session_id: session.rows[0].session_id,
            questions: subQuery.rows[0].parsed_qa
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to start Viva session" });
    }
};

const submitVivaAnswer = async (req, res) => {
    const { session_id, question, answer, correct_answer, max_marks = 10 } = req.body;
    const file = req.file;

    try {
        const userCheck = await pool.query('SELECT face_embedding FROM users WHERE user_id = $1', [req.user.id]);
        const storedEmbedding = userCheck.rows[0]?.face_embedding;

        if (!file || !storedEmbedding) {
            if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
            return res.status(400).json({ error: "Missing webcam frame or face embedding" });
        }

        // 1. REAL-TIME FAST TASK: Verify Face ONLY
        const imageBuffer = fs.readFileSync(file.path);
        let faceStatus = "OK";
        
        try {
            const faceResult = await verifyStudentFace(storedEmbedding, imageBuffer);
            faceStatus = faceResult.status;
        } catch (err) {
            faceStatus = "ERROR";
        }

        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

        // 2. Queue the text for background evaluation
        await pool.query(
            `INSERT INTO viva_logs (session_id, question_text, student_answer_transcript, correct_answer, max_marks, status, ai_evaluation)
             VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)`,
            [
                session_id, 
                question, 
                answer || "No answer provided", 
                correct_answer,
                max_marks,
                JSON.stringify({ face_status: faceStatus, feedback: "Pending AI Evaluation..." })
            ]
        );

        // 3. IMMEDIATELY tell the frontend to move to the next question
        res.json({ success: true, message: "Answer recorded! Moving to next question.", faceStatus });

    } catch (err) {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
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
        const finalIntegrityScore = integrity_score || 100;
        const finalFaceMatchScore = face_match_score || 100;
        const isFaceVerified = finalFaceMatchScore >= 70;

        await pool.query(
            `UPDATE viva_sessions 
             SET ended_at = CURRENT_TIMESTAMP, video_url = $1, integrity_score = $2, face_match_score = $3, is_face_verified = $4 
             WHERE session_id = $5`, 
            [video_url, finalIntegrityScore, finalFaceMatchScore, isFaceVerified, session_id]
        );

        // Set status to EVALUATING so the cron job knows it can calculate the final score once logs are done
        await pool.query(`UPDATE submissions SET status = 'EVALUATING' WHERE submission_id = $1`, [submission_id]);

        res.json({ success: true, message: "Viva finalized. Evaluation is running in the background." });
    } catch (err) {
        res.status(500).json({ error: "Failed to finalize Viva" });
    }
};

// ==========================================
// REQUEST RECHECK OR RESUBMISSION
// ==========================================
const submitRequest = async (req, res) => {
    try {
        const { submission_id } = req.params;
        const { type, reason } = req.body; 
        const student_id = req.user.id;

        if (type === 'RESUBMISSION') {
            await pool.query('UPDATE submissions SET resubmission_requested = true, request_reason = $1 WHERE submission_id = $2 AND student_id = $3', [reason, submission_id, student_id]);
        } else if (type === 'RECHECK') {
            await pool.query('UPDATE submissions SET recheck_requested = true, request_reason = $1 WHERE submission_id = $2 AND student_id = $3', [reason, submission_id, student_id]);
        }
        res.json({ success: true, message: "Request sent to teacher." });
    } catch (err) {
        console.error("Submit Request Error:", err);
        res.status(500).json({ error: "Server error" });
    }
};

module.exports = { getPendingAssignments, getStudentHistory, submitAssignment, getStudentSubmissionDetails, continuousFaceCheck, startVivaSession, submitVivaAnswer, finalizeViva, submitRequest };
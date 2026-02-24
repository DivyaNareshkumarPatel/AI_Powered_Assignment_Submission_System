const pool = require('../config/db');
const fs = require('fs');
const { parseAssignmentPDF } = require('../services/aiService');
const { verifyStudentFace } = require('../services/aiService');
const { evaluateVivaAnswer } = require('../services/aiService');

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

// 🔴 RENAMED THIS FROM getStudentSubmissions TO getStudentHistory
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
        // 1. Fetch the Teacher's expected Q&A count
        const asgCheck = await pool.query('SELECT parsed_qa FROM assignments WHERE assignment_id = $1', [assignment_id]);
        if (asgCheck.rows.length === 0) throw new Error("Assignment not found.");

        const teacherQA = asgCheck.rows[0].parsed_qa || [];
        const expectedCount = teacherQA.length;

        // 2. Parse the Student's newly uploaded PDF
        const studentPath = req.file.path;
        console.log("Analyzing Student PDF format...");
        const studentQA = await parseAssignmentPDF(studentPath);
        const actualCount = studentQA.length;

        // 3. Strict Validation
        if (expectedCount > 0 && actualCount !== expectedCount) {
            // Delete the invalid file from the server
            fs.unlinkSync(studentPath);
            return res.status(400).json({
                error: `Format Mismatch! The teacher assigned ${expectedCount} questions, but we detected ${actualCount} answers in your PDF. Please use the standard 'Q1: ... A1: ...' format and ensure all questions are answered.`
            });
        }

        // 4. If valid, save it to the database!
        const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/';
        const file_url = BASE_URL + studentPath.replace(/\\/g, "/");

        const result = await pool.query(
            `INSERT INTO submissions (assignment_id, student_id, file_url, status)
             VALUES ($1, $2, $3, 'PENDING') RETURNING submission_id`,
            [assignment_id, student_id, file_url]
        );

        // Return success and pass the submission_id so the frontend can start the Viva!
        res.json({ message: "PDF Validated!", submission_id: result.rows[0].submission_id });

    } catch (err) {
        if (req.file) fs.unlinkSync(req.file.path); // Cleanup on error
        console.error("Submission Error:", err);
        res.status(500).json({ error: "Server error during submission." });
    }
};

// --- NEW: Continuous Face Verification Endpoint ---
const continuousFaceCheck = async (req, res) => {
    const student_id = req.user.id;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No frame captured." });

    try {
        // 1. Get the student's stored mathematical face embedding
        const userCheck = await pool.query('SELECT face_embedding FROM users WHERE user_id = $1', [student_id]);
        const storedEmbedding = userCheck.rows[0]?.face_embedding;

        if (!storedEmbedding) {
            fs.unlinkSync(file.path);
            return res.status(400).json({ error: "No registered face found." });
        }

        // 2. Read the image frame directly into a buffer
        const imageBuffer = fs.readFileSync(file.path);

        // 3. Send it to Python for comparison
        const aiResponse = await verifyStudentFace(storedEmbedding, imageBuffer);

        // Cleanup the temporary webcam frame immediately
        fs.unlinkSync(file.path);

        // Expected aiResponse.status: "OK", "WRONG_PERSON", "NO_FACE"
        res.json({ face_status: aiResponse.status });

    } catch (err) {
        if (file) fs.unlinkSync(file.path);
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

        const sessionResult = await pool.query(`SELECT * FROM viva_sessions WHERE submission_id = $1`, [submission_id]);
        const vivaSession = sessionResult.rows[0] || null;

        let vivaLogs = [];
        if (vivaSession) {
            const logsResult = await pool.query(`SELECT * FROM viva_logs WHERE session_id = $1 ORDER BY created_at ASC`, [vivaSession.session_id]);
            vivaLogs = logsResult.rows;
        }

        const reportResult = await pool.query(`SELECT * FROM grading_reports WHERE submission_id = $1`, [submission_id]);
        const aiReport = reportResult.rows[0] || null;

        res.json({ vivaSession, vivaLogs, aiReport });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// 1. Start the Viva Session
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

        // Create the session in the database
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

// 2. Submit & Grade an individual answer
const submitVivaAnswer = async (req, res) => {
    const { session_id, question, answer, correct_answer } = req.body;
    const file = req.file; // Webcam frame taken at the moment of answering

    try {
        const userCheck = await pool.query('SELECT face_embedding FROM users WHERE user_id = $1', [req.user.id]);
        const storedEmbedding = userCheck.rows[0]?.face_embedding;

        if (!file || !storedEmbedding) {
            if (file) fs.unlinkSync(file.path);
            return res.status(400).json({ error: "Missing webcam frame or face embedding" });
        }

        const imageBuffer = fs.readFileSync(file.path);

        // 🔴 Send everything to Python API for grading & face verification!
        const aiEvaluation = await evaluateVivaAnswer(question, answer, correct_answer, storedEmbedding, imageBuffer);

        // Clean up image file
        fs.unlinkSync(file.path);

        // Save the result in the viva_logs database table
        await pool.query(
            `INSERT INTO viva_logs (session_id, question_text, student_answer_transcript, ai_evaluation, is_satisfactory)
             VALUES ($1, $2, $3, $4, $5)`,
            [session_id, question, answer, JSON.stringify(aiEvaluation), aiEvaluation.score >= 50]
        );

        res.json({ success: true, evaluation: aiEvaluation, faceStatus: aiEvaluation.face_status });

    } catch (err) {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        console.error(err);
        res.status(500).json({ error: "Failed to process answer" });
    }
};

// 3. Finalize test and calculate total score
const finalizeViva = async (req, res) => {
    // We now receive scores and the video file from the frontend!
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
            if (typeof evalData === 'string') evalData = JSON.parse(evalData);
            totalScore += (evalData?.score || 0);
        });
        const averageScore = logs.rows.length > 0 ? (totalScore / logs.rows.length) : 0;

        const overallFeedback = { summary: "AI Evaluation complete." };

        // 1. Close Session & SAVE VIDEO URL + PERCENTAGE SCORES
        await pool.query(
            `UPDATE viva_sessions 
             SET ended_at = CURRENT_TIMESTAMP, video_url = $1, integrity_score = $2, face_match_score = $3 
             WHERE session_id = $4`, 
            [video_url, integrity_score || 100, face_match_score || 100, session_id]
        );

        // 2. Create the Grading Report
        await pool.query(
            `INSERT INTO grading_reports (submission_id, initial_score, feedback_json) VALUES ($1, $2, $3)`,
            [submission_id, averageScore, JSON.stringify(overallFeedback)]
        );

        // 3. Update the Submission Status
        await pool.query(`UPDATE submissions SET status = 'AI_GRADED', final_score = $1 WHERE submission_id = $2`, [averageScore, submission_id]);

        res.json({ success: true, final_score: averageScore });
    } catch (err) {
        console.error("Finalize Error:", err);
        res.status(500).json({ error: "Failed to finalize Viva" });
    }
};

// 🔴 UPDATED EXPORTS TO MATCH
module.exports = { getPendingAssignments, getStudentHistory, submitAssignment, getStudentSubmissionDetails, continuousFaceCheck , startVivaSession, submitVivaAnswer, finalizeViva };
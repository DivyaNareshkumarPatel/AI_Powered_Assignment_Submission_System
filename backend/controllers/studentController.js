const pool = require('../config/db');
const fs = require('fs');
const { parseAssignmentPDF } = require('../services/aiService');
const { verifyStudentFace } = require('../services/aiService');

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

// 🔴 UPDATED EXPORTS TO MATCH
module.exports = { getPendingAssignments, getStudentHistory, submitAssignment, getStudentSubmissionDetails, continuousFaceCheck};
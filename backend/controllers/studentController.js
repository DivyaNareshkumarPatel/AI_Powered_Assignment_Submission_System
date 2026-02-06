const pool = require('../config/db');

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
                    t.name as teacher_name
             FROM assignments a
             JOIN subjects s ON a.subject_id = s.subject_id
             JOIN users t ON a.teacher_id = t.user_id
             WHERE a.class_id = $1
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

const getStudentSubmissions = async (req, res) => {
    const student_id = req.user.id;
    try {
        const result = await pool.query(
            `SELECT s.*, a.title, a.question_file_url, sub.name as subject_name 
             FROM submissions s
             JOIN assignments a ON s.assignment_id = a.assignment_id
             JOIN subjects sub ON a.subject_id = sub.subject_id
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
    
    // YOUR BACKEND URL
    const BASE_URL = 'http://localhost:5000/'; 

    // Construct File URL
    const file_url = BASE_URL + req.file.path.replace(/\\/g, "/");

    try {
        const result = await pool.query(
            `INSERT INTO submissions (assignment_id, student_id, file_url, status)
             VALUES ($1, $2, $3, 'PENDING') RETURNING *`,
            [assignment_id, student_id, file_url]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

const getStudentSubmissionDetails = async (req, res) => {
    try {
        const { submission_id } = req.params;
        const student_id = req.user.id; // Security: Ensure student owns this submission

        // 1. Verify Ownership & Get Basic Details
        const submissionCheck = await pool.query(
            `SELECT * FROM submissions WHERE submission_id = $1 AND student_id = $2`,
            [submission_id, student_id]
        );

        if (submissionCheck.rows.length === 0) {
            return res.status(403).json({ msg: "Unauthorized or Submission not found" });
        }

        // 2. Get Viva Session Details
        const sessionResult = await pool.query(
            `SELECT * FROM viva_sessions WHERE submission_id = $1`,
            [submission_id]
        );
        const vivaSession = sessionResult.rows[0] || null;

        // 3. Get Viva Logs
        let vivaLogs = [];
        if (vivaSession) {
            const logsResult = await pool.query(
                `SELECT * FROM viva_logs WHERE session_id = $1 ORDER BY created_at ASC`,
                [vivaSession.session_id]
            );
            vivaLogs = logsResult.rows;
        }

        // 4. Get AI Grading Report
        const reportResult = await pool.query(
            `SELECT * FROM grading_reports WHERE submission_id = $1`,
            [submission_id]
        );
        const aiReport = reportResult.rows[0] || null;

        res.json({ vivaSession, vivaLogs, aiReport });

    } catch (err) {
        console.error("Error fetching details:", err.message);
        res.status(500).send("Server Error");
    }
};

module.exports = { getPendingAssignments, getStudentSubmissions, submitAssignment, getStudentSubmissionDetails };
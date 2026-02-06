const pool = require('../config/db');

// 1. Get Teacher's Classes (Allocations)
const getTeacherAllocations = async (req, res) => {
    try {
        const teacher_id = req.user.id;
        
        // Correct table name for your new schema
        const result = await pool.query(
            `SELECT a.allocation_id, c.class_id, c.name as class_name, 
                    s.subject_id, s.name as subject_name, s.code as subject_code
             FROM subject_allocations a
             JOIN classes c ON a.class_id = c.class_id
             JOIN subjects s ON a.subject_id = s.subject_id
             WHERE a.teacher_id = $1`,
            [teacher_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching allocations:", err.message);
        res.status(500).send("Server Error");
    }
};

// 2. CREATE ASSIGNMENT
const createAssignment = async (req, res) => {
    try {
        const { title, description, class_id, subject_id, deadline } = req.body;
        const teacher_id = req.user.id;
        
        // YOUR BACKEND URL (Ensure this matches your setup)
        const BASE_URL = 'http://localhost:5000/'; 

        // Helper to process file paths
        const getUrl = (files, fieldName) => {
            if (files && files[fieldName]) {
                // Replace Windows backslashes (\) with forward slashes (/)
                return BASE_URL + files[fieldName][0].path.replace(/\\/g, "/");
            }
            return null;
        };

        const question_url = getUrl(req.files, 'question_file');
        const solution_url = getUrl(req.files, 'solution_file');

        const newAssignment = await pool.query(
            `INSERT INTO assignments 
            (title, description, class_id, subject_id, teacher_id, deadline, question_file_url, solution_file_url) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *`,
            [title, description, class_id, subject_id, teacher_id, deadline, question_url, solution_url]
        );

        res.json(newAssignment.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

// 3. Get Created Assignments
const getTeacherAssignments = async (req, res) => {
    try {
        const teacher_id = req.user.id;
        const result = await pool.query(
            `SELECT a.*, c.name as class_name, s.name as subject_name 
             FROM assignments a
             JOIN classes c ON a.class_id = c.class_id
             JOIN subjects s ON a.subject_id = s.subject_id
             WHERE a.teacher_id = $1
             ORDER BY a.created_at DESC`,
            [teacher_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// 4. Get Submission Stats (Placeholder)
const getSubmissionStats = async (req, res) => {
    res.json([]); 
};

// === 5. NEW FUNCTION: Get Submissions for an Assignment ===
// (This fixes the 404 error)
const getSubmissionsForAssignment = async (req, res) => {
    try {
        const { assignment_id } = req.params;

        const result = await pool.query(
            `SELECT s.submission_id, s.assignment_id, s.file_url, s.status, s.final_score, s.submitted_at,
                    u.name as student_name, u.enrollment_number, u.email
             FROM submissions s
             JOIN users u ON s.student_id = u.user_id
             WHERE s.assignment_id = $1
             ORDER BY s.submitted_at DESC`,
            [assignment_id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching submissions:", err.message);
        res.status(500).send("Server Error");
    }
};

const getSubmissionDetails = async (req, res) => {
    try {
        const { submission_id } = req.params;

        // 1. Get Viva Session Details
        const sessionResult = await pool.query(
            `SELECT * FROM viva_sessions WHERE submission_id = $1`,
            [submission_id]
        );
        const vivaSession = sessionResult.rows[0] || null;

        // 2. Get Viva Logs (Questions & Answers) if session exists
        let vivaLogs = [];
        if (vivaSession) {
            const logsResult = await pool.query(
                `SELECT * FROM viva_logs WHERE session_id = $1 ORDER BY created_at ASC`,
                [vivaSession.session_id]
            );
            vivaLogs = logsResult.rows;
        }

        // 3. Get AI Grading Report (Concepts, Feedback)
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

const updateSubmissionGrade = async (req, res) => {
    try {
        const { submission_id } = req.params;
        const { final_score, teacher_remarks } = req.body;

        // Update the score, remarks, and set status to 'TEACHER_VERIFIED'
        const result = await pool.query(
            `UPDATE submissions 
             SET final_score = $1, 
                 teacher_remarks = $2, 
                 status = 'TEACHER_VERIFIED',
                 teacher_verified_at = CURRENT_TIMESTAMP
             WHERE submission_id = $3
             RETURNING *`,
            [final_score, teacher_remarks, submission_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ msg: "Submission not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error updating grade:", err.message);
        res.status(500).send("Server Error");
    }
};

// === GET STUDENTS BY CLASS (Fixed for your Schema) ===
const getStudentsByClass = async (req, res) => {
    try {
        const { class_id } = req.params;

        // QUERY EXPLANATION:
        // Your 'users' table has a 'class_id' column directly.
        // We select all users who have this class_id and are students.
        const result = await pool.query(
            `SELECT user_id, name, enrollment_number, email 
             FROM users 
             WHERE class_id = $1 AND role = 'STUDENT'`,
            [class_id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching students:", err.message);
        res.status(500).send("Server Error");
    }
};
module.exports = { 
    getTeacherAllocations, 
    createAssignment, 
    getTeacherAssignments,
    getSubmissionStats,
    getSubmissionsForAssignment,
    updateSubmissionGrade,
    getSubmissionDetails,
    getStudentsByClass
};
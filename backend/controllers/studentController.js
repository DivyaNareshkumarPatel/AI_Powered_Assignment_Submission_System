const pool = require('../config/db');

// 1. Get Pending Assignments (Assignments for their class NOT yet submitted)
const getPendingAssignments = async (req, res) => {
    const student_id = req.user.id; // From Token

    try {
        // First, find the student's class
        const student = await pool.query('SELECT class_id FROM users WHERE user_id = $1', [student_id]);
        if (student.rows.length === 0 || !student.rows[0].class_id) {
            return res.json([]); // No class assigned yet
        }
        const class_id = student.rows[0].class_id;

        // Fetch assignments where NO submission exists for this student
        const result = await pool.query(
            `SELECT a.assignment_id, a.title, a.description, a.deadline, 
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

// 2. Get Submission History (Assignments already submitted)
const getStudentSubmissions = async (req, res) => {
    const student_id = req.user.id;
    try {
        const result = await pool.query(
            `SELECT s.*, a.title, sub.name as subject_name 
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

// 3. Submit Assignment
const submitAssignment = async (req, res) => {
    const { assignment_id } = req.body;
    const student_id = req.user.id;
    const file_path = req.file.path; // From Multer

    try {
        const result = await pool.query(
            `INSERT INTO submissions (assignment_id, student_id, file_url, status)
             VALUES ($1, $2, $3, 'PENDING') RETURNING *`,
            [assignment_id, student_id, file_path]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

module.exports = { getPendingAssignments, getStudentSubmissions, submitAssignment };
const pool = require('../config/db');

const getTeacherAllocations = async (req, res) => {
    const teacher_id = req.user.id;
    try {
        const result = await pool.query(
            `SELECT 
                sa.allocation_id,
                c.class_id, 
                c.name as class_name, 
                s.subject_id, 
                s.name as subject_name,
                s.code as subject_code
             FROM subject_allocations sa
             JOIN classes c ON sa.class_id = c.class_id
             JOIN subjects s ON sa.subject_id = s.subject_id
             WHERE sa.teacher_id = $1
             ORDER BY c.name, s.name ASC`,
            [teacher_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

const getStudentsByClass = async (req, res) => {
    const { class_id } = req.params;
    try {
        const result = await pool.query(
            'SELECT user_id, name, enrollment_number, email FROM users WHERE class_id = $1 AND role = $2 ORDER BY enrollment_number ASC',
            [class_id, 'STUDENT']
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

const createAssignment = async (req, res) => {
    const { title, description, class_id, subject_id, deadline } = req.body;
    const teacher_id = req.user.id;
    
    if (!req.files['question_file'] || !req.files['solution_file']) {
        return res.status(400).json({ error: "Both Question and Solution files are required." });
    }

    const question_file = req.files['question_file'][0].path;
    const solution_file = req.files['solution_file'][0].path;

    try {
        const result = await pool.query(
            `INSERT INTO assignments 
            (teacher_id, class_id, subject_id, title, description, question_file_url, solution_file_url, deadline) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [teacher_id, class_id, subject_id, title, description, question_file, solution_file, deadline]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

const getTeacherAssignments = async (req, res) => {
    const teacher_id = req.user.id;
    try {
        const result = await pool.query(
            `SELECT a.*, c.name as class_name, s.name as subject_name 
             FROM assignments a 
             JOIN classes c ON a.class_id = c.class_id 
             JOIN subjects s ON a.subject_id = s.subject_id
             WHERE teacher_id = $1 
             ORDER BY created_at DESC`,
            [teacher_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

const getSubmissions = async (req, res) => {
    const { assignment_id } = req.params;
    try {
        const result = await pool.query(
            `SELECT s.*, u.name as student_name, u.enrollment_number 
             FROM submissions s 
             JOIN users u ON s.student_id = u.user_id 
             WHERE s.assignment_id = $1`,
            [assignment_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

module.exports = { 
    getTeacherAllocations, 
    getStudentsByClass, 
    createAssignment, 
    getTeacherAssignments, 
    getSubmissions 
};
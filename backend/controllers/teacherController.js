const pool = require('../config/db');
const parseAssignmentPDF = require('../services/aiService').parseAssignmentPDF;

// 1. Get Teacher's Classes (Allocations) with Academic Year Data
const getTeacherAllocations = async (req, res) => {
    try {
        const teacher_id = req.user.id;
        
        const result = await pool.query(
            `SELECT a.allocation_id, c.class_id, c.name as class_name, 
                    s.subject_id, s.name as subject_name, s.code as subject_code,
                    ay.academic_year_id, ay.name as academic_year, ay.is_active,
                    sem.name as semester_name
             FROM subject_allocations a
             JOIN classes c ON a.class_id = c.class_id
             JOIN subjects s ON a.subject_id = s.subject_id
             JOIN academic_years ay ON a.academic_year_id = ay.academic_year_id
             JOIN semesters sem ON c.semester_id = sem.semester_id
             WHERE a.teacher_id = $1
               AND ay.start_date <= CURRENT_DATE -- Strictly exclude future academic years
             ORDER BY ay.is_active DESC, ay.start_date DESC, c.name ASC`,
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
        
        const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/'; 

        const getUrl = (files, fieldName) => {
            if (files && files[fieldName]) {
                return BASE_URL + files[fieldName][0].path.replace(/\\/g, "/");
            }
            return null;
        };

        const question_url = getUrl(req.files, 'question_file');
        const solution_url = getUrl(req.files, 'solution_file');

        // ==========================================
        // PARSE THE PDF IMMEDIATELY
        // ==========================================
        let parsedQA = [];
        if (req.files && req.files['solution_file']) {
            console.log("Sending solution PDF to AI for parsing...");
            const solutionPath = req.files['solution_file'][0].path;
            
            // Call Python API
            parsedQA = await parseAssignmentPDF(solutionPath);
            console.log(`Successfully extracted ${parsedQA.length} questions from PDF.`);
        }

        // Save Assignment AND the Parsed JSON Data to Postgres
        const newAssignment = await pool.query(
            `INSERT INTO assignments 
            (title, description, class_id, subject_id, teacher_id, deadline, question_file_url, solution_file_url, parsed_qa) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
            RETURNING *`,
            [title, description, class_id, subject_id, teacher_id, deadline, question_url, solution_url, JSON.stringify(parsedQA)]
        );

        res.json(newAssignment.rows[0]);
    } catch (err) {
        console.error("Assignment Creation Error:", err);
        res.status(500).send("Server Error");
    }
};

// 3. Get Created Assignments with Academic Year Status
const getTeacherAssignments = async (req, res) => {
    try {
        const teacher_id = req.user.id;
        const result = await pool.query(
            `SELECT a.*, c.name as class_name, s.name as subject_name, s.code as subject_code,
                    ay.name as academic_year, ay.is_active as is_active_year,
                    sem.name as semester_name
             FROM assignments a
             JOIN classes c ON a.class_id = c.class_id
             JOIN subjects s ON a.subject_id = s.subject_id
             JOIN semesters sem ON c.semester_id = sem.semester_id
             JOIN academic_years ay ON sem.academic_year_id = ay.academic_year_id
             WHERE a.teacher_id = $1
               AND ay.start_date <= CURRENT_DATE -- Strictly exclude future academic years
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

// 5. Get Submissions for an Assignment
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
        console.error("Error fetching details:", err.message);
        res.status(500).send("Server Error");
    }
};

const updateSubmissionGrade = async (req, res) => {
    try {
        const { submission_id } = req.params;
        const { final_score, teacher_remarks } = req.body;

        const result = await pool.query(
            `UPDATE submissions 
             SET final_score = $1, teacher_remarks = $2, status = 'TEACHER_VERIFIED', teacher_verified_at = CURRENT_TIMESTAMP
             WHERE submission_id = $3 RETURNING *`,
            [final_score, teacher_remarks, submission_id]
        );

        if (result.rows.length === 0) return res.status(404).json({ msg: "Submission not found" });
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error updating grade:", err.message);
        res.status(500).send("Server Error");
    }
};

// 6. GET STUDENTS BY CLASS (Filters for ACTIVE accounts only)
const getStudentsByClass = async (req, res) => {
    try {
        const { class_id } = req.params;
        const result = await pool.query(
            `SELECT user_id, name, enrollment_number, email 
             FROM users 
             WHERE class_id = $1 AND role = 'STUDENT' AND account_status = 'ACTIVE'`,
            [class_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching students:", err.message);
        res.status(500).send("Server Error");
    }
};

module.exports = { 
    getTeacherAllocations, createAssignment, getTeacherAssignments,
    getSubmissionStats, getSubmissionsForAssignment, updateSubmissionGrade,
    getSubmissionDetails, getStudentsByClass
};
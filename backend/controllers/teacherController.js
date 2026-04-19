const pool = require('../config/db');
const parseAssignmentPDF = require('../services/aiService').parseAssignmentPDF;
const notificationService = require('../services/notificationService');

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

        // Save Assignment IMMEDIATELY (without parsing - return fast!)
        const newAssignment = await pool.query(
            `INSERT INTO assignments 
            (title, description, class_id, subject_id, teacher_id, deadline, question_file_url, solution_file_url, parsed_qa) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
            RETURNING *`,
            [title, description, class_id, subject_id, teacher_id, deadline, question_url, solution_url, JSON.stringify([])]
        );

        // Return response to user immediately
        res.json(newAssignment.rows[0]);

        // ==========================================
        // SEND NOTIFICATIONS IN BACKGROUND (non-blocking)
        // ==========================================
        (async () => {
            try {
                console.log(`[NOTIFY] Starting notification process for class ${class_id}...`);
                
                // Get all students in the class
                const classStudentsRes = await pool.query(
                    `SELECT user_id, email, name FROM users WHERE class_id = $1 AND role = 'STUDENT' AND account_status = 'ACTIVE'`,
                    [class_id]
                );
                console.log(`[NOTIFY] Found ${classStudentsRes.rows.length} students in class ${class_id}`);
                
                const classStudentIds = classStudentsRes.rows.map(r => r.user_id);

                if (classStudentIds.length > 0) {
                    // Get teacher name
                    const teacherRes = await pool.query(
                        `SELECT name FROM users WHERE user_id = $1`,
                        [teacher_id]
                    );
                    const teacherName = teacherRes.rows[0]?.name || 'Your Teacher';
                    console.log(`[NOTIFY] Teacher name: ${teacherName}`);
                    console.log(`[NOTIFY] Sending notifications to ${classStudentIds.length} students...`);
                    
                    // Send notifications (both push + email)
                    const result = await notificationService.notifyAssignmentUpload(
                        classStudentIds,
                        newAssignment.rows[0],
                        teacherName
                    );
                    console.log(`[NOTIFY] ✅ Notification process complete. Push: ${result.sentCount}/${classStudentIds.length} sent`);
                } else {
                    console.log(`[NOTIFY] ⚠️ No students found in class ${class_id}`);
                }
            } catch (notifyError) {
                console.error('[NOTIFY] ❌ Error sending notifications:', notifyError);
            }
        })();

        // ==========================================
        // PARSE PDF IN BACKGROUND (non-blocking)
        // ==========================================
        if (req.files && req.files['solution_file']) {
            const assignment_id = newAssignment.rows[0].assignment_id;
            const solutionPath = req.files['solution_file'][0].path;
            
            // Start parsing without awaiting
            (async () => {
                try {
                    console.log(`[BG] Parsing PDF for assignment ${assignment_id}...`);
                    const parsedQA = await parseAssignmentPDF(solutionPath);
                    
                    // Update assignment with parsed data
                    await pool.query(
                        `UPDATE assignments SET parsed_qa = $1 WHERE assignment_id = $2`,
                        [JSON.stringify(parsedQA), assignment_id]
                    );
                    console.log(`[BG] Successfully extracted ${parsedQA.length} questions for assignment ${assignment_id}`);
                } catch (parseError) {
                    console.error(`[BG] PDF parsing failed for assignment ${assignment_id}:`, parseError.message);
                }
            })();
        }
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
               AND ay.start_date <= CURRENT_DATE
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

        // 🔴 FIX: Added "ORDER BY created_at DESC LIMIT 1" to get the latest session!
        const sessionRes = await pool.query(`SELECT * FROM viva_sessions WHERE submission_id = $1 ORDER BY created_at DESC LIMIT 1`, [submission_id]);
        const vivaSession = sessionRes.rows[0] || null;

        let vivaLogs = [];
        if (vivaSession) {
            const logsRes = await pool.query(`SELECT * FROM viva_logs WHERE session_id = $1 ORDER BY created_at ASC`, [vivaSession.session_id]);
            vivaLogs = logsRes.rows;
        }

        // 🔴 FIX: Added "ORDER BY created_at DESC LIMIT 1" here too!
        const reportRes = await pool.query(`SELECT * FROM grading_reports WHERE submission_id = $1 ORDER BY created_at DESC LIMIT 1`, [submission_id]);
        const aiReport = reportRes.rows[0] || null;

        res.json({ vivaSession, vivaLogs, aiReport });
    } catch (err) {
        console.error(err);
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

const toggleSubmissionStatus = async (req, res) => {
    try {
        const { assignment_id } = req.params;
        const { is_accepting } = req.body;
        const teacher_id = req.user.id;

        const result = await pool.query(
            `UPDATE assignments 
             SET is_accepting_submissions = $1 
             WHERE assignment_id = $2 AND teacher_id = $3 
             RETURNING *`,
            [is_accepting, assignment_id, teacher_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Assignment not found or unauthorized" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Toggle Status Error:", err);
        res.status(500).send("Server Error");
    }
};

// ==========================================
// UPDATE ASSIGNMENT
// ==========================================
const updateAssignment = async (req, res) => {
    try {
        const { assignment_id } = req.params;
        const { title, description, deadline } = req.body;
        const teacher_id = req.user.id;

        const result = await pool.query(
            `UPDATE assignments 
             SET title = COALESCE($1, title), 
                 description = COALESCE($2, description), 
                 deadline = COALESCE($3, deadline)
             WHERE assignment_id = $4 AND teacher_id = $5 
             RETURNING *`,
            [title, description, deadline, assignment_id, teacher_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Assignment not found or unauthorized" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Update Assignment Error:", err);
        res.status(500).json({ error: "Server Error" });
    }
};

// ==========================================
// DELETE ASSIGNMENT
// ==========================================
const deleteAssignment = async (req, res) => {
    try {
        const { assignment_id } = req.params;
        const teacher_id = req.user.id;

        const result = await pool.query(
            'DELETE FROM assignments WHERE assignment_id = $1 AND teacher_id = $2 RETURNING *',
            [assignment_id, teacher_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Assignment not found or unauthorized" });
        }

        res.json({ message: "Assignment deleted successfully" });
    } catch (err) {
        console.error("Delete Assignment Error:", err);
        res.status(500).json({ error: "Server Error. Ensure no existing submissions block this deletion." });
    }
};

const resetSubmission = async (req, res) => {
    try {
        const { submission_id } = req.params;
        const teacher_id = req.user.id;

        // Verify the teacher owns the assignment this submission belongs to
        const check = await pool.query(
            `SELECT s.submission_id FROM submissions s
             JOIN assignments a ON s.assignment_id = a.assignment_id
             WHERE s.submission_id = $1 AND a.teacher_id = $2`,
            [submission_id, teacher_id]
        );

        if (check.rows.length === 0) {
            return res.status(403).json({ error: "Not authorized to reset this submission." });
        }

        // Deleting the submission automatically cascades and deletes the Viva sessions and logs
        await pool.query('DELETE FROM submissions WHERE submission_id = $1', [submission_id]);

        res.json({ message: "Submission reset successfully. The student can now re-upload." });
    } catch (err) {
        console.error("Reset Submission Error:", err);
        res.status(500).json({ error: "Server Error while resetting submission." });
    }
};

// ==========================================
// GET STUDENT REQUESTS (NOTIFICATIONS)
// ==========================================
const getTeacherRequests = async (req, res) => {
    try {
        const teacher_id = req.user.id;
        const result = await pool.query(
            `SELECT s.*, a.title as assignment_title, u.name as student_name, u.enrollment_number,
                    c.name as class_name, sub.name as subject_name
             FROM submissions s
             JOIN assignments a ON s.assignment_id = a.assignment_id
             JOIN users u ON s.student_id = u.user_id
             JOIN classes c ON a.class_id = c.class_id
             JOIN subjects sub ON a.subject_id = sub.subject_id
             WHERE a.teacher_id = $1 AND (s.resubmission_requested = true OR s.recheck_requested = true)
             ORDER BY s.submitted_at DESC`,
            [teacher_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Get Requests Error:", err);
        res.status(500).json({ error: "Server Error" });
    }
};

// ==========================================
// RESOLVE REQUEST
// ==========================================
const resolveRequest = async (req, res) => {
    try {
        const { submission_id } = req.params;
        const { action } = req.body; 
        const teacher_id = req.user.id;

        // Verify auth
        const check = await pool.query(
            `SELECT s.submission_id FROM submissions s JOIN assignments a ON s.assignment_id = a.assignment_id WHERE s.submission_id = $1 AND a.teacher_id = $2`, [submission_id, teacher_id]
        );
        if(check.rows.length === 0) return res.status(403).json({error: "Unauthorized"});

        if (action === 'APPROVE_RESUBMISSION') {
            await pool.query('DELETE FROM submissions WHERE submission_id = $1', [submission_id]);
            return res.json({ message: "Resubmission approved. Student can upload again." });
        } else if (action === 'REJECT_RESUBMISSION') {
            await pool.query('UPDATE submissions SET resubmission_requested = false, request_reason = NULL WHERE submission_id = $1', [submission_id]);
            return res.json({ message: "Resubmission rejected." });
        } else if (action === 'RESOLVE_RECHECK') {
            await pool.query('UPDATE submissions SET recheck_requested = false, request_reason = NULL WHERE submission_id = $1', [submission_id]);
            return res.json({ message: "Recheck resolved/rejected." });
        }
        res.status(400).json({ error: "Invalid action" });
    } catch (err) {
        console.error("Resolve Request Error:", err);
        res.status(500).json({ error: "Server Error" });
    }
};

module.exports = { 
    getTeacherAllocations, createAssignment, getTeacherAssignments,
    getSubmissionStats, getSubmissionsForAssignment, updateSubmissionGrade,
    getSubmissionDetails, getStudentsByClass, toggleSubmissionStatus,
    updateAssignment, deleteAssignment, resetSubmission, getTeacherRequests, resolveRequest
};
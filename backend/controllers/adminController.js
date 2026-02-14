const pool = require('../config/db');
const fs = require('fs');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');

// ==========================================
// 1. ACADEMIC YEARS & SEMESTERS
// ==========================================

const createAcademicYear = async (req, res) => {
    try {
        const { name, start_date, end_date } = req.body;
        // Set all other years to inactive first (optional, ensures only one active)
        await pool.query("UPDATE academic_years SET is_active = false");
        
        const result = await pool.query(
            "INSERT INTO academic_years (name, start_date, end_date, is_active) VALUES ($1, $2, $3, true) RETURNING *",
            [name, start_date, end_date]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const getAcademicYears = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM academic_years ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const createSemester = async (req, res) => {
    try {
        const { academic_year_id, name, type } = req.body;
        const result = await pool.query(
            "INSERT INTO semesters (academic_year_id, name, type) VALUES ($1, $2, $3) RETURNING *",
            [academic_year_id, name, type]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const getSemesters = async (req, res) => {
    try {
        const { yearId } = req.query;
        const query = yearId 
            ? "SELECT * FROM semesters WHERE academic_year_id = $1 ORDER BY name" 
            : "SELECT * FROM semesters ORDER BY created_at DESC";
        const params = yearId ? [yearId] : [];
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ==========================================
// 2. SUBJECTS & CLASSES
// ==========================================

const createSubject = async (req, res) => {
    try {
        const { name, code } = req.body;
        const result = await pool.query(
            "INSERT INTO subjects (name, code) VALUES ($1, $2) RETURNING *",
            [name, code]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const getSubjects = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM subjects ORDER BY name");
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const createClass = async (req, res) => {
    try {
        const { semester_id, name, department } = req.body;
        const result = await pool.query(
            "INSERT INTO classes (semester_id, name, department) VALUES ($1, $2, $3) RETURNING *",
            [semester_id, name, department]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const getClasses = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM classes ORDER BY name");
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ==========================================
// 3. ALLOCATIONS (Manual)
// ==========================================

const allocateSubject = async (req, res) => {
    try {
        const { teacher_id, subject_id, class_id } = req.body;
        const result = await pool.query(
            `INSERT INTO subject_allocations (teacher_id, subject_id, class_id) 
             VALUES ($1, $2, $3) RETURNING *`,
            [teacher_id, subject_id, class_id]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const getTeachers = async (req, res) => {
    try {
        const result = await pool.query("SELECT user_id, name, enrollment_number FROM users WHERE role = 'TEACHER'");
        res.json(result.rows);
    } catch (err) { res.status(500).send("Error"); }
};

// ==========================================
// 4. SMART BULK UPLOAD (The Core Feature)
// ==========================================

const bulkUploadUsers = async (req, res) => {
    const { default_role } = req.body; // Fallback role if Excel column is empty

    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const filePath = req.file.path;
        
        // 1. Read Excel File
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const results = xlsx.utils.sheet_to_json(sheet);
        
        const client = await pool.connect(); // Use a single client for transaction safety (optional but good practice)

        // 2. PRE-FETCH LOOKUPS (Performance Optimization)
        // Fetches all Class Names and Subject Codes to map them to UUIDs instantly.
        
        const classRes = await client.query("SELECT class_id, name FROM classes");
        const classMap = new Map(); 
        // Key: "computer eng - div a", Value: "uuid-1234..."
        classRes.rows.forEach(c => classMap.set(c.name.trim().toLowerCase(), c.class_id));

        const subjectRes = await client.query("SELECT subject_id, code FROM subjects");
        const subjectMap = new Map();
        // Key: "cs101", Value: "uuid-5678..."
        subjectRes.rows.forEach(s => subjectMap.set(s.code.trim().toLowerCase(), s.subject_id));

        let userCount = 0;
        let allocationCount = 0;
        let errors = [];

        // 3. PROCESS EACH ROW
        for (const row of results) {
            // Read columns (Excel Headers: name, email, enrollment_number, role, class_name, subject_code)
            const name = row['name'];
            const email = row['email'];
            const enrollment_number = row['enrollment_number'];
            const role = (row['role'] || default_role || 'STUDENT').toUpperCase();
            
            // Normalize Inputs (trim spaces, lowercase for matching)
            const classNameInput = row['class_name'] ? row['class_name'].toString().trim().toLowerCase() : null;
            const subjectCodeInput = row['subject_code'] ? row['subject_code'].toString().trim().toLowerCase() : null;

            if (!email || !enrollment_number) {
                errors.push(`Skipped row: Missing email or enrollment number.`);
                continue;
            }

            // --- FIND UUIDs FROM MAPS ---
            const foundClassId = classNameInput ? classMap.get(classNameInput) : null;
            const foundSubjectId = subjectCodeInput ? subjectMap.get(subjectCodeInput) : null;

            // Validation: Students MUST belong to a valid class
            if (role === 'STUDENT' && classNameInput && !foundClassId) {
                errors.push(`Row ${name}: Class '${row['class_name']}' not found in DB.`);
                continue; 
            }

            try {
                // 4. CREATE OR UPDATE USER
                // Default Password = Enrollment Number
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(String(enrollment_number), salt);

                const userInsert = await client.query(
                    `INSERT INTO users (name, email, enrollment_number, password_hash, role, class_id) 
                     VALUES ($1, $2, $3, $4, $5, $6) 
                     ON CONFLICT (email) DO UPDATE 
                     SET enrollment_number = EXCLUDED.enrollment_number, 
                         class_id = EXCLUDED.class_id 
                     RETURNING user_id`, 
                    [
                        name, 
                        email, 
                        enrollment_number, 
                        hashedPassword, 
                        role, 
                        role === 'STUDENT' ? foundClassId : null // Assign Class to Student
                    ]
                );
                
                // Get User ID (either new or existing)
                let userId = userInsert.rows[0].user_id;
                userCount++;

                // 5. AUTO-ALLOCATE TEACHER
                // If Role is Teacher AND we found valid Class + Subject
                if (role === 'TEACHER' && foundClassId && foundSubjectId) {
                    await client.query(
                        `INSERT INTO subject_allocations (teacher_id, class_id, subject_id)
                         VALUES ($1, $2, $3)
                         ON CONFLICT (class_id, subject_id) 
                         DO UPDATE SET teacher_id = EXCLUDED.teacher_id`, // Update if re-assigning
                        [userId, foundClassId, foundSubjectId]
                    );
                    allocationCount++;
                } else if (role === 'TEACHER' && (row['class_name'] || row['subject_code'])) {
                    // Log warning if data was present but invalid
                    errors.push(`Row ${name} (Teacher): Could not allocate. Check Class Name or Subject Code.`);
                }

            } catch (err) {
                console.error(err);
                errors.push(`Error processing ${name}: ${err.message}`);
            }
        }

        client.release();
        
        // Cleanup temp file
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        res.json({ 
            msg: "Bulk Upload Complete", 
            users_processed: userCount, 
            allocations_made: allocationCount,
            errors: errors.length > 0 ? errors : null 
        });

    } catch (err) {
        if(req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error("Bulk Upload Error:", err);
        res.status(500).send("Server Error during file processing");
    }
};

module.exports = {
    createAcademicYear, getAcademicYears,
    createSemester, getSemesters,
    createSubject, getSubjects,
    createClass, getClasses,
    allocateSubject, getTeachers,
    bulkUploadUsers
};
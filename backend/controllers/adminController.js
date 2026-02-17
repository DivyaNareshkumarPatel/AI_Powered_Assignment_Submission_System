const pool = require('../config/db');
const fs = require('fs');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');

// ==========================================
// 1. INSTITUTES & DEPARTMENTS
// ==========================================

const createInstitute = async (req, res) => {
    try {
        const { name } = req.body;
        const result = await pool.query(
            "INSERT INTO institutes (name) VALUES ($1) RETURNING *", 
            [name]
        );
        res.json(result.rows[0]);
    } catch (err) { console.error(err); res.status(500).send("Server Error"); }
};

const getInstitutes = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM institutes ORDER BY name");
        res.json(result.rows);
    } catch (err) { console.error(err); res.status(500).send("Server Error"); }
};

const createDepartment = async (req, res) => {
    try {
        const { name, institute_id } = req.body;
        const result = await pool.query(
            "INSERT INTO departments (name, institute_id) VALUES ($1, $2) RETURNING *", 
            [name, institute_id]
        );
        res.json(result.rows[0]);
    } catch (err) { console.error(err); res.status(500).send("Server Error"); }
};

const getDepartments = async (req, res) => {
    try {
        // Returns departments with their institute name
        const result = await pool.query(`
            SELECT d.*, i.name as institute_name 
            FROM departments d 
            JOIN institutes i ON d.institute_id = i.institute_id 
            ORDER BY d.name
        `);
        res.json(result.rows);
    } catch (err) { console.error(err); res.status(500).send("Server Error"); }
};

// ==========================================
// 2. ACADEMIC YEARS & SEMESTERS
// ==========================================

const createAcademicYear = async (req, res) => {
    try {
        // Updated to include department_id
        const { name, start_date, end_date, department_id } = req.body;
        
        // Deactivate other years for this department (Optional logic)
        if (department_id) {
            await pool.query("UPDATE academic_years SET is_active = false WHERE department_id = $1", [department_id]);
        }
        
        const result = await pool.query(
            `INSERT INTO academic_years (name, start_date, end_date, is_active, department_id) 
             VALUES ($1, $2, $3, true, $4) RETURNING *`,
            [name, start_date, end_date, department_id]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const getAcademicYears = async (req, res) => {
    try {
        // Can filter by department via query param if needed
        const { department_id } = req.query;
        let query = "SELECT * FROM academic_years";
        let params = [];
        
        if (department_id) {
            query += " WHERE department_id = $1";
            params.push(department_id);
        }
        
        query += " ORDER BY created_at DESC";
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const createSemester = async (req, res) => {
    try {
        // Updated to include department_id
        const { academic_year_id, name, type, department_id } = req.body;
        const result = await pool.query(
            `INSERT INTO semesters (academic_year_id, name, type, department_id) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [academic_year_id, name, type, department_id]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const getSemesters = async (req, res) => {
    try {
        const { yearId, department_id } = req.query;
        let query = "SELECT * FROM semesters";
        let params = [];
        let conditions = [];

        if (yearId) {
            conditions.push(`academic_year_id = $${params.length + 1}`);
            params.push(yearId);
        }
        
        if (department_id) {
            conditions.push(`department_id = $${params.length + 1}`);
            params.push(department_id);
        }

        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }
        
        query += " ORDER BY name";
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ==========================================
// 3. SUBJECTS & CLASSES
// ==========================================

const createSubject = async (req, res) => {
  try {
    // 1. Destructure institute_id from the request body
    const { name, code, institute_id } = req.body;

    // 2. Insert it into the database
    // Make sure your SQL query includes the new column
    const newSubject = await pool.query(
      "INSERT INTO subjects (name, code, institute_id) VALUES ($1, $2, $3) RETURNING *",
      [name, code, institute_id]
    );

    res.json(newSubject.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const getSubjects = async (req, res) => {
  try {
    // Optionally join with institutes to get the name directly, 
    // or just return the raw rows (frontend maps the name)
    const allSubjects = await pool.query("SELECT * FROM subjects ORDER BY name ASC");
    res.json(allSubjects.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const createClass = async (req, res) => {
    try {
        // Updated to include department_id
        const { name, semester_id, department_id } = req.body;
        
        const result = await pool.query(
            "INSERT INTO classes (name, semester_id, department_id) VALUES ($1, $2, $3) RETURNING *",
            [name, semester_id, department_id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

const getClasses = async (req, res) => {
    try {
        const { department_id } = req.query;
        let query = "SELECT * FROM classes";
        let params = [];

        if (department_id) {
            query += " WHERE department_id = $1";
            params.push(department_id);
        }

        query += " ORDER BY name";
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ==========================================
// 4. ALLOCATIONS (Manual)
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
        const { department_id } = req.query;
        let query = "SELECT user_id, name, enrollment_number FROM users WHERE role = 'TEACHER'";
        let params = [];

        if (department_id) {
            query += " AND department_id = $1";
            params.push(department_id);
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) { res.status(500).send("Error"); }
};

// ==========================================
// 5. SMART BULK UPLOAD (Updated for Departments)
// ==========================================

const bulkUploadUsers = async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    // Capture department_id from the frontend dropdown
    const { department_id } = req.body;
    if (!department_id) {
        return res.status(400).json({ msg: "Department ID is required for bulk upload." });
    }

    try {
        const filePath = req.file.path;
        
        // 1. Read Excel
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const results = xlsx.utils.sheet_to_json(sheet);
        
        const client = await pool.connect(); 

        // 2. Pre-fetch Classes (Filtered by Department)
        // We only map classes belonging to the selected department to avoid conflicts
        const classRes = await client.query(
            "SELECT class_id, name FROM classes WHERE department_id = $1", 
            [department_id]
        );
        const classMap = new Map(); 
        classRes.rows.forEach(c => classMap.set(c.name.trim().toLowerCase(), c.class_id));

        let userCount = 0;
        let errors = [];

        // 3. Process Rows
        for (const row of results) {
            const name = row['name'];
            const email = row['email'];
            const enrollment_number = row['enrollment_number'];
            
            // ROLE LOGIC
            let role = row['role'] ? row['role'].toString().trim().toUpperCase() : 'STUDENT';
            if (!['STUDENT', 'TEACHER', 'ADMIN'].includes(role)) {
                role = 'STUDENT';
            }

            // CLEAN INPUTS
            const classNameInput = row['class_name'] ? row['class_name'].toString().trim().toLowerCase() : null;

            if (!email || !enrollment_number) {
                errors.push(`Skipped row: Missing email or enrollment number.`);
                continue;
            }

            // RESOLVE CLASS ID
            const foundClassId = classNameInput ? classMap.get(classNameInput) : null;

            // VALIDATE FOREIGN KEY (Students MUST have a valid class in this department)
            if (role === 'STUDENT' && classNameInput && !foundClassId) {
                errors.push(`Row ${name}: Class '${row['class_name']}' not found in this Department. Check spelling or create class first.`);
                continue; 
            }

            try {
                // 4. INSERT / UPDATE USER (Now includes department_id)
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(String(enrollment_number), salt);

                await client.query(
                    `INSERT INTO users (name, email, enrollment_number, password_hash, role, class_id, department_id) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7) 
                     ON CONFLICT (enrollment_number) DO UPDATE 
                     SET email = EXCLUDED.email, 
                         name = EXCLUDED.name,
                         class_id = EXCLUDED.class_id,
                         role = EXCLUDED.role,
                         department_id = EXCLUDED.department_id
                     RETURNING user_id`, 
                    [
                        name, 
                        email, 
                        enrollment_number, 
                        hashedPassword, 
                        role, 
                        role === 'STUDENT' ? foundClassId : null, // Teachers always NULL class_id
                        department_id // All uploaded users assigned to selected department
                    ]
                );
                
                userCount++;

            } catch (err) {
                console.error(err);
                errors.push(`Error processing ${name}: ${err.message}`);
            }
        }

        client.release();
        
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        res.json({ 
            msg: "Bulk Upload Complete", 
            users_processed: userCount, 
            errors: errors.length > 0 ? errors : null 
        });

    } catch (err) {
        if(req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error("Bulk Upload Error:", err);
        res.status(500).send("Server Error during file processing");
    }
};

const updateYearStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            if (is_active) {
                // 1. Find the department of the year being activated
                const yearRes = await client.query("SELECT department_id FROM academic_years WHERE academic_year_id = $1", [id]);
                const deptId = yearRes.rows[0]?.department_id;

                // 2. Deactivate all other years in that department (or global)
                if (deptId) {
                    await client.query("UPDATE academic_years SET is_active = false WHERE department_id = $1", [deptId]);
                } else {
                    await client.query("UPDATE academic_years SET is_active = false WHERE department_id IS NULL");
                }
            }

            // 3. Update the target year
            const result = await client.query(
                "UPDATE academic_years SET is_active = $1 WHERE academic_year_id = $2 RETURNING *",
                [is_active, id]
            );

            await client.query('COMMIT');
            res.json(result.rows[0]);

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

const updateSemesterStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body; // Boolean

        const client = await pool.connect();
        try {
            // VALIDATION: If trying to ACTIVATE, check if the Academic Year is active
            if (is_active) {
                // Get the academic_year_id of this semester
                const semRes = await client.query(
                    "SELECT academic_year_id FROM semesters WHERE semester_id = $1", 
                    [id]
                );
                
                if (semRes.rows.length === 0) {
                    return res.status(404).json({ error: "Semester not found" });
                }

                const yearId = semRes.rows[0].academic_year_id;

                // Check status of that Academic Year
                const yearRes = await client.query(
                    "SELECT is_active, name FROM academic_years WHERE academic_year_id = $1", 
                    [yearId]
                );

                if (yearRes.rows.length > 0 && !yearRes.rows[0].is_active) {
                    return res.status(400).json({ 
                        error: `Cannot activate this semester because its Academic Year (${yearRes.rows[0].name}) is INACTIVE.` 
                    });
                }
            }

            // Proceed to Update
            const result = await client.query(
                "UPDATE semesters SET is_active = $1 WHERE semester_id = $2 RETURNING *",
                [is_active, id]
            );

            res.json(result.rows[0]);

        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    createInstitute, getInstitutes,
    createDepartment, getDepartments,
    createAcademicYear, getAcademicYears,
    createSemester, getSemesters,
    createSubject, getSubjects,
    createClass, getClasses,
    allocateSubject, getTeachers,
    bulkUploadUsers, updateYearStatus,
    updateSemesterStatus
};
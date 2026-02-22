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

const updateInstitute = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const result = await pool.query(
            "UPDATE institutes SET name = $1 WHERE institute_id = $2 RETURNING *",
            [name, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Institute not found" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

const deleteInstitute = async (req, res) => {
    try {
        const { id } = req.params;
        // Assuming your foreign keys have ON DELETE CASCADE, this will also delete associated departments, etc.
        const result = await pool.query(
            "DELETE FROM institutes WHERE institute_id = $1 RETURNING *",
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Institute not found" });
        }
        res.json({ msg: "Institute deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
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
        const result = await pool.query(`
            SELECT d.*, i.name as institute_name 
            FROM departments d 
            JOIN institutes i ON d.institute_id = i.institute_id 
            ORDER BY d.name
        `);
        res.json(result.rows);
    } catch (err) { console.error(err); res.status(500).send("Server Error"); }
};

const updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, institute_id } = req.body;
        const result = await pool.query(
            "UPDATE departments SET name = $1, institute_id = $2 WHERE department_id = $3 RETURNING *",
            [name, institute_id, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Department not found" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "DELETE FROM departments WHERE department_id = $1 RETURNING *",
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Department not found" });
        }
        res.json({ msg: "Department deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

// ==========================================
// 2. ACADEMIC YEARS & SEMESTERS
// ==========================================

const createAcademicYear = async (req, res) => {
    try {
        const { name, start_date, end_date, department_id } = req.body;

        // Strict Validation
        if (!name || !start_date || !end_date || !department_id) {
            return res.status(400).json({ error: "Name, Start Date, End Date, and Department are strictly mandatory." });
        }

        // Deactivate older active year for THIS specific department
        await pool.query("UPDATE academic_years SET is_active = false WHERE department_id = $1", [department_id]);

        const result = await pool.query(
            `INSERT INTO academic_years (name, start_date, end_date, is_active, department_id) 
             VALUES ($1, $2, $3, true, $4) RETURNING *`,
            [name, start_date, end_date, department_id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getAcademicYears = async (req, res) => {
    try {
        const { department_id } = req.query;
        // Join departments to get the name for the frontend UI
        let query = `
            SELECT ay.*, d.name as department_name, i.name as institute_name
            FROM academic_years ay
            JOIN departments d ON ay.department_id = d.department_id
            JOIN institutes i ON d.institute_id = i.institute_id
        `;
        let params = [];

        if (department_id) {
            query += " WHERE ay.department_id = $1";
            params.push(department_id);
        }

        query += " ORDER BY ay.created_at DESC";

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateAcademicYear = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, start_date, end_date, department_id } = req.body;

        // Strict Validation
        if (!name || !start_date || !end_date || !department_id) {
            return res.status(400).json({ error: "Name, Start Date, End Date, and Department are strictly mandatory." });
        }

        const semStart = new Date(start_date);
        const semEnd = new Date(end_date);

        if (semStart > semEnd) {
            return res.status(400).json({ error: "End date cannot be earlier than start date." });
        }

        const result = await pool.query(
            `UPDATE academic_years 
             SET name = $1, start_date = $2, end_date = $3, department_id = $4 
             WHERE academic_year_id = $5 RETURNING *`,
            [name, start_date, end_date, department_id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Academic year not found" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

const deleteAcademicYear = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "DELETE FROM academic_years WHERE academic_year_id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Academic year not found" });
        }
        res.json({ msg: "Academic year deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

const createSemester = async (req, res) => {
    try {
        const { academic_year_id, name, type, department_id, start_date, end_date } = req.body;

        // 1. Mandatory Fields Check
        if (!academic_year_id || !name || !type || !department_id || !start_date || !end_date) {
            return res.status(400).json({ error: "All fields are strictly mandatory." });
        }

        // 2. Fetch Academic Year to validate boundaries
        const yearRes = await pool.query(
            "SELECT start_date, end_date, name FROM academic_years WHERE academic_year_id = $1",
            [academic_year_id]
        );

        if (yearRes.rows.length === 0) {
            return res.status(404).json({ error: "Academic year not found." });
        }

        const ayStart = new Date(yearRes.rows[0].start_date);
        const ayEnd = new Date(yearRes.rows[0].end_date);
        const semStart = new Date(start_date);
        const semEnd = new Date(end_date);

        // 3. Date Boundary Validation
        if (semStart < ayStart || semEnd > ayEnd) {
            return res.status(400).json({
                error: `Semester dates must be between ${ayStart.toLocaleDateString()} and ${ayEnd.toLocaleDateString()} (The duration of ${yearRes.rows[0].name}).`
            });
        }

        if (semStart > semEnd) {
            return res.status(400).json({ error: "End date cannot be earlier than start date." });
        }

        // 4. Insert into database
        const result = await pool.query(
            `INSERT INTO semesters (academic_year_id, name, type, department_id, start_date, end_date) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [academic_year_id, name, type, department_id, start_date, end_date]
        );
        res.json(result.rows[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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

const updateSemester = async (req, res) => {
    try {
        const { id } = req.params;
        const { academic_year_id, name, type, department_id, start_date, end_date } = req.body;

        if (!academic_year_id || !name || !type || !department_id || !start_date || !end_date) {
            return res.status(400).json({ error: "All fields are strictly mandatory." });
        }

        // Fetch Academic Year to validate boundaries
        const yearRes = await pool.query(
            "SELECT start_date, end_date, name FROM academic_years WHERE academic_year_id = $1",
            [academic_year_id]
        );

        if (yearRes.rows.length === 0) {
            return res.status(404).json({ error: "Academic year not found." });
        }

        const ayStart = new Date(yearRes.rows[0].start_date);
        const ayEnd = new Date(yearRes.rows[0].end_date);
        const semStart = new Date(start_date);
        const semEnd = new Date(end_date);

        if (semStart < ayStart || semEnd > ayEnd) {
            return res.status(400).json({
                error: `Semester dates must be between ${ayStart.toLocaleDateString()} and ${ayEnd.toLocaleDateString()} (The duration of ${yearRes.rows[0].name}).`
            });
        }

        if (semStart > semEnd) {
            return res.status(400).json({ error: "End date cannot be earlier than start date." });
        }

        const result = await pool.query(
            `UPDATE semesters 
             SET academic_year_id = $1, name = $2, type = $3, department_id = $4, start_date = $5, end_date = $6 
             WHERE semester_id = $7 RETURNING *`,
            [academic_year_id, name, type, department_id, start_date, end_date, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Semester not found" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

const deleteSemester = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "DELETE FROM semesters WHERE semester_id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Semester not found" });
        }
        res.json({ msg: "Semester deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// ==========================================
// 3. SUBJECTS & CLASSES
// ==========================================

const createSubject = async (req, res) => {
    try {
        const { name, code, institute_id } = req.body;

        // Strict Validation (Institute is now mandatory)
        if (!name || !code || !institute_id) {
            return res.status(400).json({ error: "Name, Code, and Institute are strictly mandatory." });
        }

        const result = await pool.query(
            `INSERT INTO subjects (name, code, institute_id) 
             VALUES ($1, $2, $3) RETURNING *`,
            [name, code, institute_id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: "Subject code must be unique. This code already exists." });
        }
        res.status(500).json({ error: err.message });
    }
};

const getSubjects = async (req, res) => {
    try {
        const query = `
            SELECT s.*, i.name as institute_name 
            FROM subjects s 
            LEFT JOIN institutes i ON s.institute_id = i.institute_id 
            ORDER BY s.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, institute_id } = req.body;

        // Strict Validation
        if (!name || !code || !institute_id) {
            return res.status(400).json({ error: "Name, Code, and Institute are strictly mandatory." });
        }

        const result = await pool.query(
            `UPDATE subjects 
             SET name = $1, code = $2, institute_id = $3 
             WHERE subject_id = $4 RETURNING *`,
            [name, code, institute_id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Subject not found" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: "Subject code must be unique. This code is already in use." });
        }
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

const deleteSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "DELETE FROM subjects WHERE subject_id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Subject not found" });
        }
        res.json({ msg: "Subject deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

const createClass = async (req, res) => {
    try {
        const { semester_id, name, department_id } = req.body;

        // Strict Validation
        if (!name || !semester_id || !department_id) {
            return res.status(400).json({ error: "Name, Semester, and Department are strictly mandatory." });
        }

        const result = await pool.query(
            "INSERT INTO classes (semester_id, name, department_id) VALUES ($1, $2, $3) RETURNING *",
            [semester_id, name, department_id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getClasses = async (req, res) => {
    try {
        const query = `
            SELECT c.*, s.name as semester_name, d.name as department_name, i.name as institute_name, i.institute_id
            FROM classes c
            JOIN semesters s ON c.semester_id = s.semester_id
            JOIN departments d ON c.department_id = d.department_id
            JOIN institutes i ON d.institute_id = i.institute_id
            ORDER BY c.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateClass = async (req, res) => {
    try {
        const { id } = req.params;
        const { semester_id, name, department_id } = req.body;

        // Strict Validation
        if (!name || !semester_id || !department_id) {
            return res.status(400).json({ error: "Name, Semester, and Department are strictly mandatory." });
        }

        const result = await pool.query(
            `UPDATE classes 
             SET name = $1, semester_id = $2, department_id = $3 
             WHERE class_id = $4 RETURNING *`,
            [name, semester_id, department_id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Class not found" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

const deleteClass = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "DELETE FROM classes WHERE class_id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Class not found" });
        }
        res.json({ msg: "Class deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// ==========================================
// 4. ALLOCATIONS (Manual)
// ==========================================

const allocateSubject = async (req, res) => {
    try {
        // Add academic_year_id to the destructured body
        const { teacher_id, subject_id, class_id, academic_year_id } = req.body;

        const result = await pool.query(
            `INSERT INTO subject_allocations (teacher_id, subject_id, class_id, academic_year_id) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [teacher_id, subject_id, class_id, academic_year_id] // Add to array
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


const getTeachers = async (req, res) => {
    try {
        const query = `
            SELECT u.*, i.name as institute_name 
            FROM users u 
            LEFT JOIN institutes i ON u.institute_id = i.institute_id 
            WHERE u.role = 'TEACHER'
            ORDER BY u.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateTeacher = async (req, res) => {
    try {
        const { id } = req.params;
        // Teachers use enrollment_number as their Employee ID
        const { name, email, enrollment_number, institute_id } = req.body;

        // Strict Validation (enrollment_number is NOT NULL in schema)
        if (!name || !email || !enrollment_number) {
            return res.status(400).json({ error: "Name, Email, and Employee/Enrollment ID are strictly mandatory." });
        }

        const result = await pool.query(
            `UPDATE users 
             SET name = $1, email = $2, enrollment_number = $3, institute_id = $4 
             WHERE user_id = $5 AND role = 'TEACHER' RETURNING *`,
            [name, email, enrollment_number, institute_id || null, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Teacher not found" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            if (err.constraint.includes('email')) {
                return res.status(400).json({ error: "Email must be unique. This email is already in use." });
            } else if (err.constraint.includes('enrollment_number')) {
                return res.status(400).json({ error: "Employee/Enrollment ID must be unique. This ID is already assigned." });
            }
        }
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

const deleteTeacher = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "DELETE FROM users WHERE user_id = $1 AND role = 'TEACHER' RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Teacher not found" });
        }
        res.json({ msg: "Teacher deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// ==========================================
// 5. SMART BULK UPLOAD (With Lookups & Upsert)
// ==========================================

// ==========================================
// 5. SMART BULK UPLOAD (UI Filter Based)
// ==========================================

const bulkUploadUsers = async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const { role, institute_id, class_id } = req.body;
        const filePath = req.file.path;

        // Validations from UI
        if (!role || !institute_id) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return res.status(400).json({ error: "Role and Institute must be selected." });
        }
        if (role === 'STUDENT' && !class_id) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return res.status(400).json({ error: "Class must be selected for Students." });
        }

        // 1. Read Excel
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const results = xlsx.utils.sheet_to_json(sheet);

        const client = await pool.connect();
        let userCount = 0;
        let errors = [];

        // 2. Process Rows
        for (const row of results) {
            const name = row['name']?.toString().trim();
            const email = row['email']?.toString().trim();
            const enrollment_number = row['enrollment_number']?.toString().trim();

            if (!name || !email || !enrollment_number) {
                errors.push(`Skipped a row: Missing name, email, or enrollment number.`);
                continue;
            }

            try {
                // 3. UPSERT USER
                const salt = await bcrypt.genSalt(10);
                // Default password is their enrollment number
                const hashedPassword = await bcrypt.hash(String(enrollment_number), salt);

                const finalClassId = role === 'STUDENT' ? class_id : null;

                await client.query(
                    `INSERT INTO users (
                        name, email, enrollment_number, password_hash, role, 
                        class_id, institute_id, account_status
                     ) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE') 
                     ON CONFLICT (enrollment_number) DO UPDATE 
                     SET email = EXCLUDED.email, 
                         name = EXCLUDED.name,
                         class_id = EXCLUDED.class_id,
                         role = EXCLUDED.role,
                         institute_id = EXCLUDED.institute_id,
                         account_status = 'ACTIVE'
                     RETURNING user_id`,
                    [
                        name,
                        email,
                        enrollment_number,
                        hashedPassword,
                        role,
                        finalClassId,
                        institute_id
                    ]
                );

                userCount++;

            } catch (err) {
                if (err.code === '23505' && err.constraint.includes('email')) {
                    errors.push(`Error processing ${name}: Email ${email} is already taken by someone else.`);
                } else {
                    errors.push(`Error processing ${name}: ${err.message}`);
                }
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
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error("Bulk Upload Error:", err);
        res.status(500).json({ error: "Server Error during file processing" });
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
                // If ACTIVATING, deactivate all other years in the same department
                const yearRes = await client.query("SELECT department_id FROM academic_years WHERE academic_year_id = $1", [id]);
                const deptId = yearRes.rows[0]?.department_id;

                if (deptId) {
                    await client.query("UPDATE academic_years SET is_active = false WHERE department_id = $1", [deptId]);
                } else {
                    await client.query("UPDATE academic_years SET is_active = false WHERE department_id IS NULL");
                }
            } else {
                // NEW: If DEACTIVATING the academic year, ALSO deactivate all its semesters
                await client.query(
                    "UPDATE semesters SET is_active = false WHERE academic_year_id = $1",
                    [id]
                );
            }

            // Finally, update the status of the requested Academic Year
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
        const { is_active } = req.body;

        const client = await pool.connect();
        try {
            if (is_active) {
                const semRes = await client.query(
                    "SELECT academic_year_id FROM semesters WHERE semester_id = $1",
                    [id]
                );

                if (semRes.rows.length === 0) {
                    return res.status(404).json({ error: "Semester not found" });
                }

                const yearId = semRes.rows[0].academic_year_id;

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

// ==========================================
// STUDENT MANAGEMENT
// ==========================================

const getStudents = async (req, res) => {
    try {
        // Fetch all students and get their semester/department from the classes join
        const query = `
            SELECT u.user_id, u.name, u.email, u.enrollment_number, u.account_status,
                   u.institute_id, u.class_id,
                   c.semester_id, -- Fetched from classes, not users
                   i.name AS institute_name,
                   c.name AS class_name,
                   sem.name AS semester_name,
                   ay.name AS academic_year,
                   d.name AS department_name
            FROM users u
            LEFT JOIN institutes i ON u.institute_id = i.institute_id
            LEFT JOIN classes c ON u.class_id = c.class_id
            LEFT JOIN semesters sem ON c.semester_id = sem.semester_id
            LEFT JOIN academic_years ay ON sem.academic_year_id = ay.academic_year_id
            LEFT JOIN departments d ON sem.department_id = d.department_id
            WHERE u.role = 'STUDENT'
            ORDER BY u.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching students:", err);
        res.status(500).json({ error: "Server Error" });
    }
};

const updateStudent = async (req, res) => {
    try {
        const { id } = req.params;
        // Notice: We don't need semester_id here anymore because updating class_id automatically updates their semester
        const { name, email, enrollment_number, institute_id, class_id, account_status } = req.body;

        if (!name || !email || !enrollment_number) {
            return res.status(400).json({ error: "Name, Email, and Enrollment Number are mandatory." });
        }

        const result = await pool.query(
            `UPDATE users 
             SET name = $1, email = $2, enrollment_number = $3, 
                 institute_id = $4, class_id = $5, account_status = $6
             WHERE user_id = $7 AND role = 'STUDENT' RETURNING *`,
            [name, email, enrollment_number, institute_id || null, class_id || null, account_status || 'ACTIVE', id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Student not found" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            if (err.constraint.includes('email')) return res.status(400).json({ error: "Email is already taken." });
            if (err.constraint.includes('enrollment_number')) return res.status(400).json({ error: "Enrollment Number is already taken." });
        }
        res.status(500).json({ error: err.message });
    }
};

const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "DELETE FROM users WHERE user_id = $1 AND role = 'STUDENT' RETURNING *",
            [id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Student not found" });
        res.json({ msg: "Student deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Make sure to add updateStudent and deleteStudent to your module.exports!

const getAllocations = async (req, res) => {
    try {
        const query = `
            SELECT 
                sa.allocation_id,
                sa.teacher_id,
                sa.subject_id,
                sa.class_id,
                sa.academic_year_id,
                u.name AS teacher_name, 
                u.enrollment_number AS teacher_enrollment,
                s.name AS subject_name, 
                s.code AS subject_code,
                c.name AS class_name,
                ay.name AS academic_year, -- Corrected: uses 'name' from academic_years
                d.name AS department_name,
                i.name AS institute_name
            FROM subject_allocations sa
            JOIN users u ON sa.teacher_id = u.user_id
            JOIN subjects s ON sa.subject_id = s.subject_id
            JOIN classes c ON sa.class_id = c.class_id
            LEFT JOIN academic_years ay ON sa.academic_year_id = ay.academic_year_id
            LEFT JOIN departments d ON c.department_id = d.department_id
            LEFT JOIN institutes i ON d.institute_id = i.institute_id
            ORDER BY sa.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) { 
        console.error("DATABASE ERROR:", err.message);
        res.status(500).json({ error: err.message }); 
    }
};

const updateAllocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { teacher_id, class_id, subject_id, academic_year_id } = req.body;

        const result = await pool.query(
            `UPDATE subject_allocations 
             SET teacher_id = $1, class_id = $2, subject_id = $3, academic_year_id = $4 
             WHERE allocation_id = $5 RETURNING *`,
            [teacher_id, class_id, subject_id, academic_year_id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Allocation not found" });
        }
        res.json(result.rows[0]);
    } catch (err) { 
        if (err.code === '23505') {
            return res.status(400).json({ error: "Conflict: This teacher is already assigned to this subject/class for this year." });
        }
        res.status(500).json({ error: err.message }); 
    }
};

const deleteAllocation = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM subject_allocations WHERE allocation_id = $1", [id]);
        res.json({ msg: "Allocation deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    createInstitute, getInstitutes,
    updateInstitute, deleteInstitute,
    createDepartment, getDepartments,
    updateDepartment, deleteDepartment,
    createAcademicYear, getAcademicYears,
    updateAcademicYear, deleteAcademicYear,
    createSemester, getSemesters,
    updateSemester, deleteSemester,
    createSubject, getSubjects,
    updateSubject, deleteSubject,
    createClass, getClasses,
    updateClass, deleteClass,
    allocateSubject, getTeachers,
    updateTeacher, deleteTeacher,
    bulkUploadUsers, updateYearStatus,
    updateSemesterStatus, getStudents,
    updateStudent, deleteStudent,
    getAllocations, updateAllocation,
    deleteAllocation
};
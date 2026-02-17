const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const adminController = require('../controllers/adminController');

// --- DEBUGGING LINE ---
// Checks if functions are loaded correctly. If undefined, check exports in adminController.js
console.log("Loaded Admin Controller Functions:", Object.keys(adminController)); 

// ==========================================
// 0. INSTITUTES & DEPARTMENTS (NEW)
// ==========================================
router.post('/institutes', adminController.createInstitute);
router.get('/institutes', adminController.getInstitutes);

router.post('/departments', adminController.createDepartment);
router.get('/departments', adminController.getDepartments);

// ==========================================
// 1. ACADEMIC YEARS
// ==========================================
router.post('/years', adminController.createAcademicYear);
router.get('/years', adminController.getAcademicYears);

// ==========================================
// 2. SEMESTERS
// ==========================================
router.post('/semesters', adminController.createSemester);
router.get('/semesters', adminController.getSemesters);

// ==========================================
// 3. SUBJECTS
// ==========================================
router.post('/subjects', adminController.createSubject);
router.get('/subjects', adminController.getSubjects);

// ==========================================
// 4. CLASSES
// ==========================================
router.post('/classes', adminController.createClass);
router.get('/classes', adminController.getClasses);

// ==========================================
// 5. ALLOCATIONS & TEACHERS
// ==========================================
router.post('/allocations', adminController.allocateSubject);
router.get('/teachers', adminController.getTeachers);

// ==========================================
// 6. BULK UPLOAD
// ==========================================
// Note: The controller now expects 'department_id' in req.body along with the file
router.post('/upload/users', upload.single('file'), adminController.bulkUploadUsers);

router.put('/years/:id/status', adminController.updateYearStatus);
router.put('/semesters/:id/status', adminController.updateSemesterStatus);

module.exports = router;
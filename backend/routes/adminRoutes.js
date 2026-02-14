const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const adminController = require('../controllers/adminController');

// --- DEBUGGING LINE ---
console.log("Loaded Admin Controller:", adminController); 
// If this prints an empty object {} or misses functions, the controller file is not saved correctly.

// 1. Academic Years
router.post('/years', adminController.createAcademicYear);
router.get('/years', adminController.getAcademicYears);

// 2. Semesters
router.post('/semesters', adminController.createSemester);
router.get('/semesters', adminController.getSemesters);

// 3. Subjects
router.post('/subjects', adminController.createSubject);
router.get('/subjects', adminController.getSubjects);

// 4. Classes
router.post('/classes', adminController.createClass);
router.get('/classes', adminController.getClasses);

// 5. Allocations & Teachers
router.post('/allocations', adminController.allocateSubject);
router.get('/teachers', adminController.getTeachers);

// 6. Bulk Upload
router.post('/upload/users', upload.single('file'), adminController.bulkUploadUsers);

module.exports = router;
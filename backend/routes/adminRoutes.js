const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const adminController = require('../controllers/adminController');


// ==========================================
// 0. INSTITUTES & DEPARTMENTS (NEW)
// ==========================================
router.post('/institutes', adminController.createInstitute);
router.get('/institutes', adminController.getInstitutes);
router.put('/institutes/:id', adminController.updateInstitute);
router.delete('/institutes/:id', adminController.deleteInstitute);

router.post('/departments', adminController.createDepartment);
router.get('/departments', adminController.getDepartments);
router.put('/departments/:id', adminController.updateDepartment);
router.delete('/departments/:id', adminController.deleteDepartment);

// ==========================================
// 1. ACADEMIC YEARS
// ==========================================
router.post('/years', adminController.createAcademicYear);
router.get('/years', adminController.getAcademicYears);
router.put('/years/:id', adminController.updateAcademicYear);
router.delete('/years/:id', adminController.deleteAcademicYear);

// ==========================================
// 2. SEMESTERS
// ==========================================
router.post('/semesters', adminController.createSemester);
router.get('/semesters', adminController.getSemesters);
router.put('/semesters/:id', adminController.updateSemester);
router.delete('/semesters/:id', adminController.deleteSemester);

// ==========================================
// 3. SUBJECTS
// ==========================================
router.post('/subjects', adminController.createSubject);
router.get('/subjects', adminController.getSubjects);
router.put('/subjects/:id', adminController.updateSubject);
router.delete('/subjects/:id', adminController.deleteSubject);

// ==========================================
// 4. CLASSES
// ==========================================
router.post('/classes', adminController.createClass);
router.get('/classes', adminController.getClasses);
router.put('/classes/:id', adminController.updateClass);
router.delete('/classes/:id', adminController.deleteClass);

// ==========================================
// 5. ALLOCATIONS & TEACHERS
// ==========================================
router.post('/allocations', adminController.allocateSubject);
router.get('/teachers', adminController.getTeachers);
router.put('/teachers/:id', adminController.updateTeacher);
router.delete('/teachers/:id', adminController.deleteTeacher);
router.get('/students', adminController.getStudents);
router.put('/students/:id', adminController.updateStudent);
router.delete('/students/:id', adminController.deleteStudent);

// ==========================================
// 6. BULK UPLOAD
// ==========================================
// Note: The controller now expects 'department_id' in req.body along with the file
router.post('/upload/users', upload.single('file'), adminController.bulkUploadUsers);

router.put('/years/:id/status', adminController.updateYearStatus);
router.put('/semesters/:id/status', adminController.updateSemesterStatus);
router.post('/allocations', adminController.allocateSubject);
router.get('/allocations', adminController.getAllocations);
router.put('/allocations/:id', adminController.updateAllocation);
router.delete('/allocations/:id', adminController.deleteAllocation);

module.exports = router;
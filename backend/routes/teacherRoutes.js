const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload'); // The Cloudinary middleware

// 🔴 CORRECTED IMPORT: Destructuring the functions from auth.js
const { verifyToken, checkRole } = require('../middleware/auth');

const { 
    getTeacherAllocations, 
    createAssignment,
    getTeacherAssignments,
    getSubmissionStats,
    getSubmissionsForAssignment,
    updateSubmissionGrade,
    getSubmissionDetails,
    getStudentsByClass
} = require('../controllers/teacherController');

// 🔴 APPLIED MIDDLEWARE: Added verifyToken and checkRole(['TEACHER']) to all routes

// Get Classes
router.get('/allocations', verifyToken, checkRole(['TEACHER']), getTeacherAllocations);

// CREATE ASSIGNMENT
// We use 'upload.fields' because we might upload 2 different files
router.post('/assignments', verifyToken, checkRole(['TEACHER']), upload.fields([
    { name: 'question_file', maxCount: 1 },
    { name: 'solution_file', maxCount: 1 }
]), createAssignment);

router.get('/assignments', verifyToken, checkRole(['TEACHER']), getTeacherAssignments);
router.get('/stats', verifyToken, checkRole(['TEACHER']), getSubmissionStats);
router.get('/assignments/:assignment_id/submissions', verifyToken, checkRole(['TEACHER']), getSubmissionsForAssignment);
router.put('/submissions/:submission_id/grade', verifyToken, checkRole(['TEACHER']), updateSubmissionGrade);
router.get('/submissions/:submission_id/details', verifyToken, checkRole(['TEACHER']), getSubmissionDetails);
router.get('/classes/:class_id/students', verifyToken, checkRole(['TEACHER']), getStudentsByClass);

module.exports = router;
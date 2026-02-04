const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');
const { 
    getTeacherAllocations, 
    getStudentsByClass, 
    createAssignment, 
    getTeacherAssignments, 
    getSubmissions 
} = require('../controllers/teacherController');

router.get('/allocations', auth, getTeacherAllocations);
router.get('/classes/:class_id/students', auth, getStudentsByClass);
router.get('/assignments', auth, getTeacherAssignments);
router.get('/assignments/:assignment_id/submissions', auth, getSubmissions);

router.post('/assignments', auth, upload.fields([
    { name: 'question_file', maxCount: 1 },
    { name: 'solution_file', maxCount: 1 }
]), createAssignment);

module.exports = router;
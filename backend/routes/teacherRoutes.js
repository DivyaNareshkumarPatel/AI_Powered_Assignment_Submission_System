const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload'); // The Cloudinary middleware
const auth = require('../middleware/auth');
const { 
    getTeacherAllocations, 
    createAssignment, // <--- We will fix this next
    getTeacherAssignments,
    getSubmissionStats,
    getSubmissionsForAssignment,
    updateSubmissionGrade,
    getSubmissionDetails
} = require('../controllers/teacherController');

// Get Classes
router.get('/allocations', auth, getTeacherAllocations);

// CREATE ASSIGNMENT (Fixing this route)
// We use 'upload.fields' because we might upload 2 different files
router.post('/assignments', auth, upload.fields([
    { name: 'question_file', maxCount: 1 },
    { name: 'solution_file', maxCount: 1 }
]), createAssignment);

router.get('/assignments', auth, getTeacherAssignments);
router.get('/stats', auth, getSubmissionStats);
router.get('/assignments/:assignment_id/submissions', auth, getSubmissionsForAssignment);
router.put('/submissions/:submission_id/grade', auth, updateSubmissionGrade);
router.get('/submissions/:submission_id/details', auth, getSubmissionDetails);

module.exports = router;
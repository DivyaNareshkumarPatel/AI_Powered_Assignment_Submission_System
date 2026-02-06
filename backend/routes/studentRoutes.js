const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');
const { 
    getPendingAssignments, 
    getStudentSubmissions, 
    submitAssignment,
    getStudentSubmissionDetails
} = require('../controllers/studentController');

// All routes require Login
router.get('/pending', auth, getPendingAssignments);
router.get('/history', auth, getStudentSubmissions);
router.get('/submissions/:submission_id/details', auth, getStudentSubmissionDetails);

// Upload: 'submission_file' is the key name for the form
router.post('/submit', auth, upload.single('submission_file'), submitAssignment);

module.exports = router;
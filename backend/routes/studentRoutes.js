const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');
const { 
    getPendingAssignments, 
    getStudentHistory, 
    submitAssignment,
    continuousFaceCheck, // Import the new function
    getStudentSubmissionDetails
} = require('../controllers/studentController');

router.get('/pending', auth, getPendingAssignments);
router.get('/history', auth, getStudentHistory);
router.get('/submissions/:submission_id/details', auth, getStudentSubmissionDetails);

// Upload PDF Assignment
router.post('/submit', auth, upload.single('submission_file'), submitAssignment);

// Upload Webcam Frame for continuous verification
router.post('/verify-face', auth, upload.single('frame'), continuousFaceCheck);

module.exports = router;
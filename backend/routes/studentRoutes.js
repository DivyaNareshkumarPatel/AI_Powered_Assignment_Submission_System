const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');
const { 
    getPendingAssignments, 
    getStudentHistory, 
    submitAssignment,
    continuousFaceCheck,
    getStudentSubmissionDetails,
    startVivaSession,      // 🔴 NEW
    submitVivaAnswer,      // 🔴 NEW
    finalizeViva           // 🔴 NEW
} = require('../controllers/studentController');

router.get('/pending', auth, getPendingAssignments);
router.get('/history', auth, getStudentHistory);
router.get('/submissions/:submission_id/details', auth, getStudentSubmissionDetails);

// Upload PDF Assignment
router.post('/submit', auth, upload.single('submission_file'), submitAssignment);

// Background Verification 
router.post('/verify-face', auth, upload.single('frame'), continuousFaceCheck);

// ==============================
// 🔴 NEW: AI VIVA TEST ROUTES
// ==============================
router.post('/viva/start', auth, startVivaSession);
router.post('/viva/answer', auth, upload.single('frame'), submitVivaAnswer); // Includes image frame for grading verification
router.post('/viva/finalize', auth, upload.single('video'), finalizeViva);

module.exports = router;
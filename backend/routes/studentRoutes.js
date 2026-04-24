const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');

// 🔴 FIX: Destructure verifyToken and checkRole instead of importing 'auth'
const { verifyToken, checkRole } = require('../middleware/auth');

const { 
    getPendingAssignments, 
    getStudentHistory, 
    submitAssignment,
    continuousFaceCheck,
    getStudentSubmissionDetails,
    startVivaSession,
    cancelVivaSession,
    submitVivaAnswer,
    finalizeViva,
    submitRequest
} = require('../controllers/studentController');

// 🔴 FIX: Replaced 'auth' with verifyToken and checkRole(['STUDENT'])
router.get('/pending', verifyToken, checkRole(['STUDENT']), getPendingAssignments);
router.get('/history', verifyToken, checkRole(['STUDENT']), getStudentHistory);
router.get('/submissions/:submission_id/details', verifyToken, checkRole(['STUDENT']), getStudentSubmissionDetails);

// Upload PDF Assignment
router.post('/submit', verifyToken, checkRole(['STUDENT']), upload.single('submission_file'), submitAssignment);

// Background Verification 
router.post('/verify-face', verifyToken, checkRole(['STUDENT']), upload.single('frame'), continuousFaceCheck);

// ==============================
// AI VIVA TEST ROUTES
// ==============================
router.post('/viva/start', verifyToken, checkRole(['STUDENT']), startVivaSession);
router.post('/viva/cancel', verifyToken, checkRole(['STUDENT']), cancelVivaSession);
router.post('/viva/answer', verifyToken, checkRole(['STUDENT']), upload.single('frame'), submitVivaAnswer); 
router.post('/viva/finalize', verifyToken, checkRole(['STUDENT']), upload.single('video'), finalizeViva);
router.post('/submissions/:submission_id/request', verifyToken, checkRole(['STUDENT']), submitRequest);

module.exports = router;
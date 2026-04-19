// SAMPLE NOTIFICATION INTEGRATION
// This shows how to integrate notifications into your existing endpoints
// Copy these patterns to the relevant controller files

// FILE: backend/controllers/teacherController.js

// ===== EXAMPLE 1: UPLOAD ASSIGNMENT =====
// Add this to your UPLOAD_ASSIGNMENT endpoint after the assignment is created

const uploadAssignment = async (req, res) => {
    try {
        // ... your existing code to create assignment ...

        const { class_id, semester_id, title, max_marks, deadline } = req.body;
        
        // Create assignment in DB (your existing code)
        const assignmentResult = await pool.query(
            `INSERT INTO assignments (...) VALUES (...) RETURNING *`
        );
        const assignment = assignmentResult.rows[0];

        // === ADD NOTIFICATIONS HERE ===
        const { notifyAssignmentUpload } = require('../services/notificationService');
        const { sendBulkEmails, emailTemplates } = require('../services/emailService');

        // Get all students in the class
        try {
            const studentsResult = await pool.query(
                `SELECT DISTINCT u.user_id, u.email, u.name FROM users u
                 JOIN student_allocations sa ON u.user_id = sa.student_id
                 WHERE sa.class_id = $1 AND sa.semester_id = $2`,
                [class_id, semester_id]
            );

            const studentIds = studentsResult.rows.map(s => s.user_id);
            const studentEmails = studentsResult.rows.map(s => s.email);

            // Send push notifications
            const pushNotifications = await notifyAssignmentUpload(
                studentIds,
                assignment,
                req.user.name
            );
            console.log(`Push notifications sent: ${pushNotifications.sentCount}`);

            // Send emails
            const emailVariables = studentsResult.rows.map(s => [
                s.name,
                assignment.title,
                req.user.name,
                assignment.deadline
            ]);

            const emailResults = await sendBulkEmails(
                studentEmails,
                emailTemplates.assignmentUpload,
                emailVariables
            );
            console.log(`Emails sent: ${emailResults.sentCount}`);
        } catch (notifErr) {
            console.error('Error sending notifications:', notifErr);
            // Don't fail the request if notifications fail
        }

        // === END NOTIFICATIONS ===

        res.json({ message: 'Assignment uploaded successfully', assignment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to upload assignment' });
    }
};

// ===== EXAMPLE 2: UPDATE SUBMISSION GRADE =====
// Add this to your UPDATE_SUBMISSION_GRADE endpoint after marks are updated

const updateSubmissionGrade = async (req, res) => {
    try {
        const { submission_id } = req.params;
        const { final_score, teacher_remarks } = req.body;

        // Update marks in DB (your existing code)
        const updateResult = await pool.query(
            `UPDATE submissions SET final_score = $1, teacher_remarks = $2, status = 'TEACHER_VERIFIED'
             WHERE submission_id = $1 RETURNING *`
        );
        const submission = updateResult.rows[0];

        // === ADD NOTIFICATIONS HERE ===
        const { notifyMarksUpdated } = require('../services/notificationService');
        const { sendEmail, emailTemplates } = require('../services/emailService');

        try {
            // Get assignment and student details
            const assignmentResult = await pool.query(
                'SELECT * FROM assignments WHERE assignment_id = $1',
                [submission.assignment_id]
            );
            const assignment = assignmentResult.rows[0];

            const studentResult = await pool.query(
                'SELECT email, name FROM users WHERE user_id = $1',
                [submission.student_id]
            );
            const student = studentResult.rows[0];

            // Send push notification
            await notifyMarksUpdated(
                submission.student_id,
                assignment,
                final_score
            );

            // Send email
            await sendEmail(
                student.email,
                emailTemplates.marksUpdated,
                [
                    student.name,
                    assignment.title,
                    final_score,
                    assignment.max_marks,
                    teacher_remarks || ''
                ]
            );
        } catch (notifErr) {
            console.error('Error sending notifications:', notifErr);
        }

        // === END NOTIFICATIONS ===

        res.json({ message: 'Grade updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update grade' });
    }
};

// ===== EXAMPLE 3: RESET SUBMISSION (RESUBMISSION REQUEST) =====
// Add this to your RESET_SUBMISSION endpoint

const resetSubmission = async (req, res) => {
    try {
        const { submission_id } = req.body;
        const reason = req.body.reason || '';

        // Your existing code to reset submission
        const submissionResult = await pool.query(
            'SELECT * FROM submissions WHERE submission_id = $1'
        );
        const submission = submissionResult.rows[0];

        // Reset submission (your existing code)
        await pool.query(
            `UPDATE submissions SET submission_pdf = NULL, viva_session_id = NULL, 
             ai_viva_score = NULL, status = 'PENDING'
             WHERE submission_id = $1`
        );

        // === ADD NOTIFICATIONS HERE ===
        const { notifyResubmissionRequest } = require('../services/notificationService');
        const { sendEmail, emailTemplates } = require('../services/emailService');

        try {
            // Get assignment and student details
            const assignmentResult = await pool.query(
                'SELECT * FROM assignments WHERE assignment_id = $1',
                [submission.assignment_id]
            );
            const assignment = assignmentResult.rows[0];

            const studentResult = await pool.query(
                'SELECT email, name FROM users WHERE user_id = $1',
                [submission.student_id]
            );
            const student = studentResult.rows[0];

            // Send push notification
            await notifyResubmissionRequest(submission.student_id, assignment);

            // Send email
            await sendEmail(
                student.email,
                emailTemplates.resubmissionRequest,
                [
                    student.name,
                    assignment.title,
                    req.user.name,
                    reason
                ]
            );
        } catch (notifErr) {
            console.error('Error sending notifications:', notifErr);
        }

        // === END NOTIFICATIONS ===

        res.json({ message: 'Submission reset successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reset submission' });
    }
};

// ===== EXAMPLE 4: TOGGLE ASSIGNMENT STATUS (CLOSE ASSIGNMENT) =====
// Add this to your TOGGLE_ASSIGNMENT_STATUS endpoint

const toggleAssignmentStatus = async (req, res) => {
    try {
        const { assignment_id } = req.body;
        const newStatus = req.body.is_accepting_submissions;

        // Get assignment
        const assignmentResult = await pool.query(
            'SELECT * FROM assignments WHERE assignment_id = $1',
            [assignment_id]
        );
        const assignment = assignmentResult.rows[0];

        // Update status in DB
        await pool.query(
            'UPDATE assignments SET is_accepting_submissions = $1 WHERE assignment_id = $2',
            [newStatus, assignment_id]
        );

        // === ADD NOTIFICATIONS HERE (Only when closing) ===
        if (!newStatus) { // When closing assignment
            const { notifyAssignmentClosed } = require('../services/notificationService');
            const { sendBulkEmails, emailTemplates } = require('../services/emailService');

            try {
                // Get all students in the class
                const studentsResult = await pool.query(
                    `SELECT DISTINCT u.user_id, u.email, u.name FROM users u
                     JOIN student_allocations sa ON u.user_id = sa.student_id
                     WHERE sa.class_id = $1`,
                    [assignment.class_id]
                );

                const studentIds = studentsResult.rows.map(s => s.user_id);
                const studentEmails = studentsResult.rows.map(s => s.email);

                // Send push notifications
                await notifyAssignmentClosed(
                    studentIds,
                    assignment,
                    req.user.name
                );

                // Send emails
                const emailVariables = studentsResult.rows.map(s => [
                    s.name,
                    assignment.title,
                    req.user.name
                ]);

                await sendBulkEmails(
                    studentEmails,
                    emailTemplates.assignmentClosed,
                    emailVariables
                );
            } catch (notifErr) {
                console.error('Error sending notifications:', notifErr);
            }
        }
        // === END NOTIFICATIONS ===

        res.json({ message: 'Assignment status updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to toggle assignment status' });
    }
};

// FILE: backend/controllers/studentController.js

// ===== EXAMPLE 5: SUBMIT STUDENT REQUEST (Recheck/Resubmission Request) =====
// Add this to your SUBMIT_STUDENT_REQUEST endpoint

const submitStudentRequest = async (req, res) => {
    try {
        const { submission_id } = req.params;
        const { type, reason } = req.body;
        const studentId = req.user.user_id;

        // Create request in DB (your existing code)
        const requestResult = await pool.query(
            `INSERT INTO student_requests (submission_id, student_id, type, reason, status)
             VALUES ($1, $2, $3, $4, 'PENDING') RETURNING *`
        );

        // === ADD NOTIFICATIONS HERE ===
        const { notifyStudentRequest } = require('../services/notificationService');
        const { sendEmail, emailTemplates } = require('../services/emailService');

        try {
            // Get assignment, teacher, and student details
            const assignmentResult = await pool.query(
                `SELECT a.*, u.user_id as teacher_id, u.email as teacher_email, u.name as teacher_name
                 FROM assignments a
                 JOIN users u ON a.teacher_id = u.user_id
                 WHERE a.assignment_id = (
                     SELECT assignment_id FROM submissions WHERE submission_id = $1
                 )`,
                [submission_id]
            );
            const assignment = assignmentResult.rows[0];

            // Send push notification to teacher
            await notifyStudentRequest(
                assignment.teacher_id,
                req.user.name,
                type,
                assignment
            );

            // Send email to teacher
            await sendEmail(
                assignment.teacher_email,
                emailTemplates.studentRequest,
                [
                    assignment.teacher_name,
                    req.user.name,
                    type,
                    assignment.title,
                    reason || ''
                ]
            );
        } catch (notifErr) {
            console.error('Error sending notifications:', notifErr);
        }

        // === END NOTIFICATIONS ===

        res.json({ message: 'Request submitted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to submit request' });
    }
};

// FILE: backend/services/aiService.js (or wherever you handle AI verification)

// ===== EXAMPLE 6: AI VERIFICATION NOTIFICATION =====
// Add this after AI verification completes

const completeAIVerification = async (submissionId, verificationResult) => {
    try {
        const { notifyAIVerification } = require('./notificationService');
        const { sendEmail, emailTemplates } = require('./emailService');

        // Get submission details
        const submissionResult = await pool.query(
            'SELECT * FROM submissions WHERE submission_id = $1',
            submissionId
        );
        const submission = submissionResult.rows[0];

        // Get assignment details
        const assignmentResult = await pool.query(
            'SELECT * FROM assignments WHERE assignment_id = $1',
            [submission.assignment_id]
        );
        const assignment = assignmentResult.rows[0];

        // Get student details
        const studentResult = await pool.query(
            'SELECT email, name FROM users WHERE user_id = $1',
            [submission.student_id]
        );
        const student = studentResult.rows[0];

        // Send push notification
        await notifyAIVerification(
            submission.student_id,
            assignment,
            verificationResult.status || 'VERIFIED'
        );

        // Send email
        await sendEmail(
            student.email,
            emailTemplates.aiVerification,
            [
                student.name,
                assignment.title,
                verificationResult.status || 'VERIFIED',
                verificationResult.viva_score || null,
                verificationResult.remarks || ''
            ]
        );

    } catch (err) {
        console.error('Error sending AI verification notification:', err);
    }
};

module.exports = {
    uploadAssignment,
    updateSubmissionGrade,
    resetSubmission,
    toggleAssignmentStatus,
    submitStudentRequest,
    completeAIVerification
};

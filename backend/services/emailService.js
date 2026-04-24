const nodemailer = require('nodemailer');

// Initialize email transporter
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Email templates
const emailTemplates = {
    assignmentUpload: (studentName, assignmentTitle, teacherName, deadline) => ({
        subject: `New Assignment: ${assignmentTitle}`,
        html: `
            <h2>New Assignment</h2>
            <p>Hi ${studentName},</p>
            <p><strong>${teacherName}</strong> has uploaded a new assignment for your class.</p>
            <p><strong>Assignment:</strong> ${assignmentTitle}</p>
            <p><strong>Deadline:</strong> ${new Date(deadline).toLocaleDateString()}</p>
            <p><a href="${process.env.FRONTEND_URL}/dashboard/student?tab=pending" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">View Assignment</a></p>
        `
    }),

    assignmentClosed: (studentName, assignmentTitle, teacherName) => ({
        subject: `Assignment Closed: ${assignmentTitle}`,
        html: `
            <h2>Assignment Closed</h2>
            <p>Hi ${studentName},</p>
            <p><strong>${teacherName}</strong> has stopped accepting submissions for <strong>${assignmentTitle}</strong>.</p>
            <p>If you haven't submitted yet, you will not be able to do so.</p>
        `
    }),

    marksUpdated: (studentName, assignmentTitle, marks, maxMarks, remarks) => ({
        subject: `Marks Updated: ${assignmentTitle}`,
        html: `
            <h2>Your Marks Have Been Updated</h2>
            <p>Hi ${studentName},</p>
            <p>Your marks for <strong>${assignmentTitle}</strong> have been updated.</p>
            <p><strong>Marks:</strong> ${marks}/${maxMarks}</p>
            ${remarks ? `<p><strong>Teacher's Remarks:</strong> ${remarks}</p>` : ''}
            <p><a href="${process.env.FRONTEND_URL}/dashboard/student?tab=results" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">View Results</a></p>
        `
    }),

    resubmissionRequest: (studentName, assignmentTitle, teacherName, reason) => ({
        subject: `Resubmission Requested: ${assignmentTitle}`,
        html: `
            <h2>Resubmission Requested</h2>
            <p>Hi ${studentName},</p>
            <p><strong>${teacherName}</strong> has requested you to resubmit <strong>${assignmentTitle}</strong>.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p><a href="${process.env.FRONTEND_URL}/dashboard/student?tab=pending" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Resubmit Now</a></p>
        `
    }),

    aiVerification: (studentName, assignmentTitle, status, vivaScore, remarks) => ({
        subject: `Assignment Verified: ${assignmentTitle}`,
        html: `
            <h2>Your Assignment Has Been Verified</h2>
            <p>Hi ${studentName},</p>
            <p>Your assignment <strong>${assignmentTitle}</strong> has been verified by AI.</p>
            <p><strong>Status:</strong> ${status}</p>
            ${vivaScore !== null && vivaScore !== undefined ? `<p><strong>Viva Score:</strong> ${vivaScore}</p>` : ''}
            ${remarks ? `<p><strong>Feedback:</strong> ${remarks}</p>` : ''}
            <p><a href="${process.env.FRONTEND_URL}/dashboard/student?tab=history" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">View Details</a></p>
        `
    }),

    studentRequest: (teacherName, studentName, requestType, assignmentTitle, reason) => ({
        subject: `${studentName} Requested ${requestType === 'RESUBMISSION' ? 'Resubmission' : 'Recheck'}`,
        html: `
            <h2>Student Request</h2>
            <p>Hi ${teacherName},</p>
            <p><strong>${studentName}</strong> has requested a ${requestType === 'RESUBMISSION' ? 'resubmission' : 'recheck'} for <strong>${assignmentTitle}</strong>.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p><a href="${process.env.FRONTEND_URL}/dashboard/teacher?tab=requests" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">View Request</a></p>
        `
    })
};

// Send email (flexible: can accept object or old format)
const sendEmail = async (emailPayload) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.warn('[EMAIL] ⚠️ Email service not configured (missing credentials)');
            return false;
        }

        // Handle both object format and legacy format
        let mailOptions;
        if (typeof emailPayload === 'object' && emailPayload.to && emailPayload.subject && emailPayload.html) {
            // New format: { to, subject, html }
            mailOptions = {
                from: process.env.EMAIL_USER,
                to: emailPayload.to,
                subject: emailPayload.subject,
                html: emailPayload.html
            };
        } else {
            console.error('[EMAIL] ❌ Invalid email payload format:', emailPayload);
            return false;
        }

        console.log(`[EMAIL] 📧 Sending to ${emailPayload.to}...`);
        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] ✅ Email sent successfully to ${emailPayload.to}`);
        return true;
    } catch (err) {
        console.error(`[EMAIL] ❌ Error sending to ${emailPayload?.to}:`, err.message);
        return false;
    }
};

// Helper functions to get email templates
const getAssignmentUploadEmail = (studentName, assignmentTitle, teacherName, deadline) => ({
    subject: `New Assignment: ${assignmentTitle}`,
    html: `
        <h2>New Assignment</h2>
        <p>Hi ${studentName},</p>
        <p><strong>${teacherName}</strong> has uploaded a new assignment for your class.</p>
        <p><strong>Assignment:</strong> ${assignmentTitle}</p>
        <p><strong>Deadline:</strong> ${new Date(deadline).toLocaleDateString()}</p>
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/student?tab=pending" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">View Assignment</a></p>
    `
});

const getAssignmentClosedEmail = (studentName, assignmentTitle, teacherName) => ({
    subject: `Assignment Closed: ${assignmentTitle}`,
    html: `
        <h2>Assignment Closed</h2>
        <p>Hi ${studentName},</p>
        <p><strong>${teacherName}</strong> has stopped accepting submissions for <strong>${assignmentTitle}</strong>.</p>
        <p>If you haven't submitted yet, you will not be able to do so.</p>
    `
});

const getMarksUpdatedEmail = (studentName, assignmentTitle, marks, maxMarks, remarks) => ({
    subject: `Marks Updated: ${assignmentTitle}`,
    html: `
        <h2>Your Marks Have Been Updated</h2>
        <p>Hi ${studentName},</p>
        <p>Your marks for <strong>${assignmentTitle}</strong> have been updated.</p>
        <p><strong>Marks:</strong> ${marks}/${maxMarks}</p>
        ${remarks ? `<p><strong>Teacher's Remarks:</strong> ${remarks}</p>` : ''}
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/student?tab=results" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">View Results</a></p>
    `
});

const getResubmissionRequestEmail = (studentName, assignmentTitle, teacherName, reason) => ({
    subject: `Resubmission Requested: ${assignmentTitle}`,
    html: `
        <h2>Resubmission Requested</h2>
        <p>Hi ${studentName},</p>
        <p><strong>${teacherName}</strong> has requested you to resubmit <strong>${assignmentTitle}</strong>.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/student?tab=pending" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Resubmit Now</a></p>
    `
});

const getAIVerificationEmail = (studentName, assignmentTitle, status, vivaScore, remarks) => ({
    subject: `Assignment Verified: ${assignmentTitle}`,
    html: `
        <h2>Your Assignment Has Been Verified</h2>
        <p>Hi ${studentName},</p>
        <p>Your assignment <strong>${assignmentTitle}</strong> has been verified by AI.</p>
        <p><strong>Status:</strong> ${status}</p>
        ${vivaScore !== null && vivaScore !== undefined ? `<p><strong>Viva Score:</strong> ${vivaScore}</p>` : ''}
        ${remarks ? `<p><strong>Feedback:</strong> ${remarks}</p>` : ''}
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/student?tab=history" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">View Details</a></p>
    `
});

const getStudentRequestEmail = (teacherName, studentName, requestType, assignmentTitle, reason) => ({
    subject: `${studentName} Requested ${requestType === 'RESUBMISSION' ? 'Resubmission' : 'Recheck'}`,
    html: `
        <h2>Student Request</h2>
        <p>Hi ${teacherName},</p>
        <p><strong>${studentName}</strong> has requested a ${requestType === 'RESUBMISSION' ? 'resubmission' : 'recheck'} for <strong>${assignmentTitle}</strong>.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/teacher?tab=requests" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">View Request</a></p>
    `
});

const getAssignmentOpenedEmail = (studentName, assignmentTitle, teacherName) => ({
    subject: `Assignment Opened: ${assignmentTitle}`,
    html: `
        <h2>Assignment Opened</h2>
        <p>Hi ${studentName},</p>
        <p><strong>${teacherName}</strong> is now accepting submissions again for <strong>${assignmentTitle}</strong>.</p>
        <p>If you haven't submitted yet or need to resubmit, you can do so now.</p>
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/student?tab=pending" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">View Assignment</a></p>
    `
});

const getAssignmentDeadlineEmail = (studentName, assignmentTitle, teacherName, deadline) => ({
    subject: `Deadline Approaching: ${assignmentTitle}`,
    html: `
        <h2>Assignment Due in 1 Day</h2>
        <p>Hi ${studentName},</p>
        <p>This is a reminder that the assignment <strong>${assignmentTitle}</strong> by <strong>${teacherName}</strong> is due in exactly 1 day.</p>
        <p><strong>Deadline:</strong> ${new Date(deadline).toLocaleString()}</p>
        <p>Please ensure you submit your work on time.</p>
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/student?tab=pending" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">View Assignment</a></p>
    `
});

module.exports = {
    emailTemplates,
    sendEmail,
    getAssignmentUploadEmail,
    getAssignmentClosedEmail,
    getMarksUpdatedEmail,
    getResubmissionRequestEmail,
    getAIVerificationEmail,
    getStudentRequestEmail,
    getAssignmentOpenedEmail,
    getAssignmentDeadlineEmail
};

const webpush = require('web-push');
const pool = require('../config/db');
const emailService = require('./emailService');

// Set VAPID keys (generate these using: npx web-push generate-vapid-keys)
// Save these in your .env file
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
        'mailto:noreply@assignment-app.com',
        vapidPublicKey,
        vapidPrivateKey
    );
}

// Get emails for multiple users
const getUserEmails = async (userIds) => {
    try {
        const result = await pool.query(
            'SELECT user_id, email FROM users WHERE user_id = ANY($1)',
            [userIds]
        );
        return result.rows.reduce((map, row) => {
            map[row.user_id] = row.email;
            return map;
        }, {});
    } catch (err) {
        console.error('Error fetching user emails:', err);
        return {};
    }
};

// Get student info by user IDs
const getStudentInfo = async (userIds) => {
    try {
        const result = await pool.query(
            'SELECT user_id, email, name FROM users WHERE user_id = ANY($1)',
            [userIds]
        );
        return result.rows;
    } catch (err) {
        console.error('Error fetching student info:', err);
        return [];
    }
};

// Save push subscription
const savePushSubscription = async (userId, subscription) => {
    try {
        const { endpoint, keys } = subscription;
        await pool.query(
            `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (endpoint) DO UPDATE SET
             user_id = $1, p256dh = $3, auth = $4`,
            [userId, endpoint, keys.p256dh, keys.auth]
        );
    } catch (err) {
        console.error('Error saving push subscription:', err);
    }
};

// Remove push subscription
const removePushSubscription = async (endpoint) => {
    try {
        await pool.query(
            'DELETE FROM push_subscriptions WHERE endpoint = $1',
            [endpoint]
        );
    } catch (err) {
        console.error('Error removing push subscription:', err);
    }
};

// Get all subscriptions for a user
const getUserSubscriptions = async (userId) => {
    try {
        const result = await pool.query(
            'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
            [userId]
        );
        return result.rows.map(row => ({
            endpoint: row.endpoint,
            keys: {
                p256dh: row.p256dh,
                auth: row.auth
            }
        }));
    } catch (err) {
        console.error('Error fetching subscriptions:', err);
        return [];
    }
};

// Get subscriptions for multiple users
const getMultipleUserSubscriptions = async (userIds) => {
    try {
        const result = await pool.query(
            'SELECT user_id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ANY($1)',
            [userIds]
        );
        const subscriptionMap = {};
        result.rows.forEach(row => {
            if (!subscriptionMap[row.user_id]) {
                subscriptionMap[row.user_id] = [];
            }
            subscriptionMap[row.user_id].push({
                endpoint: row.endpoint,
                keys: {
                    p256dh: row.p256dh,
                    auth: row.auth
                }
            });
        });
        return subscriptionMap;
    } catch (err) {
        console.error('Error fetching multiple subscriptions:', err);
        return {};
    }
};

// Send push notification
const sendPushNotification = async (subscription, payload) => {
    try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        return true;
    } catch (err) {
        if (err.statusCode === 410) {
            // Subscription no longer valid
            await removePushSubscription(subscription.endpoint);
        }
        console.error('Error sending push notification:', err.message);
        return false;
    }
};

// Broadcast notification to multiple users
const broadcastNotification = async (userIds, payload) => {
    const subscriptionMap = await getMultipleUserSubscriptions(userIds);
    let sentCount = 0;
    let failedCount = 0;

    for (const userId of userIds) {
        const subscriptions = subscriptionMap[userId] || [];
        for (const subscription of subscriptions) {
            const success = await sendPushNotification(subscription, payload);
            if (success) sentCount++;
            else failedCount++;
        }
    }

    return { sentCount, failedCount };
};

// Notify assignment upload
const notifyAssignmentUpload = async (classStudentIds, assignment, teacherName) => {
    console.log(`[NOTIFY-EMAIL] Starting email notification for ${classStudentIds.length} students...`);
    
    // Get teacher name for email
    const teacherResult = await pool.query('SELECT name FROM users WHERE user_id = $1', [assignment.teacher_id]);
    const teacherFullName = teacherResult.rows[0]?.name || teacherName;
    console.log(`[NOTIFY-EMAIL] Teacher: ${teacherFullName}`);

    // Send PUSH NOTIFICATIONS to subscribed users
    const payload = {
        title: 'New Assignment',
        body: `${teacherFullName} uploaded "${assignment.title}" for your class`,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: {
            type: 'ASSIGNMENT_UPLOAD',
            assignment_id: assignment.assignment_id,
            url: '/dashboard/student?tab=pending'
        }
    };
    const pushResult = await broadcastNotification(classStudentIds, payload);
    console.log(`[NOTIFY-EMAIL] Push notifications: ${pushResult.sentCount} sent, ${pushResult.failedCount} failed`);

    // 🔥 AUTO-SEND EMAILS TO ALL STUDENTS (regardless of subscription)
    console.log(`[NOTIFY-EMAIL] Fetching student info for email...`);
    const students = await getStudentInfo(classStudentIds);
    console.log(`[NOTIFY-EMAIL] Got ${students.length} students with email info`);
    
    let emailsSent = 0;
    let emailsFailed = 0;
    
    for (const student of students) {
        try {
            console.log(`[NOTIFY-EMAIL] Processing student: ${student.name} (${student.email})`);
            const emailPayload = {
                to: student.email,
                ...emailService.getAssignmentUploadEmail(
                    student.name,
                    assignment.title,
                    teacherFullName,
                    assignment.deadline
                )
            };
            const success = await emailService.sendEmail(emailPayload);
            if (success) {
                emailsSent++;
            } else {
                emailsFailed++;
            }
        } catch (err) {
            console.error(`[NOTIFY-EMAIL] ❌ Error sending to ${student.email}:`, err.message);
            emailsFailed++;
        }
    }
    
    console.log(`[NOTIFY-EMAIL] ✅ Email summary: ${emailsSent} sent, ${emailsFailed} failed`);
    return pushResult;
};

// Notify assignment closed
const notifyAssignmentClosed = async (classStudentIds, assignment, teacherName) => {
    // Get teacher name for email
    const teacherResult = await pool.query('SELECT name FROM users WHERE user_id = $1', [assignment.teacher_id]);
    const teacherFullName = teacherResult.rows[0]?.name || teacherName;

    // Send PUSH NOTIFICATIONS to subscribed users
    const payload = {
        title: 'Assignment Closed',
        body: `${teacherFullName} stopped accepting submissions for "${assignment.title}"`,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: {
            type: 'ASSIGNMENT_CLOSED',
            assignment_id: assignment.assignment_id
        }
    };
    const pushResult = await broadcastNotification(classStudentIds, payload);

    // 🔥 AUTO-SEND EMAILS TO ALL STUDENTS
    const students = await getStudentInfo(classStudentIds);
    for (const student of students) {
        try {
            const emailPayload = {
                to: student.email,
                ...emailService.getAssignmentClosedEmail(
                    student.name,
                    assignment.title,
                    teacherFullName
                )
            };
            await emailService.sendEmail(emailPayload);
            console.log(`[EMAIL] Assignment closed email sent to ${student.email}`);
        } catch (err) {
            console.error(`[EMAIL] Failed to send to ${student.email}:`, err.message);
        }
    }

    return pushResult;
};

// Notify marks updated
const notifyMarksUpdated = async (studentId, assignment, marks, remarks) => {
    // Send PUSH NOTIFICATION to subscribed user
    const payload = {
        title: 'Marks Updated',
        body: `Your marks for "${assignment.title}" have been updated: ${marks}/${assignment.max_marks}`,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: {
            type: 'MARKS_UPDATED',
            assignment_id: assignment.assignment_id,
            url: '/dashboard/student?tab=results'
        }
    };
    const pushResult = await broadcastNotification([studentId], payload);

    // 🔥 AUTO-SEND EMAIL TO STUDENT
    const students = await getStudentInfo([studentId]);
    if (students.length > 0) {
        const student = students[0];
        try {
            const emailPayload = {
                to: student.email,
                ...emailService.getMarksUpdatedEmail(
                    student.name,
                    assignment.title,
                    marks,
                    assignment.max_marks,
                    remarks
                )
            };
            await emailService.sendEmail(emailPayload);
            console.log(`[EMAIL] Marks updated email sent to ${student.email}`);
        } catch (err) {
            console.error(`[EMAIL] Failed to send to ${student.email}:`, err.message);
        }
    }

    return pushResult;
};

// Notify resubmission request
const notifyResubmissionRequest = async (studentId, assignment, teacherName, reason) => {
    // Get teacher name for email
    const teacherResult = await pool.query('SELECT name FROM users WHERE user_id = $1', [assignment.teacher_id]);
    const teacherFullName = teacherResult.rows[0]?.name || teacherName;

    // Send PUSH NOTIFICATION to subscribed user
    const payload = {
        title: 'Resubmission Requested',
        body: `Your teacher requested you to resubmit "${assignment.title}"`,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: {
            type: 'RESUBMISSION_REQUEST',
            assignment_id: assignment.assignment_id,
            url: '/dashboard/student?tab=pending'
        }
    };
    const pushResult = await broadcastNotification([studentId], payload);

    // 🔥 AUTO-SEND EMAIL TO STUDENT
    const students = await getStudentInfo([studentId]);
    if (students.length > 0) {
        const student = students[0];
        try {
            const emailPayload = {
                to: student.email,
                ...emailService.getResubmissionRequestEmail(
                    student.name,
                    assignment.title,
                    teacherFullName,
                    reason
                )
            };
            await emailService.sendEmail(emailPayload);
            console.log(`[EMAIL] Resubmission request email sent to ${student.email}`);
        } catch (err) {
            console.error(`[EMAIL] Failed to send to ${student.email}:`, err.message);
        }
    }

    return pushResult;
};

// Notify AI verification complete
const notifyAIVerification = async (studentId, assignment, status, vivaScore, remarks) => {
    // Send PUSH NOTIFICATION to subscribed user
    const payload = {
        title: 'Assignment Verified',
        body: `Your assignment "${assignment.title}" has been verified by AI. Status: ${status}`,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: {
            type: 'AI_VERIFICATION',
            assignment_id: assignment.assignment_id,
            status: status,
            url: '/dashboard/student?tab=history'
        }
    };
    const pushResult = await broadcastNotification([studentId], payload);

    // 🔥 AUTO-SEND EMAIL TO STUDENT
    const students = await getStudentInfo([studentId]);
    if (students.length > 0) {
        const student = students[0];
        try {
            const emailPayload = {
                to: student.email,
                ...emailService.getAIVerificationEmail(
                    student.name,
                    assignment.title,
                    status,
                    vivaScore,
                    remarks
                )
            };
            await emailService.sendEmail(emailPayload);
            console.log(`[EMAIL] AI verification email sent to ${student.email}`);
        } catch (err) {
            console.error(`[EMAIL] Failed to send to ${student.email}:`, err.message);
        }
    }

    return pushResult;
};

// Notify student request to teacher
const notifyStudentRequest = async (teacherId, studentName, requestType, assignment, reason) => {
    const requestTypeLabel = requestType === 'RESUBMISSION' ? 'Resubmission' : 'Recheck';
    
    // Send PUSH NOTIFICATION to subscribed teacher
    const payload = {
        title: `${studentName} Requested ${requestTypeLabel}`,
        body: `Student requested ${requestTypeLabel.toLowerCase()} for "${assignment.title}"`,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: {
            type: 'STUDENT_REQUEST',
            request_type: requestType,
            assignment_id: assignment.assignment_id,
            url: '/dashboard/teacher?tab=requests'
        }
    };
    const pushResult = await broadcastNotification([teacherId], payload);

    // 🔥 AUTO-SEND EMAIL TO TEACHER
    const teachers = await getStudentInfo([teacherId]);
    if (teachers.length > 0) {
        const teacher = teachers[0];
        try {
            const emailPayload = {
                to: teacher.email,
                ...emailService.getStudentRequestEmail(
                    teacher.name,
                    studentName,
                    requestType,
                    assignment.title,
                    reason
                )
            };
            await emailService.sendEmail(emailPayload);
            console.log(`[EMAIL] Student request email sent to ${teacher.email}`);
        } catch (err) {
            console.error(`[EMAIL] Failed to send to ${teacher.email}:`, err.message);
        }
    }

    return pushResult;
};

module.exports = {
    savePushSubscription,
    removePushSubscription,
    getUserSubscriptions,
    getMultipleUserSubscriptions,
    sendPushNotification,
    broadcastNotification,
    notifyAssignmentUpload,
    notifyAssignmentClosed,
    notifyMarksUpdated,
    notifyResubmissionRequest,
    notifyAIVerification,
    notifyStudentRequest
};

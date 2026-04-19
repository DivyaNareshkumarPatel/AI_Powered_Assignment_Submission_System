# Push & Email Notification Integration Guide

## Setup Instructions

### 1. Generate VAPID Keys

Run this command to generate VAPID keys for web push:
```bash
cd backend
npx web-push generate-vapid-keys
```

Copy the output and add to `.env`:
```
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
```

### 2. Email Configuration

Add to `.env` (Gmail example):
```
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password  # Use Gmail App Password, not your regular password

# Frontend URL for email links
FRONTEND_URL=http://localhost:3000
```

**For Gmail:**
- Enable 2-Factor Authentication
- Generate an "App Password" at https://myaccount.google.com/apppasswords
- Use that as EMAIL_PASSWORD

### 3. Install Dependencies

```bash
cd backend
npm install web-push nodemailer uuid

cd frontend
npm install web-push
```

### 4. Database Setup

Run the migration to create notification tables:
```sql
-- Connect to your database and run:
-- backend/migrations/001_create_notifications_table.sql
```

Or manually create the tables:
```sql
CREATE TABLE push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

### 5. Update Backend Index.js

Add the notification routes to your main `backend/index.js`:

```javascript
// Add with your other routes
const notificationRoutes = require('./routes/notificationRoutes');
app.use('/api/notifications', notificationRoutes);
```

## Integration Points

### 1. Assignment Upload Notification

**File:** `backend/controllers/teacherController.js` (UPLOAD_ASSIGNMENT endpoint)

```javascript
const { notifyAssignmentUpload } = require('../services/notificationService');
const { sendBulkEmails, emailTemplates } = require('../services/emailService');

// After successfully creating assignment in database:

// Get all students in the class
const studentsResult = await pool.query(
    `SELECT DISTINCT u.user_id, u.email, u.name FROM users u
     JOIN student_allocations sa ON u.user_id = sa.student_id
     WHERE sa.class_id = $1 AND sa.semester_id = $2`,
    [classId, semesterId]
);

const studentEmails = studentsResult.rows.map(s => s.email);
const studentIds = studentsResult.rows.map(s => s.user_id);
const studentDetails = studentsResult.rows;

// Send push notifications
await notifyAssignmentUpload(studentIds, assignment, req.user.name);

// Send emails
const emailVariables = studentDetails.map(s => [
    s.name,
    assignment.title,
    req.user.name,
    assignment.deadline
]);

await sendBulkEmails(
    studentEmails,
    emailTemplates.assignmentUpload,
    emailVariables
);
```

### 2. Marks Updated Notification

**File:** `backend/controllers/teacherController.js` (UPDATE_SUBMISSION_GRADE endpoint)

```javascript
const { notifyMarksUpdated } = require('../services/notificationService');
const { sendEmail, emailTemplates } = require('../services/emailService');

// After updating marks:

// Get student details
const studentResult = await pool.query(
    'SELECT u.email, u.name FROM users u WHERE u.user_id = $1',
    [studentId]
);

const student = studentResult.rows[0];

// Send push notification
await notifyMarksUpdated(studentId, assignment, marks);

// Send email
await sendEmail(
    student.email,
    emailTemplates.marksUpdated,
    [student.name, assignment.title, marks, assignment.max_marks, remarks || '']
);
```

### 3. Resubmission Request Notification

**File:** `backend/controllers/teacherController.js` (RESET_SUBMISSION endpoint)

```javascript
const { notifyResubmissionRequest } = require('../services/notificationService');
const { sendEmail, emailTemplates } = require('../services/emailService');

// After resetting submission:

// Get student details
const studentResult = await pool.query(
    'SELECT email, name FROM users WHERE user_id = $1',
    [submission.student_id]
);

const student = studentResult.rows[0];
const reason = req.body.reason || '';

// Send push notification
await notifyResubmissionRequest(submission.student_id, assignment);

// Send email
await sendEmail(
    student.email,
    emailTemplates.resubmissionRequest,
    [student.name, assignment.title, req.user.name, reason]
);
```

### 4. Assignment Closed Notification

**File:** `backend/controllers/teacherController.js` (TOGGLE_ASSIGNMENT_STATUS endpoint)

```javascript
const { notifyAssignmentClosed } = require('../services/notificationService');
const { sendBulkEmails, emailTemplates } = require('../services/emailService');

// When closing an assignment (is_accepting_submissions = false):

// Get all students in the class
const studentsResult = await pool.query(
    `SELECT DISTINCT u.user_id, u.email, u.name FROM users u
     JOIN student_allocations sa ON u.user_id = sa.student_id
     WHERE sa.class_id = $1`,
    [assignment.class_id]
);

const studentEmails = studentsResult.rows.map(s => s.email);
const studentIds = studentsResult.rows.map(s => s.user_id);

// Send push notifications
await notifyAssignmentClosed(studentIds, assignment, req.user.name);

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
```

### 5. AI Verification Notification

**File:** `backend/services/aiService.js` or where you call the Python AI service

```javascript
const { notifyAIVerification } = require('./notificationService');
const { sendEmail, emailTemplates } = require('./emailService');

// After AI verification completes:

const verificationResult = await callAIVerificationService(submissionId);

// Get student and assignment details
const studentResult = await pool.query(
    'SELECT email, name FROM users WHERE user_id = $1',
    [submission.student_id]
);

const student = studentResult.rows[0];

// Send push notification
await notifyAIVerification(
    submission.student_id,
    assignment,
    verificationResult.status
);

// Send email
await sendEmail(
    student.email,
    emailTemplates.aiVerification,
    [
        student.name,
        assignment.title,
        verificationResult.status,
        verificationResult.viva_score || null,
        verificationResult.remarks || ''
    ]
);
```

### 6. Student Request Notification

**File:** `backend/controllers/studentController.js` (SUBMIT_STUDENT_REQUEST endpoint)

```javascript
const { notifyStudentRequest } = require('../services/notificationService');
const { sendEmail, emailTemplates } = require('../services/emailService');

// After student submits a request:

// Get teacher and assignment details
const assignmentResult = await pool.query(
    `SELECT a.*, u.user_id as teacher_id, u.email as teacher_email, u.name as teacher_name
     FROM assignments a
     JOIN users u ON a.teacher_id = u.user_id
     WHERE a.assignment_id = $1`,
    [assignmentId]
);

const assignment = assignmentResult.rows[0];

// Send push notification to teacher
await notifyStudentRequest(
    assignment.teacher_id,
    req.user.name,
    requestType,
    assignment
);

// Send email to teacher
await sendEmail(
    assignment.teacher_email,
    emailTemplates.studentRequest,
    [
        assignment.teacher_name,
        req.user.name,
        requestType,
        assignment.title,
        reason || ''
    ]
);
```

## Environment Variables Setup

Add to your `.env` file:

```env
# Web Push (VAPID Keys)
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
FRONTEND_URL=http://localhost:3000

# Optional
NODE_ENV=development
```

## Testing

### Test Push Notifications:
1. Login to the app
2. Click "Enable" on the notification prompt
3. Upload an assignment as a teacher
4. Check browser notifications on student account

### Test Email Notifications:
1. Make sure `.env` is configured with email credentials
2. Upload an assignment
3. Check recipient email inbox

## Frontend Setup Notes

- Service Worker is automatically registered at `/public/sw.js`
- User permission prompt shows 2 seconds after login
- Can be dismissed and re-enabled in browser settings
- Notification subscription persists across sessions

## Troubleshooting

**Notifications not showing:**
- Check browser notification permissions
- Verify VAPID keys in backend
- Check browser console for errors
- Ensure Service Worker is registered

**Emails not sending:**
- Verify `EMAIL_USER` and `EMAIL_PASSWORD` in `.env`
- Check email service logs
- For Gmail, use App Password, not regular password
- Ensure `FRONTEND_URL` is set

**Push subscription failing:**
- Check backend logs
- Verify database tables created
- Ensure auth token is valid
- Check CORS configuration

## Future Enhancements

1. **Notification Center**: View all notifications in app
2. **Notification Preferences**: Let users choose which notifications to receive
3. **Email Digest**: Send daily/weekly summary emails
4. **Rich Notifications**: Add images, buttons to notifications
5. **Notification Analytics**: Track notification engagement

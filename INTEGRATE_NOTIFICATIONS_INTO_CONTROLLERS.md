# Integrating Auto-Notifications into Controllers

Now that auto-notifications are enabled, we need to integrate them into the request handlers. Here's how:

## 1. Import Notification Service

Add to the top of `backend/controllers/teacherController.js`:
```javascript
const notificationService = require('../services/notificationService');
```

## 2. Update `updateSubmissionGrade()` - Notify Marks Updated

After grade is updated:
```javascript
const updateSubmissionGrade = async (req, res) => {
    try {
        const { submission_id } = req.params;
        const { final_score, teacher_remarks } = req.body;

        // Get submission details
        const submissionRes = await pool.query(
            `SELECT s.*, a.* FROM submissions s 
             JOIN assignments a ON s.assignment_id = a.assignment_id 
             WHERE s.submission_id = $1`,
            [submission_id]
        );
        if (submissionRes.rows.length === 0) return res.status(404).json({ msg: "Submission not found" });
        const submission = submissionRes.rows[0];

        // Update grade
        const result = await pool.query(
            `UPDATE submissions 
             SET final_score = $1, teacher_remarks = $2, status = 'TEACHER_VERIFIED', teacher_verified_at = CURRENT_TIMESTAMP
             WHERE submission_id = $3 RETURNING *`,
            [final_score, teacher_remarks, submission_id]
        );

        // 🔥 ADD THIS - Notify student of marks
        await notificationService.notifyMarksUpdated(
            submission.student_id,
            submission,  // Assignment object
            final_score,
            teacher_remarks
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error updating grade:", err.message);
        res.status(500).send("Server Error");
    }
};
```

## 3. Update `toggleSubmissionStatus()` - Notify Assignment Closed

After toggling accept status to false:
```javascript
const toggleSubmissionStatus = async (req, res) => {
    try {
        const { assignment_id } = req.params;
        const { is_accepting } = req.body;
        const teacher_id = req.user.id;

        // Get assignment details
        const assignmentRes = await pool.query(
            `SELECT a.*, u.full_name as teacher_name FROM assignments a
             JOIN users u ON a.teacher_id = u.user_id
             WHERE a.assignment_id = $1`,
            [assignment_id]
        );
        if (assignmentRes.rows.length === 0) {
            return res.status(404).json({ error: "Assignment not found" });
        }
        const assignment = assignmentRes.rows[0];

        // Update status
        const result = await pool.query(
            `UPDATE assignments 
             SET is_accepting_submissions = $1 
             WHERE assignment_id = $2 AND teacher_id = $3 
             RETURNING *`,
            [is_accepting, assignment_id, teacher_id]
        );

        // 🔥 ADD THIS - Notify students if closing submissions
        if (!is_accepting) {
            const classStudentsRes = await pool.query(
                `SELECT user_id FROM users WHERE class_id = $1 AND role = 'STUDENT'`,
                [assignment.class_id]
            );
            const classStudentIds = classStudentsRes.rows.map(r => r.user_id);
            
            await notificationService.notifyAssignmentClosed(
                classStudentIds,
                assignment,
                assignment.teacher_name
            );
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Toggle Status Error:", err);
        res.status(500).send("Server Error");
    }
};
```

## 4. Update `createAssignment()` - Notify Assignment Upload

After assignment is created:
```javascript
// In createAssignment, after res.json(newAssignment.rows[0]);

// 🔥 ADD THIS - Notify class students
const classStudentsRes = await pool.query(
    `SELECT user_id FROM users WHERE class_id = $1 AND role = 'STUDENT'`,
    [class_id]
);
const classStudentIds = classStudentsRes.rows.map(r => r.user_id);

const teacherRes = await pool.query(
    `SELECT full_name FROM users WHERE user_id = $1`,
    [teacher_id]
);
const teacherName = teacherRes.rows[0]?.full_name || 'Your Teacher';

await notificationService.notifyAssignmentUpload(
    classStudentIds,
    newAssignment.rows[0],
    teacherName
);
```

## Student Controller Updates

### For `submitAssignment()` - Notify AI to start verification
```javascript
// After submission is created
const vivaSessionRes = await pool.query(
    `SELECT * FROM viva_sessions WHERE submission_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [submission_id]
);
// After AI verification completes
await notificationService.notifyAIVerification(
    student_id,
    assignment,
    'AI_VERIFIED',  // or status from AI
    vivaScore,      // from viva session
    remarks         // from AI feedback
);
```

### For `studentRequest()` (recheck/resubmit) - Notify Teacher
```javascript
// After request is created
const teacherRes = await pool.query(
    `SELECT user_id FROM subject_allocations 
     WHERE subject_id = $1 AND teacher_id = teacher_id AND is_active = true`,
    [assignment.subject_id]
);

for (const teacher of teacherRes.rows) {
    await notificationService.notifyStudentRequest(
        teacher.user_id,
        studentName,
        requestType,  // 'RECHECK' or 'RESUBMISSION'
        assignment,
        reason
    );
}
```

## Quick Checklist

- [ ] Import notificationService in teacherController.js
- [ ] Add notifyMarksUpdated() call to updateSubmissionGrade()
- [ ] Add notifyAssignmentClosed() call to toggleSubmissionStatus()
- [ ] Add notifyAssignmentUpload() call to createAssignment()
- [ ] Update studentController.js similarly for student endpoints
- [ ] Test each notification flow
- [ ] Check email inbox for sent emails
- [ ] Monitor backend logs for [EMAIL] messages

## Testing Notifications

1. **Upload Assignment**: Check inbox for "New Assignment" email
2. **Update Marks**: Check inbox for "Marks Updated" email
3. **Close Assignment**: Check inbox for "Assignment Closed" email
4. **Request Resubmit**: Check inbox for "Resubmission Requested" email
5. **Student Request**: Check teacher inbox for "Student Requested..." email

All notifications are now automatically sent to all students via email! 🎉

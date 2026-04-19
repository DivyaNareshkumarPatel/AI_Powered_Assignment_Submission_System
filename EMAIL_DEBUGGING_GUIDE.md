# 🔧 Notifications Debugging Guide

## What Was Fixed

1. ✅ **Added notification import** to teacherController.js
2. ✅ **Added notification call** in createAssignment() function
3. ✅ **Added comprehensive logging** to track notification flow

## Testing Steps

### Step 1: Restart Backend
```bash
# Stop current backend if running
# Then start fresh:
cd backend
nodemon index.js
```

### Step 2: Upload an Assignment
1. Go to teacher dashboard
2. Upload an assignment to a class
3. **Watch the terminal** for detailed logs

### Step 3: Check the Logs

You should see output like this:

```
[NOTIFY] Starting notification process for class abc123...
[NOTIFY] Found 3 students in class abc123
[NOTIFY] Teacher name: John Smith
[NOTIFY] Sending notifications to 3 students...
[NOTIFY-EMAIL] Starting email notification for 3 students...
[NOTIFY-EMAIL] Teacher: John Smith
[NOTIFY-EMAIL] Push notifications: 0 sent, 0 failed
[NOTIFY-EMAIL] Fetching student info for email...
[NOTIFY-EMAIL] Got 3 students with email info
[NOTIFY-EMAIL] Processing student: Alice (alice@example.com)
[EMAIL] 📧 Sending to alice@example.com...
[EMAIL] ✅ Email sent successfully to alice@example.com
[NOTIFY-EMAIL] Processing student: Bob (bob@example.com)
[EMAIL] 📧 Sending to bob@example.com...
[EMAIL] ✅ Email sent successfully to bob@example.com
[NOTIFY-EMAIL] ✅ Email summary: 3 sent, 0 failed
```

## What Each Log Means

| Log | Meaning |
|-----|---------|
| `[NOTIFY] Starting notification...` | Notification process started |
| `[NOTIFY] Found X students` | X students found in the class |
| `⚠️ No students found` | **Issue**: No students in this class |
| `[NOTIFY-EMAIL] Processing student:` | About to send email to student |
| `[EMAIL] ✅ Email sent successfully` | ✅ Email sent successfully |
| `[EMAIL] ❌ Error sending to` | ❌ Email failed - check error message |
| `Email service not configured` | ❌ Missing EMAIL_USER or EMAIL_PASSWORD in .env |

## Troubleshooting

### Issue: "No students found in class"
**Cause**: The query couldn't find students in that class
**Solution**: 
1. Verify students are actually in the database with that class_id
2. Check student account_status is 'ACTIVE'
3. Check student role is 'STUDENT'

### Issue: "Email service not configured"
**Cause**: Missing .env variables
**Solution**: Verify .env has:
```
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=app-password
FRONTEND_URL=http://localhost:3000
```

### Issue: "Invalid email payload format"
**Cause**: The emailService.getAssignmentUploadEmail() returned wrong format
**Solution**: Check if function signatures match

### Issue: Email fails but no error message
**This might mean**:
- Gmail is blocking the login (add your IP to allowed list)
- App password is incorrect
- SMTP port is blocked
- TLS/SSL configuration needed

## Testing Gmail App Password

If emails still fail, test Gmail directly:

1. Use Gmail 2FA and create an [App Password](https://myaccount.google.com/apppasswords)
2. Add to .env:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=generated-app-password
   ```
3. Restart backend

## Quick Test Command

Add this endpoint temporarily to test email:
```javascript
app.get('/test-email', async (req, res) => {
    try {
        const emailService = require('./services/emailService');
        const result = await emailService.sendEmail({
            to: 'test@example.com',
            subject: 'Test Email',
            html: '<h1>Test</h1>'
        });
        res.json({ success: result });
    } catch (err) {
        res.json({ error: err.message });
    }
});
```

Then visit: `http://localhost:5000/test-email`

## Log File Locations

Backend logs appear in:
- Terminal/Console where `nodemon index.js` is running
- Look for `[NOTIFY]`, `[EMAIL]`, and `[NOTIFY-EMAIL]` prefixes

All logs include timestamps from the Node.js process.

## Next Steps

1. **Restart backend** with logging enabled
2. **Upload an assignment**
3. **Check logs** for the flow
4. **Check email inbox** for the message
5. **Report any errors** seen in logs

---

Once you upload and see the logs, share the terminal output (especially any ❌ errors) and I can diagnose the exact issue!

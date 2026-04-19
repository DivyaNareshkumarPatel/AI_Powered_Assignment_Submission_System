# Push & Email Notification System - Quick Start Guide

## ✅ What's Been Created

### Backend Components
1. **`services/notificationService.js`** - Web push notification handler
2. **`services/emailService.js`** - Email notification handler with templates
3. **`routes/notificationRoutes.js`** - API endpoints for subscription management
4. **`migrations/001_create_notifications_table.sql`** - Database table creation

### Frontend Components
1. **`public/sw.js`** - Service Worker for handling push notifications
2. **`utils/notificationManager.js`** - Notification subscription utilities
3. **`components/NotificationSetup.js`** - User permission prompt component
4. **Updated `app/layout.js`** - Added notification setup to root layout

### Documentation
1. **`NOTIFICATION_SETUP.md`** - Complete setup and integration guide
2. **`NOTIFICATION_INTEGRATION_SAMPLES.js`** - Code examples for each use case
3. **`.env.example`** - Environment variables template

---

## 🚀 Quick Start (5 Steps)

### Step 1: Install Dependencies
```bash
cd backend
npm install web-push nodemailer uuid

cd ../frontend
npm install web-push
```

### Step 2: Generate VAPID Keys
```bash
cd backend
npx web-push generate-vapid-keys
```
Copy the output keys.

### Step 3: Update `.env` File
```env
# Add these to your backend .env
VAPID_PUBLIC_KEY=<paste_public_key>
VAPID_PRIVATE_KEY=<paste_private_key>

EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

FRONTEND_URL=http://localhost:3000
```

### Step 4: Create Database Tables
Run this SQL in your database:
```sql
-- Copy content from: backend/migrations/001_create_notifications_table.sql
```

### Step 5: Update Backend Index.js
Add this to your `backend/index.js`:
```javascript
const notificationRoutes = require('./routes/notificationRoutes');
app.use('/api/notifications', notificationRoutes);
```

---

## 📋 Integration Checklist

After setup, integrate notifications into these controllers:

**Teacher Controller:**
- [ ] `uploadAssignment()` - Add assignment upload notification
- [ ] `updateSubmissionGrade()` - Add marks update notification
- [ ] `resetStudentSubmission()` - Add resubmission request notification
- [ ] `toggleAssignmentStatus()` - Add assignment closed notification

**Student Controller:**
- [ ] `submitStudentRequest()` - Add student request notification

**AI Service:**
- [ ] After AI verification - Add verification complete notification

**Reference:** Use `NOTIFICATION_INTEGRATION_SAMPLES.js` for exact code snippets

---

## 🔔 Notification Types

| Event | Recipient | Type | Trigger |
|-------|-----------|------|---------|
| Assignment Uploaded | Class Students | Push + Email | Teacher uploads |
| Assignment Closed | Class Students | Push + Email | Teacher stops accepting |
| Marks Updated | Student | Push + Email | Teacher grades submission |
| Resubmission Requested | Student | Push + Email | Teacher resets submission |
| AI Verified | Student | Push + Email | AI completes verification |
| Student Request | Teacher | Push + Email | Student requests recheck/resubmit |

---

## ✨ Features

### Web Push Notifications
✅ Non-blocking browser notifications  
✅ Works when app is closed (if Service Worker is registered)  
✅ Click to open relevant page  
✅ Auto-dismiss after 5 seconds  
✅ Permission prompt on first login  

### Email Notifications
✅ Professional HTML templates  
✅ Direct links to app pages  
✅ Works for offline users  
✅ Supports bulk sending  
✅ Error handling & retry logic  

---

## 🧪 Testing

### Test Push Notifications
1. Login as student
2. Accept notification permission prompt
3. Login as teacher in another tab/window
4. Upload new assignment
5. Check student browser for notification

### Test Email Notifications
1. Configure `EMAIL_SERVICE` and credentials in `.env`
2. Create assignment as teacher
3. Check recipient email inbox

### Test Device
- Desktop: ✅ Chrome, Edge, Firefox, Safari
- Mobile: ✅ Chrome, Edge (Firefox limited)

---

## 🔐 Security Notes

1. **VAPID Keys**: Keep PRIVATE KEY secret, never commit to git
2. **Email Password**: Use App Password for Gmail, not regular password
3. **Token Validation**: All endpoints require valid JWT token
4. **CORS**: Configure CORS for your frontend domain

---

## 🐛 Troubleshooting

**Notifications not showing?**
- Check browser notification permissions in settings
- Verify Service Worker registered in DevTools
- Check console for errors

**Emails not sending?**
- Verify email credentials in `.env`
- Check logs: `EMAIL_PASSWORD` correct?
- For Gmail: Use App Password from https://myaccount.google.com/apppasswords
- Check spam folder

**VAPID errors?**
- Regenerate keys with `npx web-push generate-vapid-keys`
- Ensure keys in `.env` are on same line (no line breaks)

**Database errors?**
- Run migration SQL
- Check `push_subscriptions` table exists
- Verify foreign key to `users(user_id)`

---

## 📚 File Reference

```
backend/
├── services/
│   ├── notificationService.js       (Push notifications)
│   └── emailService.js              (Email handler)
├── routes/
│   └── notificationRoutes.js        (Subscribe/Unsubscribe)
└── migrations/
    └── 001_create_notifications_table.sql

frontend/
├── public/
│   └── sw.js                        (Service Worker)
├── src/
│   ├── utils/
│   │   └── notificationManager.js   (Subscription utility)
│   └── components/
│       └── NotificationSetup.js     (Permission prompt)
└── src/app/
    └── layout.js                    (Updated with setup)

Documentation/
├── NOTIFICATION_SETUP.md            (Detailed guide)
├── NOTIFICATION_INTEGRATION_SAMPLES.js
└── .env.example
```

---

## 🎯 Next Steps

1. Install dependencies
2. Generate VAPID keys
3. Configure `.env` file
4. Create database tables
5. Add notification routes to backend
6. Integrate notifications into controllers (use samples)
7. Test with sample data
8. Deploy to production

---

## 📞 Support

For issues:
1. Check `NOTIFICATION_SETUP.md` detailed guide
2. Review `NOTIFICATION_INTEGRATION_SAMPLES.js` for code patterns
3. Check browser console for errors
4. Check backend logs for server errors

---

**Last Updated:** April 19, 2026
**System Status:** ✅ Ready for Integration

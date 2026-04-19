# ⚡ Quick Fix - Add Notification Routes to Backend

## Error You Saw:
```
ServiceWorker script evaluation failed
Error subscribing to push notifications: Failed to fetch VAPID key
```

## Solution: Add notification routes to your backend

### Step 1: Update `backend/index.js`

Open `backend/index.js` and add this line with your other routes:

**Find this section (where your other route imports are):**
```javascript
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
```

**Add this line after them:**
```javascript
const notificationRoutes = require('./routes/notificationRoutes');
```

---

### Step 2: Register the routes

**Find this section (where routes are registered):**
```javascript
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
```

**Add this line after them:**
```javascript
app.use('/api/notifications', notificationRoutes);
```

---

### Example (Complete):

```javascript
// ===== ROUTES =====
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const notificationRoutes = require('./routes/notificationRoutes');  // ← ADD THIS

// ... other code ...

// ===== USE ROUTES =====
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/notifications', notificationRoutes);  // ← ADD THIS
```

---

## Step 3: Restart Backend

```bash
cd backend
npm start
# or if using nodemon
nodemon index.js
```

---

## Step 4: Verify in Browser Console

You should see:
```
✅ Service Worker registered successfully
✅ Subscription saved to backend (once VAPID key is fetched)
```

---

## If Still Getting Error:

1. **Check backend is running**: Open http://localhost:5000 in browser
2. **Check routes are added**: Search for `notificationRoutes` in `index.js`
3. **Check .env has keys**:
   ```bash
   cd backend
   cat .env | grep VAPID
   ```
4. **Check database tables created**: Run the migration SQL
5. **Clear browser cache**: Ctrl+Shift+Delete and hard refresh

---

## Minimal Setup Checklist

- [ ] Added notification route import to `index.js`
- [ ] Added notification route registration to `index.js`
- [ ] Backend restarted
- [ ] VAPID keys in `.env`
- [ ] Database tables created
- [ ] Email credentials in `.env` (optional, for email notifications)
- [ ] Hard refresh browser (Ctrl+F5)

✅ That's it! Notifications should now work.

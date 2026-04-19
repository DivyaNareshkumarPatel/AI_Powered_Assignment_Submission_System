# 🔑 How to Get Notification Keys - Complete Guide

## 1️⃣ VAPID Keys (For Web Push Notifications)

### What are VAPID Keys?
VAPID (Voluntary Application Server Identification) keys are used to authenticate your server when sending push notifications to browsers.

### How to Generate:

**Step 1:** Open terminal in `backend` folder
```bash
cd backend
npx web-push generate-vapid-keys
```

**Step 2:** You'll see output like:
```
Public Key: 
BEq4QAbcdefGH1234ijk5mnopQrstu9vwxyZ123456789aBCDEFGHIJKLMNOPQRSTuvwxyz=

Private Key:
aBcDeFgHijKLmNoPqrStUvWxYz1234567890abCdEfGhIjKlMnOpQrStUvWx==
```

**Step 3:** Copy-paste into `.env`:
```env
VAPID_PUBLIC_KEY=BEq4QAbcdefGH1234ijk5mnopQrstu9vwxyZ123456789aBCDEFGHIJKLMNOPQRSTuvwxyz=
VAPID_PRIVATE_KEY=aBcDeFgHijKLmNoPqrStUvWxYz1234567890abCdEfGhIjKlMnOpQrStUvWx==
```

✅ **That's it!** No external service needed.

---

## 2️⃣ Gmail Email Credentials (For Email Notifications)

### Why Not Your Regular Password?
Gmail doesn't allow regular password for third-party apps. You need an "App Password" instead.

### Steps to Get Gmail App Password:

**Step 1:** Go to your Google Account
- Open: https://myaccount.google.com/security

**Step 2:** Enable 2-Factor Authentication (if not already enabled)
- Click "2-Step Verification"
- Follow the prompts (you'll need your phone)

**Step 3:** Create App Password
- After 2-Factor is enabled, go back to Security page
- Look for "App Passwords"
- Select app: **Mail**
- Select device: **Windows Computer** (or your device)
- Google will generate a 16-character password

**Step 4:** Copy the generated password

**Step 5:** Update `.env`:
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  # 16-character password from Google
FRONTEND_URL=http://localhost:3000
```

⚠️ **Important:** Remove spaces from the password when pasting:
```env
EMAIL_PASSWORD=xxxxxxxxxxxxxxxx
```

---

## 3️⃣ Alternative Email Providers

If you prefer not to use Gmail, here are alternatives:

### **Outlook / Office 365**
```env
EMAIL_SERVICE=outlook
EMAIL_USER=your_email@outlook.com
EMAIL_PASSWORD=your_password
```

### **SendGrid** (Recommended for production)
1. Create free account: https://sendgrid.com/free
2. Create API Key in Settings
3. Update `.env`:
```env
EMAIL_SERVICE=custom
SENDGRID_API_KEY=your_api_key
EMAIL_USER=noreply@yourdomain.com
```

### **Mailgun** (Recommended for production)
1. Create free account: https://www.mailgun.com/
2. Get API Key from dashboard
3. Update `.env`:
```env
EMAIL_SERVICE=mailgun
MAILGUN_API_KEY=your_api_key
MAILGUN_DOMAIN=mg.yourdomain.com
EMAIL_USER=noreply@yourdomain.com
```

---

## 📝 Complete .env Template

Copy this entire setup to your `backend/.env`:

```env
# ===== DATABASE =====
PORT=5000
DB_USER=neondb_owner
DB_PASSWORD=npg_Ym1XHu9eKlBq
DB_HOST=ep-crimson-fog-ai1860p9-pooler.c-4.us-east-1.aws.neon.tech
DB_PORT=5432
DB_NAME=neondb

# ===== CLOUDINARY (File Upload) =====
CLOUDINARY_CLOUD_NAME=ddcf7mx3l
CLOUDINARY_API_KEY=512789176537679
CLOUDINARY_API_SECRET=e8RtAF2TEsRh7uMitcWF2Uu5nIM

# ===== PYTHON AI SERVICE =====
PYTHON_API_URL=http://127.0.0.1:8000

# ===== WEB PUSH NOTIFICATIONS =====
# Run: npx web-push generate-vapid-keys (in backend folder)
VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY_HERE
VAPID_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE

# ===== EMAIL NOTIFICATIONS =====
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=YOUR_APP_PASSWORD_HERE
FRONTEND_URL=http://localhost:3000

# JWT Secret (add if not already present)
JWT_SECRET=your_jwt_secret_key_here
```

---

## 🧪 Testing Your Configuration

### Test VAPID Keys:
```bash
# Keys are automatically validated when backend starts
# Check console for: "VAPID keys configured successfully"
```

### Test Email:
Run this simple test in Node:
```bash
cd backend
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your_email@gmail.com',
    pass: 'your_app_password'
  }
});

transporter.sendMail({
  from: 'your_email@gmail.com',
  to: 'test@example.com',
  subject: 'Test',
  text: 'Test email'
}, (err, info) => {
  if (err) console.log('❌ Failed:', err.message);
  else console.log('✅ Success:', info.response);
});
"
```

---

## 🚨 Common Issues & Solutions

### ❌ "VAPID keys not configured"
**Solution:** 
- Regenerate keys: `npx web-push generate-vapid-keys`
- Make sure `.env` file is saved
- Restart backend server

### ❌ "535-5.7.8 Username and Password not accepted"
**Solution:**
- Using Gmail? Make sure you're using App Password, NOT regular password
- Check EMAIL_PASSWORD has NO SPACES
- Try removing space characters from the 16-char password

### ❌ "ENOTFOUND - cannot find email service"
**Solution:**
- Check `EMAIL_SERVICE=gmail` is spelled correctly
- Check `EMAIL_USER` is a valid email format

### ❌ "535-5.7.45 PLAIN authentication not allowed"
**Solution (Gmail):**
- Go to: https://myaccount.google.com/security
- Find "Less secure apps" or use App Password instead

---

## 🔐 Security Best Practices

1. **Never commit `.env` to git**
   ```bash
   # Add to .gitignore
   echo ".env" >> .gitignore
   ```

2. **Use different keys for development and production**
   - Dev: `FRONTEND_URL=http://localhost:3000`
   - Prod: `FRONTEND_URL=https://yourdomain.com`

3. **Rotate App Passwords periodically**
   - Delete old Gmail App Password
   - Create new one every 3-6 months

4. **Keep VAPID keys private**
   - Private key should never be shared
   - Only PUBLIC key goes to frontend

---

## ✅ Verification Checklist

- [ ] VAPID keys generated
- [ ] VAPID_PUBLIC_KEY added to `.env`
- [ ] VAPID_PRIVATE_KEY added to `.env`
- [ ] Gmail account has 2FA enabled
- [ ] Gmail App Password created
- [ ] EMAIL_USER and EMAIL_PASSWORD added to `.env`
- [ ] FRONTEND_URL set correctly
- [ ] `.env` file saved
- [ ] Backend server restarted

---

## 📞 Quick Reference

| Key | Where to Get | How Long | Expires |
|-----|-------------|----------|---------|
| VAPID_PUBLIC_KEY | Run `npx web-push generate-vapid-keys` | 2 min | Never |
| VAPID_PRIVATE_KEY | Run `npx web-push generate-vapid-keys` | 2 min | Never |
| EMAIL_USER | Your Gmail address | - | - |
| EMAIL_PASSWORD | Gmail App Password | 5 min setup | Never (usually) |
| FRONTEND_URL | Your domain | - | - |

---

## 🎯 Next Steps

1. ✅ Generate VAPID keys (run command above)
2. ✅ Update .env with VAPID keys
3. ✅ Get Gmail App Password
4. ✅ Update .env with email credentials
5. ✅ Restart backend server
6. ✅ Test notifications in app

---

**Last Updated:** April 19, 2026
**Status:** Ready to configure ✅

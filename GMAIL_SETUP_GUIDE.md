# 📧 Gmail SMTP Setup Guide for Expe

This guide will help you configure Gmail SMTP for sending emails from your Expe application.

---

## 🔐 Method 1: Using Gmail App Password (Recommended)

### Step 1: Enable 2-Factor Authentication

1. Go to your Google Account: https://myaccount.google.com/
2. Click on **Security** in the left sidebar
3. Under "Signing in to Google", click on **2-Step Verification**
4. Follow the steps to enable 2FA (you'll need your phone)

### Step 2: Generate App Password

1. After enabling 2FA, go back to **Security**
2. Scroll down to "Signing in to Google"
3. Click on **App passwords**
4. You might need to sign in again
5. Select **Mail** for app, and **Other** for device
6. Name it "Expe Backend" or any name you prefer
7. Click **Generate**
8. **IMPORTANT**: Copy the 16-character password (it looks like: `abcd efgh ijkl mnop`)
9. Save it somewhere safe - you won't be able to see it again!

### Step 3: Configure Backend .env File

Edit your `backend/.env` file:

```env
# Email Configuration (Gmail)
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=abcdefghijklmnop       # The 16-char app password (remove spaces)
EMAIL_FROM=your.email@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false

# Frontend URL for email links
FRONTEND_URL=http://localhost:5173
```

### Step 4: Test the Configuration

Restart your backend server:
```bash
cd backend
npm run dev
```

Try to sign up or login - you should receive emails!

---

## 📝 Method 2: Less Secure App Access (Not Recommended)

⚠️ **Warning**: This method is less secure and Google is phasing it out.

1. Go to https://myaccount.google.com/lesssecureapps
2. Turn on "Allow less secure apps"
3. Use your regular Gmail password in `.env`:

```env
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=your_actual_gmail_password
```

---

## 🧪 Testing Email Functionality

### Test Signup Email:
```bash
# Using Postman or curl
POST http://localhost:3000/api/auth/signup
Content-Type: application/json

{
  "name": "Test User",
  "email": "test@example.com",
  "password": "Test@123",
  "confirmPassword": "Test@123",
  "companyName": "Test Company",
  "country": "United States",
  "currency": "USD"
}
```

### Test Login Alert Email:
```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test@123"
}
```

---

## 🐛 Troubleshooting

### Problem: "Invalid login: 535-5.7.8 Username and Password not accepted"

**Solutions**:
1. Make sure 2FA is enabled on your Google account
2. Generate a new App Password
3. Remove all spaces from the app password
4. Use the app password, NOT your regular Gmail password

### Problem: "Connection timeout"

**Solutions**:
1. Check if SMTP_PORT is set to 587
2. Make sure SMTP_SECURE is false (not true)
3. Check your firewall/antivirus settings
4. Try using port 465 with SMTP_SECURE=true

### Problem: Emails sent but not received

**Solutions**:
1. Check your spam/junk folder
2. Check Gmail's Sent folder to confirm email was sent
3. Try sending to a different email address
4. Check email service provider's blacklist status

### Problem: "Application-specific password required"

**Solutions**:
1. You MUST use an App Password, not your regular password
2. Follow Step 2 above to generate one
3. Make sure 2FA is enabled first

---

## 🔍 Verify Your Configuration

### Check if emails are being sent (Development):

When running in development mode, check your console logs:
```
[info]: Email sent: <message-id>
[info]: Preview URL: https://ethereal.email/message/...
```

### Check Gmail Sent folder:

1. Open Gmail in browser
2. Go to "Sent" folder
3. Look for emails from your app

---

## 📊 Gmail Sending Limits

- **Free Gmail accounts**: 500 emails per day
- **Google Workspace**: 2,000 emails per day
- **Per minute**: 20-30 emails per minute

If you exceed limits, consider:
- Using SendGrid (100 emails/day free)
- Using AWS SES (62,000 emails/month free)
- Using Mailgun (5,000 emails/month free)

---

## 🌍 Alternative Email Services

If Gmail doesn't work, try these:

### SendGrid:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your_sendgrid_api_key
```

### Mailgun:
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
EMAIL_USER=postmaster@your-domain.mailgun.org
EMAIL_PASS=your_mailgun_password
```

### AWS SES:
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
EMAIL_USER=your_ses_smtp_username
EMAIL_PASS=your_ses_smtp_password
```

---

## 📝 Complete .env Example

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expe_db
DB_USER=postgres
DB_PASSWORD=your_db_password

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Email (Gmail with App Password)
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=abcdefghijklmnop
EMAIL_FROM=your.email@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Gemini API (for OCR)
GEMINI_API_KEY=your_gemini_api_key_here

# Currency API
EXCHANGE_RATE_API_KEY=your_exchange_rate_api_key
```

---

## ✅ Quick Checklist

- [ ] Gmail account with 2FA enabled
- [ ] App Password generated
- [ ] `.env` file updated with correct credentials
- [ ] Backend server restarted
- [ ] Test email sent successfully
- [ ] Email received (check spam folder too)

---

## 🆘 Still Having Issues?

1. Check backend console logs for errors
2. Verify all environment variables are set correctly
3. Try generating a new App Password
4. Test with a different email provider (ethereal.email for testing)
5. Check Google Account security page for blocked sign-in attempts

---

## 📧 Email Templates Available

Your app sends these emails:

1. **Welcome Email** - On signup
2. **Login Alert** - Every login with device/location info
3. **Password Reset** - When user requests password reset
4. **Expense Submitted** - When employee submits expense
5. **Approval Request** - When manager needs to approve
6. **Expense Approved** - When expense is approved
7. **Expense Rejected** - When expense is rejected
8. **Finally Approved** - When all approvals are complete

All templates are in: `backend/src/templates/emails/`

---

**Need help? Check the logs or contact support!** 🚀

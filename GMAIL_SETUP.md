# 📧 Gmail Setup Guide for Expe Email System

This guide will help you configure your Gmail account to send emails from your Expe application.

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Enable 2-Factor Authentication

1. Go to your Google Account: https://myaccount.google.com/
2. Click on **Security** in the left sidebar
3. Under "How you sign in to Google", click **2-Step Verification**
4. Follow the setup process (usually requires phone verification)

### Step 2: Generate App Password

1. After enabling 2FA, go to: https://myaccount.google.com/apppasswords
   - Or navigate: Google Account → Security → 2-Step Verification → App passwords
2. Select app: **Mail**
3. Select device: **Other (Custom name)**
4. Enter name: `Expe Backend`
5. Click **Generate**
6. **Copy the 16-character password** (looks like: `abcd efgh ijkl mnop`)

### Step 3: Configure Backend .env File

Open `backend/.env` and update these values:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_FROM=your-email@gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop    # The app password from Step 2 (no spaces)
```

**Important**: 
- Use the **App Password**, NOT your regular Gmail password
- Remove spaces from the app password when pasting

---

## 🔧 Complete Configuration

### Your backend/.env file should look like this:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_db
DB_USER=postgres
DB_PASSWORD=your_db_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Email Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_FROM=yourname@gmail.com
EMAIL_USER=yourname@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop

# Gemini AI Configuration (for OCR)
GEMINI_API_KEY=your-gemini-api-key-here

# Exchange Rate API (optional)
EXCHANGE_RATE_API_KEY=your-api-key-here
```

---

## 🧪 Test Your Configuration

### Method 1: Using Postman

1. Start your backend server: `npm run dev`
2. Import the Postman collection
3. Run the **Signup** request
4. Check your email inbox for the welcome email

### Method 2: Using Code

Create a test file `backend/test-email.js`:

```javascript
import { sendWelcomeEmail } from './src/utils/email.js';

const testUser = {
  name: 'Test User',
  email: 'your-email@gmail.com',
  role: 'admin'
};

sendWelcomeEmail(testUser, 'TempPassword123')
  .then(() => {
    console.log('✅ Email sent successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Email failed:', error);
    process.exit(1);
  });
```

Run: `node backend/test-email.js`

---

## 🔥 Gemini AI Setup (for OCR)

### Get Free Gemini API Key

1. Visit: https://makersuite.google.com/app/apikey
2. Click **"Create API Key"**
3. Select your Google Cloud project (or create new one)
4. Copy the API key
5. Add to `backend/.env`:

```env
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Install Gemini SDK

```bash
cd backend
npm install @google/generative-ai
```

---

## 📋 Email Templates Included

The system includes 8 beautiful HTML email templates:

1. **welcome.html** - New user welcome email
2. **login-alert.html** - Login security notification
3. **password-reset.html** - Password reset with secure link
4. **expense-submitted.html** - Expense submission confirmation
5. **approval-request.html** - Approval request to manager
6. **expense-approved.html** - Expense approval notification
7. **expense-rejected.html** - Expense rejection with reason
8. **expense-finally-approved.html** - Final approval & payment notification

All templates are:
- ✅ Mobile responsive
- ✅ Professional design
- ✅ Branded with Expe colors
- ✅ Include all necessary information

---

## 🐛 Troubleshooting

### Issue: "Invalid login: 535-5.7.8 Username and Password not accepted"

**Solution**: Make sure you're using an **App Password**, not your regular Gmail password.

### Issue: "Connection timeout"

**Solution**: Check your firewall/antivirus isn't blocking port 587.

### Issue: "No recipients defined"

**Solution**: Verify EMAIL_FROM and EMAIL_USER are set correctly in .env

### Issue: Emails going to spam

**Solutions**:
1. Send test email to yourself first
2. Mark it as "Not Spam"
3. Add your domain to SPF/DKIM records (for production)
4. Use a professional email domain (not @gmail.com) for production

---

## 🔒 Security Best Practices

### For Development:
- ✅ Use App Passwords (never regular password)
- ✅ Keep .env file in .gitignore
- ✅ Use different passwords for dev/prod

### For Production:
- ✅ Use professional email service (SendGrid, Mailgun, AWS SES)
- ✅ Set up SPF, DKIM, and DMARC records
- ✅ Use environment variables (not .env files)
- ✅ Enable email logging and monitoring
- ✅ Set up rate limiting

---

## 🌐 Alternative Email Services

If you want to use services other than Gmail:

### SendGrid (Recommended for Production)

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
```

### Mailgun

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=postmaster@your-domain.mailgun.org
EMAIL_PASS=your-mailgun-password
```

### Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

---

## 📊 Email Sending Limits

### Gmail Limits:
- **Free Account**: 500 emails/day
- **Google Workspace**: 2,000 emails/day
- **Per minute**: ~20 emails

### Recommendations:
- For < 100 users: Gmail is fine
- For 100-1000 users: Use SendGrid/Mailgun
- For > 1000 users: Use AWS SES or dedicated email service

---

## 🎯 Testing Checklist

Before going live, test all email types:

- [ ] Welcome email (on signup)
- [ ] Login alert email (on login)
- [ ] Password reset email
- [ ] Expense submitted email
- [ ] Approval request email
- [ ] Expense approved email
- [ ] Expense rejected email
- [ ] Final approval email

---

## 📞 Need Help?

If you're stuck:
1. Check logs: `backend/logs/app.log`
2. Enable debug mode in .env: `NODE_ENV=development`
3. Test SMTP connection: Use online SMTP testers
4. Check Gmail security settings
5. Verify App Password is correct

---

## ✅ Quick Verification

After setup, verify everything works:

```bash
# Start backend
cd backend
npm run dev

# In another terminal, test email
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "your-email@gmail.com",
    "password": "Test@1234",
    "confirmPassword": "Test@1234",
    "companyName": "Test Company",
    "country": "United States",
    "currency": "USD"
  }'

# Check your email inbox!
```

---

**That's it! Your email system is now configured and ready to send beautiful emails! 📧✨**

For production deployment, see `DEPLOYMENT.md` for advanced configuration.

# Expe - Complete Setup Guide

## Prerequisites

- Node.js 18+ installed
- Docker Desktop installed and running
- Git installed
- A code editor (VS Code recommended)

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Mihir-Rabari/Odoo-iitgn.git
cd Odoo-iitgn
```

### 2. Start Docker Services

```bash
docker-compose up -d
```

This will start:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Prometheus (port 9090)
- Grafana (port 3001)

Verify all services are running:
```bash
docker-compose ps
```

### 3. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env` and configure your settings (SMTP for emails, etc.):
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://expe_user:expe_password@localhost:5432/expe_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@expe.com
```

Run database migrations:
```bash
npm run migrate
```

Start the backend server:
```bash
npm run dev
```

Backend will be running on `http://localhost:3000`

### 4. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
```

Create `.env` file:
```bash
cp .env.example .env
```

The default configuration should work:
```env
VITE_API_URL=http://localhost:3000/api
```

Start the frontend development server:
```bash
npm run dev
```

Frontend will be running on `http://localhost:5173`

### 5. Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

## First Time Setup

1. Click "Get Started" or "Sign Up"
2. Fill in:
   - Your name and email
   - Password (min 8 characters)
   - Company name
   - Select your country
   - Select your currency
3. Click "Create Account"
4. You'll be automatically logged in as an Admin

## Default Credentials (After Signup)

You are the admin with the credentials you just created!

## Adding Users

As an Admin:
1. Go to Dashboard → Users
2. Click "Create User"
3. Fill in user details
4. Assign role (Admin, Manager, or Employee)
5. Optionally assign a manager
6. User will receive an email with temporary password

## Creating Expenses

As an Employee:
1. Go to Dashboard → Expenses → New
2. Either:
   - Upload a receipt (OCR will auto-fill details)
   - Manually enter expense details
3. Fill in:
   - Description
   - Category
   - Amount and Currency
   - Date
   - Paid by (optional)
4. Click "Submit for Approval"

## Approving Expenses

As a Manager/Admin:
1. Go to Dashboard → Approvals
2. View pending expenses
3. Review details and receipt
4. Click "Approve" or "Reject" with comments

## Setting Up Approval Rules

As an Admin:
1. Go to Dashboard → Approval Rules
2. Click "Create Rule"
3. Configure:
   - Sequential approvers (Step 1, Step 2, etc.)
   - Percentage-based approval (e.g., 60% must approve)
   - Specific approver bypass (e.g., CFO can auto-approve)
   - Hybrid rules (combine both)
4. Save the rule

## Monitoring

### Prometheus Metrics
Access: `http://localhost:9090`

View metrics:
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request duration
- `expense_submissions_total` - Total expense submissions
- `approval_actions_total` - Total approval actions

### Grafana Dashboard
Access: `http://localhost:3001`
- Default credentials: `admin` / `admin`
- Prometheus datasource is pre-configured
- Create custom dashboards for expense analytics

## Email Configuration (Important!)

For email notifications to work:

### Gmail Setup
1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Generate an App Password:
   - Go to Security → App passwords
   - Create a new app password for "Mail"
4. Use this app password in `.env` as `EMAIL_PASS`

### Other SMTP Providers
Update these in `.env`:
```env
SMTP_HOST=your-smtp-host.com
SMTP_PORT=587
EMAIL_USER=your-email
EMAIL_PASS=your-password
```

## Testing OCR Feature

1. Use a real receipt image (JPG, PNG)
2. Make sure text is clear and well-lit
3. Upload in "Create Expense" page
4. OCR will attempt to extract:
   - Amount
   - Date
   - Merchant name
   - Currency

## Troubleshooting

### Backend won't start
- Check if port 3000 is available
- Verify PostgreSQL is running: `docker-compose ps`
- Check database connection in `.env`

### Frontend won't start
- Check if port 5173 is available
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

### Database connection errors
- Ensure Docker containers are running
- Check DATABASE_URL in `.env`
- Run migrations: `npm run migrate`

### Email not sending
- Verify SMTP credentials in `.env`
- Check email logs in backend console
- For Gmail, ensure App Password is used (not regular password)

### OCR not working
- Ensure image is clear and text is readable
- Supported formats: JPG, PNG
- Max file size: 10MB

## Development Tips

### Backend API Testing
Use tools like Postman or Thunder Client:
- Import API endpoint documentation
- Set Authorization header: `Bearer YOUR_JWT_TOKEN`

### Database Access
Connect to PostgreSQL:
```bash
docker exec -it expe-postgres psql -U expe_user -d expe_db
```

Useful queries:
```sql
-- View all users
SELECT * FROM users;

-- View all expenses
SELECT * FROM expenses;

-- View approval history
SELECT * FROM approval_history;
```

### Redis Access
Connect to Redis:
```bash
docker exec -it expe-redis redis-cli
```

Commands:
```redis
KEYS *              # View all keys
GET key_name        # Get value
FLUSHALL            # Clear all cache
```

## Production Deployment

### Backend
1. Set `NODE_ENV=production` in `.env`
2. Use proper database (not Docker)
3. Set strong `JWT_SECRET`
4. Configure production SMTP
5. Deploy to services like:
   - Heroku
   - Railway
   - DigitalOcean App Platform
   - AWS EC2

### Frontend
1. Build production bundle:
   ```bash
   npm run build
   ```
2. Deploy `dist` folder to:
   - Vercel
   - Netlify
   - Cloudflare Pages
   - AWS S3 + CloudFront

### Database
Use managed PostgreSQL:
- AWS RDS
- DigitalOcean Managed Database
- Supabase
- Railway PostgreSQL

## Support

For issues or questions:
- Check documentation
- Review error logs
- Check Docker container logs: `docker-compose logs`

## Next Steps

1. ✅ Complete remaining frontend pages (in progress)
2. ✅ Add comprehensive error handling
3. ✅ Implement real-time notifications
4. ✅ Add export functionality (CSV/PDF)
5. ✅ Create admin analytics dashboard
6. ✅ Add audit logging
7. ✅ Implement file management for receipts
8. ✅ Add mobile responsive improvements

## License

MIT License - See LICENSE file for details

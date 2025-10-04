# Expe - Expense Reimbursement System

A comprehensive expense management system with multi-level approval workflows, OCR receipt scanning, and conditional approval rules.

## Features

- **Authentication & User Management**: Auto-create company and admin on first signup
- **Multi-Currency Support**: Submit expenses in any currency with real-time conversion
- **Multi-Level Approvals**: Sequential approval workflows with flexible routing
- **Conditional Approval Rules**: Percentage-based and specific approver rules
- **OCR Receipt Scanning**: Auto-extract expense details from receipts
- **Role-Based Access**: Admin, Manager, and Employee roles with specific permissions

## Tech Stack

### Backend
- Node.js with Express
- PostgreSQL (Database)
- Redis (Caching & Session Management)
- JWT Authentication
- Tesseract.js (OCR)
- Docker

### Frontend
- React 18
- TailwindCSS
- shadcn/ui
- Lucide Icons
- Vite

### Monitoring
- Prometheus (Metrics)
- Grafana (Visualization)

## Project Structure

```
├── backend/           # Node.js Express API
├── frontend/          # React application
├── docker/            # Docker configurations
└── monitoring/        # Prometheus & Grafana configs
```

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Mihir-Rabari/Odoo-iitgn.git
cd Odoo-iitgn
```

2. Start infrastructure services:
```bash
docker-compose up -d
```

3. Install backend dependencies:
```bash
cd backend
npm install
```

4. Install frontend dependencies:
```bash
cd frontend
npm install
```

5. Run migrations:
```bash
cd backend
npm run migrate
```

6. Start development servers:
```bash
# Backend
cd backend
npm run dev

# Frontend (in another terminal)
cd frontend
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account and company
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset

### Users
- `GET /api/users` - List users (Admin only)
- `POST /api/users` - Create user (Admin only)
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)

### Expenses
- `GET /api/expenses` - List expenses (filtered by role)
- `POST /api/expenses` - Submit expense
- `GET /api/expenses/:id` - Get expense details
- `PATCH /api/expenses/:id` - Update expense
- `POST /api/expenses/ocr` - Extract expense from receipt

### Approvals
- `GET /api/approvals/pending` - Get pending approvals
- `POST /api/approvals/:id/approve` - Approve expense
- `POST /api/approvals/:id/reject` - Reject expense

### Approval Rules
- `GET /api/approval-rules` - List approval rules
- `POST /api/approval-rules` - Create approval rule
- `PATCH /api/approval-rules/:id` - Update approval rule
- `DELETE /api/approval-rules/:id` - Delete approval rule

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/expe

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# External APIs
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4/latest
COUNTRIES_API_URL=https://restcountries.com/v3.1/all

# Server
PORT=3000
NODE_ENV=development
```

## License

MIT

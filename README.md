# Shega - Business Management Platform

A complete SaaS website + License Management Platform for the Shega Desktop/Mobile ERP/POS System targeting Ethiopian wholesalers, retailers, distributors, warehouses, and SMEs.

## Tech Stack

**Frontend:** Next.js 16, TypeScript, Tailwind CSS v4, Framer Motion, React Query, Zustand  
**Backend:** Django 6, Django REST Framework, JWT Auth  
**Database:** PostgreSQL (SQLite for development)

## Project Structure

```
shega-admin/
├── frontend/                    # Next.js frontend
│   ├── src/
│   │   ├── app/                 # Pages (App Router)
│   │   │   ├── page.tsx         # Landing page
│   │   │   ├── features/        # Features page
│   │   │   ├── pricing/         # Pricing page
│   │   │   ├── download/        # Download center
│   │   │   ├── contact/         # Contact page
│   │   │   ├── auth/            # Login/Register
│   │   │   ├── customer/        # Customer portal
│   │   │   │   ├── licenses/    # License management
│   │   │   │   ├── payments/    # Payment upload
│   │   │   │   ├── invoices/    # Invoice view
│   │   │   │   ├── download/    # Software download
│   │   │   │   └── profile/     # Profile settings
│   │   │   └── admin/           # Admin dashboard
│   │   │       ├── customers/   # Customer management
│   │   │       ├── licenses/    # License management
│   │   │       ├── plans/       # License plans
│   │   │       ├── payments/    # Payment verification
│   │   │       ├── invoices/    # Invoice management
│   │   │       ├── notifications/ # Notification system
│   │   │       └── settings/    # System settings
│   │   ├── components/
│   │   │   ├── layout/          # Navbar, Footer
│   │   │   ├── sections/        # Hero, Features, Pricing, etc.
│   │   │   └── ui/              # Button, Card, Modal, Table, etc.
│   │   ├── lib/                 # API client, types, utils
│   │   └── store/               # Zustand stores
│   └── .env.local
└── backend/                     # Django backend
    ├── backend/
    │   ├── settings.py          # Django settings
    │   ├── urls.py              # Main URL config
    │   └── dashboard.py         # Admin dashboard stats
    ├── accounts/                # User auth app
    ├── customers/               # Customer profiles
    ├── licenses/                # License management
    │   ├── models.py            # License, DeviceActivation, AuditLog
    │   ├── views.py             # License CRUD + actions
    │   ├── utils.py             # Key generation helpers
    │   └── signals.py           # Auto-expiry + audit logging
    ├── payments/                # Payment verification
    │   ├── models.py            # Payment, Invoice
    │   └── utils.py             # Payment processing
    ├── notifications/           # Notification system
    ├── api_public/              # Public License Verification API
    ├── seed.py                  # Initial data seeder
    └── .env
```

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt  # or pip install django djangorestframework django-cors-headers djangorestframework-simplejwt python-dotenv django-filter pillow
cp .env.example .env
python manage.py migrate
python seed.py
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Default Credentials

| Role     | Username    | Password      |
|----------|-------------|---------------|
| Admin    | admin       | admin123      |
| Customer | customer1   | customer123   |

## API Endpoints

### Authentication
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login (returns JWT tokens)
- `POST /api/auth/logout/` - Logout (blacklists refresh token)
- `GET /api/auth/profile/` - Get/update user profile

### License Management
- `GET/POST /api/licenses/plans/` - License plans CRUD
- `GET/POST /api/licenses/licenses/` - Licenses list/create
- `POST /api/licenses/licenses/{id}/renew/` - Renew license
- `POST /api/licenses/licenses/{id}/suspend/` - Suspend license
- `POST /api/licenses/licenses/{id}/revoke/` - Revoke license
- `POST /api/licenses/licenses/{id}/activate_device/` - Activate device
- `POST /api/licenses/licenses/{id}/deactivate_device/` - Deactivate device

### Public License Verification API (no auth required)
- `POST /api/license/verify` - Verify license (rate limited: 50/min)
- `POST /api/license/activate` - Activate device for license
- `POST /api/license/deactivate` - Deactivate device
- `POST /api/license/renew` - Renew license via API
- `GET /api/license/status?license_key=XXX` - Get license status

### Payments
- `GET/POST /api/payments/payments/` - Payments list/create
- `POST /api/payments/payments/{id}/review/` - Admin approve/reject payment
- `GET /api/payments/payments/my-payments/` - Customer's payments
- `GET/POST /api/payments/invoices/` - Invoices CRUD

### Customers
- `GET/POST /api/customers/customers/` - Customer profiles CRUD

### Notifications
- `GET /api/notifications/notifications/` - User notifications
- `POST /api/notifications/notifications/{id}/mark_read/` - Mark as read
- `POST /api/notifications/notifications/mark_all_read/` - Mark all read

### Admin
- `GET /api/admin/dashboard/` - Dashboard statistics (admin only)

## License Key Format

Keys are auto-generated in format: `ERP-XXXX-XXXX-XXXX` (e.g., `ERP-8X3K-P7A2-L9QW`)

## Features

- **Product Marketing Website** - Premium landing page with animations
- **Customer Portal** - License management, payments, downloads
- **Admin Dashboard** - Analytics, customer/license/payment management
- **License Management** - Full lifecycle (create, activate, suspend, revoke, renew)
- **Device Activation** - Per-device tracking with limit enforcement
- **Payment Verification** - Receipt upload + admin approval workflow
- **Notification System** - In-app notifications for renewals, expirations
- **Public API** - License verification endpoints with rate limiting
- **Audit Logging** - Complete audit trail for all license actions

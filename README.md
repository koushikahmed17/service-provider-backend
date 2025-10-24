# Service Provider Platform

A comprehensive service provider platform built with NestJS (backend) and React (frontend), featuring authentication, service catalog management, and geospatial search capabilities.

## 🏗️ Architecture

### Backend (NestJS + Prisma + PostgreSQL)

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + OTP with Passport.js
- **Security**: Helmet, CSRF protection, Rate limiting
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest + Supertest for E2E tests

### Frontend (React + Vite + TypeScript)

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit + RTK Query
- **Routing**: React Router v6
- **Internationalization**: i18next

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Git

> **Note**: Docker is optional! See [SETUP_WITHOUT_DOCKER.md](SETUP_WITHOUT_DOCKER.md) for non-Docker setup.

### 1. Clone and Setup

```bash
git clone <repository-url>
cd service-provider
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your database credentials

# Start PostgreSQL with Docker
docker-compose up -d

# Run database migrations
npx prisma migrate dev

# Seed the database
npx prisma db seed

# Start development server
npm run start:dev
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your API URL

# Start development server
npm run dev
```

## 📁 Project Structure

```
service-provider/
├── backend/                 # NestJS Backend
│   ├── src/
│   │   ├── modules/        # Feature modules
│   │   │   ├── auth/       # Authentication & Authorization
│   │   │   ├── user/       # User management
│   │   │   ├── admin/      # Admin operations
│   │   │   ├── service-catalog/ # Service catalog management
│   │   │   └── file-upload/ # File upload handling
│   │   ├── common/         # Shared utilities
│   │   ├── core/          # Core services
│   │   └── config/        # Configuration files
│   ├── prisma/            # Database schema & migrations
│   ├── test/              # Test files
│   └── postman/           # API collections
├── frontend/              # React Frontend
│   ├── src/
│   │   ├── features/      # Feature modules
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── routes/        # Routing configuration
│   │   └── types/         # TypeScript types
└── README.md
```

## 🔧 Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/service_provider_db?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="1h"

# App
NODE_ENV="development"
PORT=3000
API_PREFIX="api/v1"

# CORS
CORS_ORIGIN="http://localhost:5173"

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# OTP
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=3
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_APP_NAME=Service Provider Platform
```

## 🗄️ Database Schema

### Core Models

- **User**: Customer and Professional accounts
- **Role**: ADMIN, CUSTOMER, PROFESSIONAL
- **Permission**: Granular access control
- **Session**: User session management
- **OTP**: One-time password storage

### Service Catalog Models

- **ServiceCategory**: Hierarchical service categories
- **ServiceTag**: Service tags for filtering
- **ProfessionalProfile**: Professional-specific data
- **ProfessionalService**: Services offered by professionals

### Additional Models

- **AuditLog**: System audit trail
- **Booking**: Service bookings (future)
- **Review**: Service reviews (future)
- **Payment**: Payment processing (future)

## 🔐 Authentication & Authorization

### User Types

1. **CUSTOMER**: Can book services, leave reviews
2. **PROFESSIONAL**: Can offer services, manage availability
3. **ADMIN**: Full system access

### Authentication Methods

- **Password-based**: Traditional email/password login
- **OTP-based**: Phone/email OTP verification
- **JWT Tokens**: Access token + Refresh token (httpOnly cookie)

### Security Features

- Password hashing with bcrypt
- Rate limiting on OTP endpoints
- CSRF protection
- Helmet security headers
- Input validation with class-validator
- SQL injection prevention with Prisma

## 🛠️ API Endpoints

### Authentication

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/otp/send` - Send OTP
- `POST /auth/otp/verify` - Verify OTP
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user

### User Management

- `PATCH /users/me` - Update profile
- `PATCH /users/me/professional` - Update professional profile
- `GET /users/me` - Get current user profile

### Service Catalog

- `GET /catalog/categories` - Get service categories
- `GET /catalog/search` - Search services with filters
- `GET /catalog/suggestions` - Get search suggestions
- `GET /catalog/popular` - Get popular categories

### Professional Services

- `POST /catalog/pro/services` - Create service
- `GET /catalog/pro/services` - Get professional's services
- `PATCH /catalog/pro/services/:id` - Update service
- `DELETE /catalog/pro/services/:id` - Delete service

### Admin Operations

- `GET /admin/users` - Get all users
- `PATCH /admin/users/:id/role` - Update user role
- `GET /admin/stats` - Get user statistics
- `POST /admin/catalog/categories` - Create category
- `GET /admin/catalog/categories` - Get all categories
- `PATCH /admin/catalog/categories/:id` - Update category
- `DELETE /admin/catalog/categories/:id` - Delete category

## 🔍 Search Features

### Geospatial Search

- Haversine formula for distance calculation
- Radius-based service filtering
- Location-based professional discovery

### Advanced Filters

- Price range (min/max)
- Service type (HOURLY/FIXED)
- Category filtering
- Rating filters
- Availability windows
- Text search across names and descriptions

## 🧪 Testing

### Backend Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Frontend Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e
```

## 📊 Database Seeding

The seed script creates:

- 3 user roles (ADMIN, CUSTOMER, PROFESSIONAL)
- 30+ service categories with hierarchical structure
- 10 service tags
- Sample users (admin, customer, professional)
- Sample professional profile with services

```bash
# Run seed script
npx prisma db seed
```

## 🚀 Deployment

### Backend Deployment

1. Set production environment variables
2. Build the application: `npm run build`
3. Run migrations: `npx prisma migrate deploy`
4. Start the application: `npm run start:prod`

### Frontend Deployment

1. Set production environment variables
2. Build the application: `npm run build`
3. Deploy the `dist` folder to your hosting service

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

## 📚 API Documentation

Once the backend is running, visit:

- **Swagger UI**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/health

## 🔧 Development Scripts

### Backend

```bash
npm run start          # Start production server
npm run start:dev      # Start development server
npm run start:debug    # Start with debugging
npm run build          # Build for production
npm run test           # Run unit tests
npm run test:e2e       # Run E2E tests
npm run test:cov       # Run tests with coverage
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
```

### Frontend

```bash
npm run dev            # Start development server
npm run build          # Build for production
npm run preview        # Preview production build
npm run test           # Run unit tests
npm run test:e2e       # Run E2E tests
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@serviceprovider.com or create an issue in the repository.

## 🗺️ Roadmap

- [ ] Booking system implementation
- [ ] Payment integration
- [ ] Review and rating system
- [ ] Real-time notifications
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] AI-powered service recommendations
# service-provider-backend

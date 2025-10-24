# Authentication & User Management System

This document describes the complete authentication and user management system implemented in the Service Provider backend.

## 🏗️ Architecture Overview

### Core Components

- **Authentication Module**: JWT + OTP authentication
- **User Module**: Profile management
- **Admin Module**: User administration
- **File Upload Module**: NID photo and avatar uploads
- **RBAC System**: Role-based access control

### Database Models

- `User`: User accounts with extended profile fields
- `Role`: System roles (ADMIN, CUSTOMER, PROFESSIONAL)
- `Permission`: Granular permissions
- `UserRole`: Many-to-many user-role relationships
- `Session`: JWT session management
- `OTP`: One-time password storage
- `ProfessionalProfile`: Professional-specific data
- `AuditLog`: System audit trail

## 🔐 Authentication Flow

### 1. Registration

```typescript
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "fullName": "John Doe",
  "password": "password123", // Optional for OTP-only auth
  "userType": "CUSTOMER", // or "PROFESSIONAL"
  "phone": "+8801712345678", // Optional
  "nidNumber": "1234567890123", // Optional
  "locationLat": 23.8103, // Optional
  "locationLng": 90.4125, // Optional
  "preferredLanguages": ["en", "bn"] // Optional
}
```

### 2. Login Options

#### Password Login

```typescript
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password123",
  "loginType": "PASSWORD"
}
```

#### OTP Login

```typescript
// Step 1: Send OTP
POST /api/v1/auth/otp/send
{
  "email": "user@example.com",
  "type": "login"
}

// Step 2: Login with OTP
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "otp": "123456",
  "loginType": "OTP"
}
```

### 3. Token Management

- **Access Token**: Short-lived (1 hour) JWT for API access
- **Refresh Token**: Long-lived (7 days) stored in httpOnly cookie
- **Token Refresh**: `POST /api/v1/auth/refresh`

## 👤 User Management

### Profile Management

```typescript
// Get current user
GET /api/v1/users/me

// Update profile
PATCH /api/v1/users/me
{
  "fullName": "Updated Name",
  "phone": "+8801712345678",
  "avatarUrl": "https://example.com/avatar.jpg",
  "locationLat": 23.8103,
  "locationLng": 90.4125,
  "preferredLanguages": ["en", "bn"]
}

// Update professional profile (PROFESSIONAL only)
PATCH /api/v1/users/me/professional
{
  "skills": ["Plumbing", "Electrical"],
  "categories": ["Home Repair", "Maintenance"],
  "hourlyRateBDT": 500.00,
  "fixedRates": [
    { "service": "House Cleaning", "rate": 2000 }
  ],
  "availability": [
    { "day": "Monday", "startTime": "09:00", "endTime": "17:00" }
  ],
  "bio": "Experienced professional...",
  "experience": 5
}
```

## 🔒 RBAC System

### Roles

- **ADMIN**: Full system access
- **CUSTOMER**: Service booking and basic features
- **PROFESSIONAL**: Service provision and advanced features

### Permissions

- `user.read`, `user.write`, `user.delete`
- `service.read`, `service.write`
- `booking.read`, `booking.write`
- `admin.access` (Admin-only operations)

### Usage

```typescript
// Protect routes with roles
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Get('admin/users')
async getUsers() { ... }
```

## 📁 File Upload

### Supported Files

- **NID Photos**: JPEG, PNG (max 5MB)
- **Avatars**: JPEG, PNG, WebP (max 5MB)

### Upload Endpoints

```typescript
// Upload NID photo
POST /api/v1/upload/nid-photo
Content-Type: multipart/form-data
Body: file (image file)

// Upload avatar
POST /api/v1/upload/avatar
Content-Type: multipart/form-data
Body: file (image file)
```

## 🛡️ Security Features

### Password Security

- Bcrypt hashing with 12 rounds
- Minimum 8 character length
- Optional passwords (OTP-only auth supported)

### OTP Security

- 6-digit numeric OTPs
- 5-minute expiration
- Rate limiting (5 requests per minute)
- Maximum 3 verification attempts
- Hashed storage in database

### Session Security

- JWT with short expiration
- Refresh tokens in httpOnly cookies
- Device fingerprinting
- IP address tracking
- Session invalidation on logout

### API Security

- Helmet for security headers
- CORS configuration
- Rate limiting on sensitive endpoints
- Request validation with class-validator
- Comprehensive error handling

## 🧪 Testing

### E2E Tests

```bash
# Run all e2e tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- auth.e2e-spec.ts
```

### Test Coverage

- User registration flows
- Authentication scenarios
- Profile management
- Admin operations
- Error handling

## 📚 API Documentation

### Swagger UI

- Available at: `http://localhost:3000/docs`
- Interactive API testing
- Bearer token authentication
- Cookie authentication support

### Postman Collection

- File: `postman/auth_and_user.json`
- Pre-configured requests
- Environment variables
- Test scenarios included

## 🚀 Getting Started

### 1. Database Setup

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Run migrations and seed
npm run prisma:migrate
npm run prisma:seed
```

### 2. Environment Configuration

```env
# Required environment variables
DATABASE_URL="postgresql://username:password@localhost:5432/service_provider_db"
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"
CSRF_SECRET="your-csrf-secret-here"
```

### 3. Start Development Server

```bash
npm run start:dev
```

## 📊 Monitoring & Logging

### Audit Logging

- All user actions logged
- Request tracing with requestId
- IP address and user agent tracking
- Structured logging with Pino

### Health Checks

- Database connectivity
- Service availability
- Endpoint: `GET /api/v1/health`

## 🔄 Future Enhancements

### Planned Features

- [ ] Email verification system
- [ ] SMS integration for OTP
- [ ] Social login (Google, Facebook)
- [ ] Two-factor authentication
- [ ] Password reset flow
- [ ] Account deactivation
- [ ] Advanced audit logging
- [ ] Real-time notifications

### Scalability Considerations

- Redis for session storage
- Cloud storage for file uploads
- Microservice architecture
- API rate limiting
- Database sharding

---

**Note**: This system is designed for production use with proper security measures. Always use strong secrets and configure appropriate rate limits for your use case.
































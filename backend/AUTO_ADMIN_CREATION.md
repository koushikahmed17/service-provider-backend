# Automatic Admin User Creation

## Overview

The backend automatically creates a default admin user when the application starts. This feature ensures that you always have access to the system with admin privileges, even on a fresh installation.

## How It Works

When the NestJS application initializes, the `BootstrapService` runs automatically and performs the following checks:

1. **Check ADMIN Role**: Verifies if the `ADMIN` role exists in the database

   - If not present, creates the role

2. **Check Admin User**: Looks for a user with email `admin@example.com`
   - If user exists and has ADMIN role → No action needed
   - If user exists but lacks ADMIN role → Adds ADMIN role
   - If user doesn't exist → Creates new admin user

## Default Admin Credentials

```
Email:    admin@example.com
Password: admin123
```

⚠️ **IMPORTANT**: Change the default password after your first login!

## Implementation Details

### Location

- Service: `backend/src/core/bootstrap.service.ts`
- Module: `backend/src/core/prisma.module.ts`

### Features

✅ **Idempotent**: Safe to run multiple times - won't create duplicates
✅ **Non-blocking**: Errors are logged but don't crash the application
✅ **Automatic**: Runs on every application startup
✅ **Secure**: Password is bcrypt hashed (10 rounds)
✅ **Logged**: All actions are logged to console

### Console Output

On successful admin creation:

```
Checking for admin user...
Creating ADMIN role...
✅ ADMIN role created successfully
Creating default admin user...
✅ Default admin user created successfully!
📧 Email: admin@example.com
🔑 Password: admin123
⚠️  Please change the default password after first login!
```

On existing admin:

```
Checking for admin user...
✅ Admin user already exists: admin@example.com
```

## Security Considerations

### Password Security

- Default password is hashed using bcrypt with 10 salt rounds
- Never stored in plain text
- Should be changed immediately after first login

### Access Control

- Admin user is created with `isEmailVerified: true`
- Admin role grants full system access
- All admin actions are logged in audit trail

## Troubleshooting

### Admin User Not Created

If the admin user is not created, check:

1. **Database Connection**: Ensure PostgreSQL is running and accessible
2. **Environment Variables**: Verify `DATABASE_URL` is correct
3. **Console Logs**: Check application logs for error messages
4. **Database Permissions**: Ensure the database user has INSERT permissions

### Cannot Login

If you cannot login with default credentials:

1. **Verify Email**: Make sure you're using `admin@example.com`
2. **Check Password**: Ensure you're typing `admin123` correctly
3. **Database Check**: Query the database to verify user exists:
   ```sql
   SELECT * FROM users WHERE email = 'admin@example.com';
   ```
4. **Role Check**: Verify admin has ADMIN role:
   ```sql
   SELECT u.email, r.name
   FROM users u
   JOIN user_roles ur ON u.id = ur."userId"
   JOIN roles r ON ur."roleId" = r.id
   WHERE u.email = 'admin@example.com';
   ```

## Customization

To change the default admin credentials, edit `backend/src/core/bootstrap.service.ts`:

```typescript
// Change email
const adminUser = await this.prisma.user.create({
  data: {
    email: "your-custom-email@example.com", // Change this
    // ...
  },
});

// Change password
const hashedPassword = await bcrypt.hash("YourNewPassword123", 10); // Change this
```

## Disabling Auto-Creation

If you want to disable automatic admin creation (not recommended):

1. Comment out the `BootstrapService` provider in `backend/src/core/prisma.module.ts`:

```typescript
@Global()
@Module({
  providers: [
    PrismaService,
    // BootstrapService  // Comment this out
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
```

## Manual Admin Creation

If you prefer to create admin manually using the database seed:

```bash
cd backend
npm run prisma:seed
```

This will also create:

- Sample customer user: `customer@example.com` / `customer123`
- Sample professional user: `professional@example.com` / `professional123`
- Service categories, tags, and sample bookings

## Testing

To verify the admin creation feature:

1. Drop the database (or delete admin user)
2. Restart the backend server
3. Check console logs for admin creation messages
4. Try logging in with default credentials
5. Verify admin can access admin-only endpoints

## Related Documentation

- [Authentication & Authorization](./AUTH_README.md)
- [Database Schema](../DATABASE_STRUCTURE.md)
- [Deployment Guide](./DEPLOYMENT_README.md)
- [Software Requirements Specification](../SRS.txt) - See FR-BOOT-001

## API Testing

After admin is created, test admin access:

```bash
# Login as admin
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrPhone": "admin@example.com",
    "password": "admin123",
    "loginType": "PASSWORD"
  }'

# Use the returned access token to test admin endpoints
curl -X GET http://localhost:3000/api/v1/admin/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Change Log

| Version | Date     | Changes                                       |
| ------- | -------- | --------------------------------------------- |
| 1.0.0   | Oct 2025 | Initial implementation of auto admin creation |

---

**Note**: This feature is designed for development and initial deployment. In production, consider implementing a more secure admin onboarding process with email verification and strong password requirements.


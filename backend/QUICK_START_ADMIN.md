# Quick Start: Admin Access

## 🎯 Automatic Admin Creation

Your backend now automatically creates a default admin user every time it starts!

## 🔐 Default Credentials

```
📧 Email:    admin@example.com
🔑 Password: admin123
```

## 🚀 How to Use

### 1. Start Your Backend

```bash
cd backend
npm run start:dev
```

You'll see this in the console:

```
Checking for admin user...
✅ Default admin user created successfully!
📧 Email: admin@example.com
🔑 Password: admin123
⚠️  Please change the default password after first login!

═══════════════════════════════════════════════════════════════
🚀 Application is running on: http://localhost:3000/api/v1
📚 Swagger documentation: http://localhost:3000/docs
🔧 Auth endpoint: http://localhost:3000/api/v1/auth/login
═══════════════════════════════════════════════════════════════
```

### 2. Login as Admin

**Using cURL:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrPhone": "admin@example.com",
    "password": "admin123",
    "loginType": "PASSWORD"
  }'
```

**Using Postman/Frontend:**

- URL: `POST http://localhost:3000/api/v1/auth/login`
- Body:
  ```json
  {
    "emailOrPhone": "admin@example.com",
    "password": "admin123",
    "loginType": "PASSWORD"
  }
  ```

### 3. Access Admin Endpoints

Use the access token from login response:

```bash
curl -X GET http://localhost:3000/api/v1/admin/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## ✅ What Gets Created

1. **ADMIN Role** (if not exists)
2. **Admin User** with:
   - Email: `admin@example.com`
   - Password: `admin123` (bcrypt hashed)
   - Full Name: "System Administrator"
   - Email Verified: ✅
   - Active Status: ✅
   - Admin Role Assigned: ✅

## 🔄 Idempotent Design

- ✅ Safe to restart server multiple times
- ✅ Won't create duplicate admins
- ✅ Automatically assigns ADMIN role if missing
- ✅ Gracefully handles errors

## 📝 Where to Find Admin Features

### Available Admin Endpoints:

**User Management:**

- `GET /api/v1/admin/users` - List all users
- `PATCH /api/v1/admin/users/:id/role` - Update user role
- `PATCH /api/v1/admin/users/:id/ban` - Ban user
- `PATCH /api/v1/admin/users/:id/unban` - Unban user
- `PATCH /api/v1/admin/users/:id/verify-nid` - Verify NID
- `GET /api/v1/admin/stats` - Get user statistics

**Professional Management:**

- `GET /api/v1/admin/professionals` - List professionals
- `GET /api/v1/admin/professionals/:id` - Get professional details
- `POST /api/v1/admin/professionals/:id/approve` - Approve professional
- `POST /api/v1/admin/professionals/:id/reject` - Reject professional
- `POST /api/v1/admin/professionals/:id/suspend` - Suspend professional

**Category Management:**

- `POST /api/v1/admin/catalog/categories` - Create category
- `GET /api/v1/admin/catalog/categories` - List categories
- `PATCH /api/v1/admin/catalog/categories/:id` - Update category
- `DELETE /api/v1/admin/catalog/categories/:id` - Delete category

**Booking Management:**

- `POST /api/v1/admin/bookings/:id/accept` - Accept booking
- `POST /api/v1/admin/bookings/:id/reject` - Reject booking
- `POST /api/v1/admin/bookings/:id/complete` - Complete booking
- `POST /api/v1/admin/bookings/:id/cancel` - Cancel booking

**Refund Management:**

- `GET /api/v1/admin/refunds` - List all refunds
- `GET /api/v1/admin/refunds/stats` - Refund statistics
- `POST /api/v1/admin/refunds/:id/process` - Process refund
- `POST /api/v1/admin/refunds/:id/complete` - Complete refund

**Dispute Management:**

- `GET /api/v1/admin/disputes` - List disputes
- `POST /api/v1/admin/disputes/:id/resolve` - Resolve dispute

**Commission Settings:**

- `GET /api/v1/admin/config/commission` - Get commission settings
- `POST /api/v1/admin/config/commission` - Create commission setting
- `PATCH /api/v1/admin/config/commission` - Update commission

**Analytics:**

- `GET /api/v1/admin/analytics/summary` - Analytics summary
- `GET /api/v1/analytics/ad/overview` - Admin dashboard

**Review Moderation:**

- `GET /api/v1/admin/moderation/reviews/flagged` - Flagged reviews
- `PATCH /api/v1/admin/moderation/reviews/:id/moderate` - Moderate review

## 🧪 Testing

### Test Admin Creation

```bash
# 1. Stop backend
# 2. Delete admin user from database (optional)
psql -d service_provider_db -c "DELETE FROM users WHERE email = 'admin@example.com';"

# 3. Start backend again
npm run start:dev

# 4. Check console logs - should show admin creation
# 5. Try logging in
```

### Verify Admin Access

```bash
# Login
TOKEN=$(curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"admin@example.com","password":"admin123","loginType":"PASSWORD"}' \
  | jq -r '.accessToken')

# Test admin endpoint
curl -X GET http://localhost:3000/api/v1/admin/users \
  -H "Authorization: Bearer $TOKEN"
```

## 📚 Documentation

- **Detailed Guide**: [AUTO_ADMIN_CREATION.md](./AUTO_ADMIN_CREATION.md)
- **API Documentation**: http://localhost:3000/docs
- **Full SRS**: [SRS.txt](../SRS.txt) - Section FR-BOOT-001
- **Auth Guide**: [AUTH_README.md](./AUTH_README.md)

## ⚠️ Important Notes

1. **Change Default Password**: Always change `admin123` after first login
2. **Production Security**: Use strong passwords in production
3. **Environment Variables**: Ensure `DATABASE_URL` is correctly configured
4. **Database Access**: Admin user needs the database to be running

## 🐛 Troubleshooting

**Admin not created?**

- Check database connection
- Look for errors in console logs
- Verify `DATABASE_URL` in `.env`

**Can't login?**

- Verify email: `admin@example.com`
- Verify password: `admin123`
- Check if user exists in database
- Try password reset (future feature)

**Permission denied?**

- Verify ADMIN role is assigned
- Check JWT token is valid
- Review role guards in controllers

## 🎉 You're Ready!

You now have automatic admin access without needing a separate admin registration page. Just start your backend and login with the default credentials!

---

Need help? Check the [full documentation](./AUTO_ADMIN_CREATION.md) or create an issue.


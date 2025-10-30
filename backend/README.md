# Smartz Service Provider Backend

A production-ready NestJS backend for the Smartz service provider platform. It includes authentication, service catalog, booking, payments/refunds, notifications, analytics, and admin tooling. Built with Prisma + PostgreSQL, JWT auth, modular architecture, and thorough e2e/unit tests.

## Project Overview

- Framework: NestJS (TypeScript)
- ORM/DB: Prisma with PostgreSQL
- Auth: JWT with role-based access control
- Modules: Admin, Auth, User, Service Catalog, Booking, Payment/Refund, Review, Location, Notification, Analytics, Health
- Infrastructure: Config via environment variables, structured logging, request validation, global exception filters
- Testing: Jest unit and e2e suites
- API Collections: Postman collections in `postman/`

## Key Features

- Authentication and authorization with roles and guards
- Service catalog management with admin endpoints
- Booking flow with status management and analytics
- Payments and refunds with pluggable gateway interface
- Notifications (email/SMS/push ready) with templating hooks
- Reviews and ratings for services
- Location utilities for service coverage
- File uploads (e.g., NID uploads) with storage-ready structure
- Admin dashboards and analytics endpoints
- Robust logging, validation, interceptors, and global error handling

## Installation & Setup

1. Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Git

2. Install dependencies

```bash
npm install
```

3. Environment variables

- Copy `env.example` to `.env` and fill values:
  - Database URL: `DATABASE_URL`
  - JWT secrets: `JWT_ACCESS_TOKEN_SECRET`, `JWT_REFRESH_TOKEN_SECRET`
  - App config: `PORT`, `NODE_ENV`, etc.
- Helper: `node scripts/generate-secrets.js` can generate secure secrets.

4. Database setup

```bash
npx prisma migrate deploy
# or for local dev (creates DB schema based on migrations)
# npx prisma migrate dev

# optional: seed data if provided
npm run seed
```

5. Run the app

```bash
npm run start:dev   # development with watch
# or
npm run start:prod  # after building
```

6. Testing

```bash
npm run test        # unit tests
npm run test:e2e    # end-to-end tests
```

7. Postman collections

- Import collections from `postman/` to explore and test the APIs.

### Common npm scripts

- `start:dev`: Run in watch mode
- `build`: TypeScript build to `dist/`
- `start:prod`: Run compiled app
- `lint`: Lint the codebase
- `test`, `test:e2e`: Run tests

---

For deployment notes and quick start on Render or Docker, adapt from the environment values in `env.render.template`, `render.yaml`, and `docker-compose.yml`.

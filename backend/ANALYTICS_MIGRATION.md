# Analytics Module Migration to Dynamic System

## Overview

This migration transforms the analytics module from static, hard-coded metrics to a fully dynamic, database-driven system.

## Pre-Migration Checklist

- [ ] Backup your database
- [ ] Review the new schema in `prisma/schema.prisma`
- [ ] Ensure all dependencies are installed
- [ ] Stop the application server

## Migration Steps

### Step 1: Generate and Apply Prisma Migration

```bash
cd backend

# Generate migration
npx prisma migrate dev --name add_dynamic_analytics_tables

# Or if already generated, just apply
npx prisma migrate deploy
```

This will create three new tables:

- `analytics_dashboards`
- `analytics_widgets`
- `analytics_metrics`

### Step 2: Seed Default Analytics Configuration

```bash
npm run db:seed
```

This will create:

- 12 predefined metrics (revenue, bookings, users, ratings)
- 3 role-based dashboards (Admin, Professional, Customer)
- 22 pre-configured widgets across all dashboards

### Step 3: Verify Migration

Check that the tables were created:

```sql
-- Connect to your PostgreSQL database
SELECT * FROM analytics_dashboards;
SELECT * FROM analytics_metrics;
SELECT * FROM analytics_widgets;
```

You should see:

- 3 dashboards (one per role)
- 12 metrics
- 22 widgets

### Step 4: Update Frontend Environment

No changes needed! The frontend automatically uses the new dynamic endpoints.

### Step 5: Test the New System

1. **Start the backend:**

   ```bash
   npm run start:dev
   ```

2. **Test API endpoints:**

   ```bash
   # Get dashboard config (requires authentication)
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/v1/analytics/dashboard/config

   # Get dashboard data
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/v1/analytics/dashboard?period=30d
   ```

3. **Test in browser:**
   - Login as Admin: `admin@example.com / admin123`
   - Navigate to Analytics page
   - Verify widgets are rendering dynamically

## Rollback Plan

If you need to rollback:

```bash
# Rollback the last migration
npx prisma migrate resolve --rolled-back [MIGRATION_NAME]

# Or manually drop tables
npx prisma db execute --stdin <<SQL
DROP TABLE IF EXISTS analytics_widgets;
DROP TABLE IF EXISTS analytics_metrics;
DROP TABLE IF EXISTS analytics_dashboards;
SQL
```

## What Changed

### Backend Changes

1. **New Service:** `dynamic-analytics.service.ts`

   - Fetches configuration from database
   - Generates queries dynamically
   - Applies filters and calculations

2. **New Controller Endpoints:**

   - `GET /analytics/dashboard/config` - Get dashboard structure
   - `GET /analytics/dashboard` - Get dashboard data

3. **Database Schema:**
   - Added 3 new models to Prisma schema
   - All analytics configurations now stored in DB

### Frontend Changes

1. **New Components:**

   - `DynamicAnalyticsPage.tsx` - Universal analytics renderer
   - `AnalyticsConfigPage.tsx` - Admin configuration UI

2. **Updated API:**

   - Added hooks: `useGetDashboardConfigQuery`, `useGetDashboardDataQuery`

3. **Simplified Pages:**
   - Professional and Customer analytics pages now use same dynamic component

## Configuration Examples

### Add a New KPI Widget

```sql
-- First, ensure you have a metric
INSERT INTO analytics_metrics (id, name, slug, category, data_source, aggregation, field, format, icon, color, is_active)
VALUES (
  gen_random_uuid(),
  'Active Professionals',
  'active-professionals',
  'users',
  'users',
  'count',
  'id',
  'number',
  'UserCheck',
  '#8b5cf6',
  true
);

-- Then add a widget using that metric
INSERT INTO analytics_widgets (
  id,
  dashboard_id,
  metric_id,
  name,
  type,
  position,
  config,
  visualization,
  is_active
)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM analytics_dashboards WHERE slug = 'admin-overview'),
  (SELECT id FROM analytics_metrics WHERE slug = 'active-professionals'),
  'Active Professionals',
  'kpi',
  '{"x": 0, "y": 0, "w": 3, "h": 2}'::jsonb,
  '{"showTrend": true, "showGrowth": true}'::jsonb,
  '{"icon": "UserCheck", "color": "#8b5cf6"}'::jsonb,
  true
);
```

### Modify an Existing Metric

```sql
-- Change the aggregation or filters of a metric
UPDATE analytics_metrics
SET
  aggregation = 'avg',
  filters = '{"status": "COMPLETED", "rating": {"gte": 4}}'::jsonb
WHERE slug = 'avg-rating';
```

### Disable a Widget

```sql
UPDATE analytics_widgets
SET is_active = false
WHERE name = 'Geographic Distribution';
```

## Performance Considerations

The dynamic system adds minimal overhead:

- Dashboard config is fetched once on page load
- Widget data is fetched in parallel using Promise.all
- Queries use Prisma's optimized query builder
- Consider adding database indexes on commonly filtered fields

### Recommended Indexes

```sql
-- Add indexes for better query performance
CREATE INDEX idx_bookings_created_at ON bookings(created_at);
CREATE INDEX idx_bookings_professional_id ON bookings(professional_id);
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_category_id ON bookings(category_id);
CREATE INDEX idx_reviews_professional_id ON reviews(professional_id);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);
```

## Troubleshooting

### Migration fails with "relation already exists"

```bash
# Check if tables exist
npx prisma db execute --stdin <<SQL
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'analytics%';
SQL

# If they exist, mark migration as applied
npx prisma migrate resolve --applied [MIGRATION_NAME]
```

### Seed fails with "role not found"

Ensure roles are seeded first. The seed script creates roles before analytics config.

### Widgets not showing data

Check:

1. User has proper role assigned
2. Dashboard exists for that role
3. Widgets are set to `is_active = true`
4. Metric references are correct

## Post-Migration Tasks

- [ ] Test all dashboards (Admin, Professional, Customer)
- [ ] Verify filters work correctly
- [ ] Check performance with real data
- [ ] Update documentation
- [ ] Train admin users on configuration UI
- [ ] Set up monitoring for analytics endpoints

## Support

If you encounter issues:

1. Check application logs
2. Verify database connection
3. Review Prisma schema alignment: `npx prisma db pull`
4. Check the DYNAMIC_ANALYTICS_README.md for detailed usage

---

**Migration Version:** 1.0.0  
**Date:** October 2025  
**Status:** Ready for Production















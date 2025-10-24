# Backend Deployment to Render.com

## 📁 Files Created for Deployment

This folder now contains all the necessary files to deploy your backend to Render.com:

### Configuration Files

- **`render.yaml`** - Render Blueprint configuration (automated deployment)
- **`.gitignore`** - Git ignore file (prevents sensitive files from being committed)
- **`env.render.template`** - Template for environment variables

### Documentation

- **`RENDER_DEPLOYMENT_GUIDE.md`** - Complete step-by-step deployment guide (MAIN GUIDE)
- **`RENDER_QUICK_START.md`** - Quick 5-step deployment checklist
- **`DEPLOYMENT_README.md`** - This file (overview)

### Scripts

- **`scripts/generate-secrets.js`** - Helper script to generate secure secrets

---

## 🚀 Getting Started

### Option 1: Quick Start (5 Minutes)

Follow the quick checklist: **[RENDER_QUICK_START.md](RENDER_QUICK_START.md)**

### Option 2: Detailed Guide (Recommended)

Follow the comprehensive guide: **[RENDER_DEPLOYMENT_GUIDE.md](../RENDER_DEPLOYMENT_GUIDE.md)**

---

## 📋 Pre-Deployment Checklist

Before deploying, make sure you have:

- [ ] Render.com account created
- [ ] GitHub account ready
- [ ] Backend code tested locally
- [ ] Database migrations tested
- [ ] All environment variables identified

---

## 🔑 Generate Secrets

Before deployment, generate secure secrets for JWT and CSRF:

```bash
# Run this command
node scripts/generate-secrets.js
```

This will output two secrets that you'll need to add to Render environment variables.

---

## 🌐 Deployment Process Overview

1. **Push code to GitHub**

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Create PostgreSQL database on Render**

   - Log in to Render dashboard
   - Create new PostgreSQL database
   - Copy the Internal Database URL

3. **Create Web Service on Render**

   - Connect GitHub repository
   - Configure build and start commands
   - Add environment variables

4. **Wait for deployment**

   - Monitor logs
   - Verify migrations ran successfully
   - Test API endpoints

5. **Post-deployment**
   - Update CORS settings
   - Test with frontend
   - Monitor performance

---

## 📊 Required Environment Variables

| Variable         | Description                  | Example                          |
| ---------------- | ---------------------------- | -------------------------------- |
| `DATABASE_URL`   | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `JWT_SECRET`     | Secret for JWT tokens        | Generated 64-char string         |
| `JWT_EXPIRES_IN` | Token expiration             | `7d`                             |
| `CORS_ORIGIN`    | Allowed frontend URL         | `https://frontend.com`           |
| `PORT`           | Application port             | `10000`                          |
| `NODE_ENV`       | Environment                  | `production`                     |

See **`env.render.template`** for complete list.

---

## 🔧 Build & Start Commands

### Build Command

```bash
npm install && npx prisma generate && npm run build
```

This command:

1. Installs all dependencies
2. Generates Prisma client
3. Builds the TypeScript application

### Start Command

```bash
npx prisma migrate deploy && npm run start:prod
```

This command:

1. Runs database migrations
2. Starts the production server

---

## 🏗️ Architecture on Render

```
┌─────────────────────────────────────┐
│         GitHub Repository           │
│    (Source Code + Migrations)       │
└─────────────┬───────────────────────┘
              │ Auto-deploy on push
              ▼
┌─────────────────────────────────────┐
│      Render Web Service             │
│  ┌───────────────────────────────┐  │
│  │   NestJS Backend (Node.js)    │  │
│  │   - REST API                  │  │
│  │   - JWT Auth                  │  │
│  │   - Prisma ORM                │  │
│  └───────────┬───────────────────┘  │
│              │                       │
│              │ DATABASE_URL          │
│              ▼                       │
│  ┌───────────────────────────────┐  │
│  │   PostgreSQL Database         │  │
│  │   - Internal Connection       │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
              │
              │ HTTPS
              ▼
      Frontend Application
```

---

## 🔍 Health Check

Your backend includes a health check endpoint:

**URL**: `https://your-service.onrender.com/api/v1/health`

This endpoint:

- ✅ Verifies server is running
- ✅ Checks database connectivity
- ✅ Used by Render for monitoring

---

## 📚 API Documentation

Once deployed, Swagger documentation will be available at:

**URL**: `https://your-service.onrender.com/docs`

This provides:

- Interactive API testing
- Endpoint documentation
- Request/response schemas
- Authentication testing

---

## 💡 Tips for Success

### 1. Use Internal Database URL

Always use the **Internal Database URL** (not External) for faster and free communication between services on Render.

### 2. Monitor Logs

Keep the Logs tab open during first deployment to catch any issues immediately.

### 3. Test Before Production

Test all endpoints with Postman or curl before connecting your frontend.

### 4. Secure Your Secrets

Never commit `.env` files to Git. Always use Render's environment variables.

### 5. Free Tier Limitations

- Services sleep after 15 minutes of inactivity
- Wake up time: ~30 seconds
- Database free for 90 days
- Consider paid plans for production

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot connect to database"

**Solution**: Verify you're using the Internal Database URL

### Issue: "Build failed - prisma generate"

**Solution**: Ensure `prisma/schema.prisma` is committed to Git

### Issue: "Migrations failed"

**Solution**: Check migration files are in Git and valid

### Issue: "CORS error from frontend"

**Solution**: Update `CORS_ORIGIN` with exact frontend URL (including `https://`)

### Issue: "Service keeps restarting"

**Solution**: Check logs for errors, verify all env variables are set

---

## 📈 Monitoring & Maintenance

### View Logs

```
Render Dashboard → Your Service → Logs tab
```

### View Metrics

```
Render Dashboard → Your Service → Metrics tab
```

### Access Database

```
Render Dashboard → Your Database → Info tab
```

### Run Commands

```
Render Dashboard → Your Service → Shell tab
```

Useful commands in Shell:

```bash
# Run migrations
npx prisma migrate deploy

# Seed database
npx prisma db seed

# Check Prisma status
npx prisma migrate status

# Open Prisma Studio
npx prisma studio
```

---

## 🔄 Updating Your Deployment

### Automatic Updates (Recommended)

If auto-deploy is enabled:

```bash
git add .
git commit -m "Update backend"
git push origin main
```

Render will automatically detect and redeploy.

### Manual Deployment

1. Go to service dashboard
2. Click "Manual Deploy"
3. Select "Deploy latest commit"

---

## 💰 Cost Estimate

### Free Tier

- **Web Service**: 750 hours/month (free)
- **PostgreSQL**: Free for 90 days, then $7/month
- **SSL**: Free
- **Custom domain**: Free

### Production (Recommended)

- **Web Service Starter**: $7/month
- **PostgreSQL**: $7/month
- **Total**: ~$14/month

---

## ✅ Deployment Checklist

- [ ] Backend tested locally
- [ ] Prisma migrations tested
- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] Render account created
- [ ] PostgreSQL database created on Render
- [ ] Database URL copied
- [ ] Secrets generated (`node scripts/generate-secrets.js`)
- [ ] Web service created on Render
- [ ] All environment variables added
- [ ] Build command configured
- [ ] Start command configured
- [ ] Auto-deploy enabled
- [ ] First deployment successful
- [ ] Health check passing
- [ ] API endpoints tested
- [ ] Swagger docs accessible
- [ ] Database seeded (if needed)
- [ ] CORS configured for frontend
- [ ] Frontend connected and tested

---

## 🆘 Need Help?

1. **Check the guides**:

   - [RENDER_QUICK_START.md](RENDER_QUICK_START.md)
   - [RENDER_DEPLOYMENT_GUIDE.md](../RENDER_DEPLOYMENT_GUIDE.md)

2. **Review Render documentation**:

   - [Render Docs](https://render.com/docs)
   - [Deploy NestJS](https://render.com/docs/deploy-nestjs)

3. **Community support**:

   - [Render Community Forum](https://community.render.com/)

4. **Debug**:
   - Check Render logs for errors
   - Verify all environment variables
   - Test database connectivity
   - Review CORS settings

---

## 🎉 Success Indicators

Your deployment is successful when:

✅ Build completes without errors  
✅ Migrations run successfully  
✅ Server starts and stays running  
✅ Health check returns 200 OK  
✅ API endpoints respond correctly  
✅ Swagger docs load properly  
✅ Database queries work  
✅ Frontend can connect

---

## 📝 Next Steps After Deployment

1. **Update Frontend**

   ```env
   VITE_API_URL=https://your-backend.onrender.com/api/v1
   ```

2. **Configure CORS**

   - Update `CORS_ORIGIN` environment variable
   - Set to your frontend URL

3. **Test Everything**

   - Register a user
   - Login
   - Test all major features
   - Check file uploads

4. **Monitor Performance**

   - Watch response times
   - Check error rates
   - Monitor database performance

5. **Set Up Backups** (Paid plans)

   - Enable automatic backups
   - Test restore process

6. **Consider Upgrades**
   - Upgrade to paid plan for 24/7 uptime
   - Add custom domain
   - Enable additional monitoring

---

## 🔗 Useful Links

- **Your API**: `https://your-service.onrender.com/api/v1`
- **Swagger Docs**: `https://your-service.onrender.com/docs`
- **Health Check**: `https://your-service.onrender.com/api/v1/health`
- **Render Dashboard**: https://dashboard.render.com

---

**Ready to deploy?** Start with [RENDER_QUICK_START.md](RENDER_QUICK_START.md)! 🚀





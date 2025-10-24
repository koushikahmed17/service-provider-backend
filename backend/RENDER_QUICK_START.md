# Render.com Quick Start Guide

## 🚀 TL;DR - Deploy in 5 Steps

### 1. Push to GitHub

```bash
cd "C:\Users\koush\Smartz\service provider\backend"
git init
git add .
git commit -m "Deploy to Render"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. Create Database on Render

1. Go to https://dashboard.render.com
2. Click **New +** → **PostgreSQL**
3. Name: `service-provider-db`
4. Plan: **Free**
5. Click **Create Database**
6. **Copy the Internal Database URL** (starts with `postgresql://`)

### 3. Create Web Service

1. Click **New +** → **Web Service**
2. Connect your GitHub repository
3. Fill in:
   - **Name**: `service-provider-backend`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm run start:prod`

### 4. Add Environment Variables

Click **Add Environment Variable** and add these:

```
NODE_ENV=production
PORT=10000
API_PREFIX=api/v1
DATABASE_URL=<PASTE_YOUR_DATABASE_URL_FROM_STEP_2>
JWT_SECRET=<GENERATE_RANDOM_64_CHAR_STRING>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
RATE_LIMIT_TTL=60
RATE_LIMIT_LIMIT=100
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
BCRYPT_ROUNDS=12
LOG_LEVEL=info
CSRF_SECRET=<GENERATE_RANDOM_64_CHAR_STRING>
```

**Generate secrets:**
Open terminal and run:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run it twice for `JWT_SECRET` and `CSRF_SECRET`.

### 5. Deploy!

Click **Create Web Service** and wait ~5-10 minutes.

---

## ✅ Testing Your Deployment

Your API will be live at: `https://your-service-name.onrender.com`

Test it:

```bash
# Health check
curl https://your-service-name.onrender.com/api/v1/health

# Swagger docs (open in browser)
https://your-service-name.onrender.com/docs
```

---

## 🔧 Common Issues

### Issue: Build fails

**Fix**: Check logs, verify all dependencies are in `package.json`

### Issue: Database connection error

**Fix**: Make sure you used the **Internal Database URL**, not External

### Issue: CORS errors

**Fix**: Update `CORS_ORIGIN` to your exact frontend URL (with `https://`)

### Issue: Service sleeps (Free tier)

**Fix**: Normal behavior. Service wakes on first request (~30s). Upgrade to paid plan for 24/7.

---

## 📖 Full Documentation

For detailed instructions, see: [RENDER_DEPLOYMENT_GUIDE.md](../RENDER_DEPLOYMENT_GUIDE.md)

---

## 🎉 Next Steps

1. **Update CORS**: Change `CORS_ORIGIN` from `*` to your frontend URL
2. **Seed Database**: Run `npx prisma db seed` in Render Shell
3. **Connect Frontend**: Update frontend to use your Render API URL
4. **Monitor**: Check Logs and Metrics tabs regularly

---

**Need Help?** Check the full guide or visit [Render Community](https://community.render.com/)





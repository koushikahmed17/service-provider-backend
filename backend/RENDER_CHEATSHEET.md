# Render.com Deployment - Quick Reference Card

## 🎯 5-Minute Deploy

```bash
# 1. Generate secrets
node scripts/generate-secrets.js

# 2. Push to GitHub
git init && git add . && git commit -m "Deploy" && git push

# 3. On Render.com:
# - Create PostgreSQL database → Copy Internal URL
# - Create Web Service → Connect GitHub repo
# - Add environment variables (see below)
# - Deploy!
```

---

## ⚙️ Build Configuration

```bash
# Build Command:
npm install && npx prisma generate && npm run build

# Start Command:
npx prisma migrate deploy && npm run start:prod
```

---

## 🔑 Essential Environment Variables

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=<COPY_FROM_RENDER_DB_INTERNAL_URL>
JWT_SECRET=<GENERATED_SECRET>
CORS_ORIGIN=*
```

**Get full list**: See `env.render.template`

---

## 🔗 Test URLs (After Deploy)

```
Health:  https://YOUR-SERVICE.onrender.com/api/v1/health
Docs:    https://YOUR-SERVICE.onrender.com/docs
API:     https://YOUR-SERVICE.onrender.com/api/v1
```

---

## 🐛 Quick Fixes

| Problem     | Fix                                    |
| ----------- | -------------------------------------- |
| Build fails | Check logs for missing dependencies    |
| DB error    | Use **Internal** DB URL (not External) |
| CORS error  | Update CORS_ORIGIN with frontend URL   |
| 502 error   | Wait 30s (free tier waking up)         |

---

## 📚 Full Documentation

- **Quick**: `RENDER_QUICK_START.md`
- **Complete**: `../RENDER_DEPLOYMENT_GUIDE.md`
- **Overview**: `DEPLOYMENT_README.md`

---

## ✅ Success Check

```bash
curl https://YOUR-SERVICE.onrender.com/api/v1/health
# Should return: {"status":"ok", ...}
```

---

**Ready?** → Open `RENDER_QUICK_START.md` 🚀





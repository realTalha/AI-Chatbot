# 🚀 Complete Frontend Deployment Steps (Vercel)

## Step 1: Sign Up / Log In to Vercel

1. Go to **https://vercel.com**
2. Click **"Sign Up"** or **"Log In"**
3. Choose **"Continue with GitHub"** (recommended)
4. Authorize Vercel to access your GitHub account

---

## Step 2: Import Your Project

1. Once logged in, click **"Add New..."** → **"Project"**
2. Click **"Import Git Repository"**
3. Find and select your repository: **"AI-Chatbot"**
4. Click **"Import"**

---

## Step 3: Configure Project Settings

### A. Framework Preset:
- Vercel should auto-detect **"Next.js"** ✓

### B. Root Directory:
- Click **"Edit"** next to Root Directory
- Set it to: **`frontend`**
- This is CRITICAL - tells Vercel where your Next.js app is

### C. Build Settings (should auto-fill):
- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next` (auto-detected)
- **Install Command:** `npm install`

### D. Environment Variables:
Click **"Environment Variables"** section and add:

**Variable Name:** `NEXT_PUBLIC_API_URL`  
**Value:** `https://ai-chatbot-production-7d29.up.railway.app`

(This is your Railway backend URL)

---

## Step 4: Deploy!

1. Click the blue **"Deploy"** button
2. Wait for deployment (takes 2-3 minutes)
3. Watch the build logs - you'll see:
   - Installing dependencies...
   - Building Next.js app...
   - Deployment successful! ✓

---

## Step 5: Get Your Frontend URL

1. After successful deployment, Vercel shows your URL
2. It will look like: **`https://ai-chatbot-xyz.vercel.app`**
3. **Copy this URL** - you'll need it!

---

## Step 6: Update Railway Backend (IMPORTANT!)

Now your backend needs to allow requests from your new frontend URL:

### Go to Railway:
1. Open your Railway project
2. Click on your **backend service**
3. Go to **"Variables"** tab
4. Find **`APP_URL`** variable
5. Change it from: `http://localhost:3000`
6. To your Vercel URL: `https://ai-chatbot-xyz.vercel.app`
7. Railway will auto-redeploy (takes ~1 minute)

---

## Step 7: Test Your Deployed App! 🎉

1. Open your Vercel URL: `https://ai-chatbot-xyz.vercel.app`
2. Try to **Sign Up** / **Register** a new account
3. **Log In**
4. Start a **Chat** with the AI
5. Everything should work!

---

## 🔧 If You Get CORS Errors:

Make sure Railway's `APP_URL` matches your Vercel URL EXACTLY:
- ✅ Correct: `https://ai-chatbot-xyz.vercel.app`
- ❌ Wrong: `https://ai-chatbot-xyz.vercel.app/` (no trailing slash)
- ❌ Wrong: `http://ai-chatbot-xyz.vercel.app` (must be https)

---

## 📋 Quick Checklist:

- [ ] Logged into Vercel with GitHub
- [ ] Imported AI-Chatbot repository
- [ ] Set Root Directory to `frontend`
- [ ] Added environment variable: `NEXT_PUBLIC_API_URL=https://ai-chatbot-production-7d29.up.railway.app`
- [ ] Clicked Deploy
- [ ] Got my Vercel URL
- [ ] Updated Railway's `APP_URL` to my Vercel URL
- [ ] Tested signup, login, and chat

---

## 🎯 Your Deployment URLs:

**Backend (Railway):** https://ai-chatbot-production-7d29.up.railway.app
**Frontend (Vercel):** https://[your-app].vercel.app (you'll get this after deployment)

---

## ⚡ Future Updates:

After deployment, any time you push to GitHub `main` branch:
- Vercel will **automatically redeploy** your frontend
- Railway will **automatically redeploy** your backend

Just push your changes and both will update! 🚀

---

## 🆘 Need Help?

If something doesn't work:
1. Check Vercel deployment logs for errors
2. Check Railway logs for backend errors
3. Open browser console (F12) to see frontend errors
4. Make sure `APP_URL` in Railway matches your Vercel URL exactly

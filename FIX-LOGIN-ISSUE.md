# 🔧 Fix Login Issue - Session Cookies

## Problem:
Login shows loading, then returns to login screen instead of going to dashboard.

## Cause:
Session cookies aren't working because of HTTPS/cross-origin requirements between Vercel (frontend) and Railway (backend).

## Solution:
Add `NODE_ENV` environment variable to Railway.

---

## ⚡ Fix in Railway (Do This Now):

### Step 1: Go to Railway
1. Open https://railway.app
2. Click your **backend service**
3. Go to **"Variables"** tab

### Step 2: Add NODE_ENV Variable
4. Click **"+ New Variable"** or **"Add Variable"**
5. Enter:
   - **Name:** `NODE_ENV`
   - **Value:** `production`
6. Click **"Add"** or **"Save"**

### Step 3: Wait for Redeploy
- Railway will automatically redeploy (30-60 seconds)
- Wait for deployment to complete

---

## ✅ Test Again:

1. **Clear browser cookies:**
   - Press **Ctrl+Shift+Delete**
   - Select "Cookies and other site data"
   - Click "Clear data"

2. **Go to your app:** https://ai-chatbot-talha221105.vercel.app

3. **Try Login:**
   - Enter your credentials
   - Click Login
   - Should now go to the dashboard! ✓

---

## 🎯 Current Environment Variables in Railway:

Make sure you have ALL of these:

```
PORT=4000
SESSION_SECRET=<your-secret-here>
OPENROUTER_API_KEY=<your-api-key-here>
AI_MODEL=nvidia/nemotron-3.5-lightning:free
APP_URL=https://ai-chatbot-talha221105.vercel.app
DATABASE_URL=(automatically set by Railway)
NODE_ENV=production ← ADD THIS ONE!
```

---

## 🐛 Still Not Working?

### Check Browser Console:
1. Press **F12**
2. Go to **"Console"** tab
3. Look for cookie errors

### Check if Railway redeployed:
- Go to Railway → Backend → **"Deployments"** tab
- Latest deployment should say "Success" with recent timestamp

### Try in Incognito/Private Window:
- Sometimes cached cookies cause issues
- Open new incognito window: **Ctrl+Shift+N**
- Try logging in there

---

## 📋 What Changed in Code:

Updated `backend/src/index.ts` session configuration:
- ✅ Added `proxy: true` for Railway's proxy
- ✅ Set `secure: true` in production for HTTPS
- ✅ Changed `sameSite: "none"` in production for cross-origin cookies

---

## 🎉 After This Fix:

Your login should work perfectly:
✓ Login redirects to dashboard
✓ Session persists across page reloads
✓ Logout works correctly

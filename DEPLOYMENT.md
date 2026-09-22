# Investor Wars - Multiplayer Deployment Guide (Vercel & GitHub)

This guide walks you through exporting your project to **GitHub** and deploying it to **Vercel** with real-time multiplayer synchronization powered by Cloud Firestore.

---

## 1. Exporting & Pushing to GitHub

### Option A: From AI Studio (Direct Export)
1. In the top right navigation menu of AI Studio, open **Settings / Project Menu**.
2. Select **Export to GitHub** or **Download ZIP**.
3. If downloading ZIP:
   - Unzip the archive into a folder on your computer.
   - Initialize git and push to your GitHub repository:
     ```bash
     git init
     git add .
     git commit -m "Initial commit of Investor Wars"
     git branch -M main
     git remote add origin https://github.com/<your-username>/<your-repo-name>.git
     git push -u origin main
     ```

---

## 2. Deploying to Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** > **Project**.
3. Import the GitHub repository you just pushed.
4. **Build & Output Settings**:
   - **Framework Preset**: Vite (automatically detected from `vercel.json`).
   - **Root Directory**: `./` (default).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Environment Variables** (Optional, but recommended for production customization):
   Add these in Vercel's **Project Settings > Environment Variables**:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSyDdLO6HFKpBVLeOZcZcftKR1g23v1ZBzl4
   VITE_FIREBASE_AUTH_DOMAIN=bigmomma-investor-wars.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=bigmomma-investor-wars
   VITE_FIREBASE_STORAGE_BUCKET=bigmomma-investor-wars.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=665313671823
   VITE_FIREBASE_APP_ID=1:665313671823:web:34d97c37f49f013d2d0efa
   VITE_APP_ENV=production
   ```
6. Click **Deploy**. Vercel will build the project and output your live production URL (e.g. `https://investor-wars.vercel.app`).

---

## 3. Authorizing your Vercel Domain in Firebase

To ensure Google Sign-In and Firestore WebSocket/Long-Polling operate smoothly on your Vercel domain:
1. Open [Firebase Console](https://console.firebase.google.com/project/bigmomma-investor-wars/authentication/settings).
2. Go to **Authentication** > **Settings** tab > **Authorized domains**.
3. Click **Add domain**.
4. Add your Vercel domain (e.g., `investor-wars.vercel.app` or your custom domain).
5. Save.

---

## 4. Testing Multiplayer Real-Time Sync

Once deployed on Vercel:
1. **Open Two Browser Windows**:
   - Open Window 1: Sign in or launch a guest moniker (e.g. "TraderAlpha").
   - Open Window 2 (or an incognito window / mobile device): Sign in as "TraderBeta".
2. **Create / Join Match**:
   - In Window 1: Tap **Custom / Private Room** or **Quick Match**.
   - Copy the 4-digit room code (e.g. `BM-XXXX`) or join via the open lobby list.
   - In Window 2: Enter the room code or click **Join**.
3. **Verify Sync**:
   - Both players will appear in the lobby in real time.
   - When the host starts the match, both screens navigate to gameplay.
   - Dice rolls, property transactions, acquisitions, and auctions sync instantly across both windows via Cloud Firestore snapshots (`onSnapshot`).

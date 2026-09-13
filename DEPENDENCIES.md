# BUSCAMP — Dependencies, Setup & Deployment Guide

This guide provides exhaustive, step-by-step instructions for configuring, developing, deploying, and troubleshooting the **BUSCAMP** campus transit ticketing system.

---

## Table of Contents
- [Prerequisites](#prerequisites)
- [Local Setup (Step by Step)](#local-setup-step-by-step)
- [Where to Get Each Credential](#where-to-get-each-credential)
  - [Supabase](#supabase)
  - [Razorpay](#razorpay)
  - [QR Secret](#qr_secret)
  - [Frontend Origin](#frontend_origin)
- [How to Test Payments (Razorpay Test Mode)](#how-to-test-payments-razorpay-test-mode)
- [Deployment](#deployment)
  - [Frontend → Vercel](#frontend--vercel)
  - [Backend → Render](#backend--render)
  - [After Deployment — Update These](#after-deployment--update-these)
- [Troubleshooting](#troubleshooting)
- [Going Live (Swapping to Live Razorpay Keys)](#going-live-swapping-to-live-razorpay-keys)

---

## Prerequisites

Before starting, ensure your local workstation has the following installed and configured:

- **Node.js 18+**: Node.js runtime version 18.0.0 or higher is required (LTS recommended).
  ```bash
  node --version
  # Output should be v18.x.x, v20.x.x, or higher
  ```
- **npm 9+ or yarn 1.22+**: Package manager for dependency resolution.
  ```bash
  npm --version
  # Output should be 9.x.x or higher
  ```
- **git**: Distributed version control system.
  ```bash
  git --version
  ```
- **A Supabase Account**: Free tier works perfectly. Sign up at [supabase.com](https://supabase.com).
- **A Razorpay Account with Test Mode Enabled**: Sign up at [razorpay.com](https://razorpay.com). No commercial business verification or bank account activation is required for Test Mode.

---

## Local Setup (Step by Step)

Follow these numbered steps in sequence to bring up the full stack locally:

### 1. Clone the repository
```bash
git clone https://github.com/iiitdmj/buscamp.git
cd buscamp
```

### 2. Install backend dependencies
Navigate to the backend directory and install all required Node.js packages:
```bash
cd backend && npm install
```

### 3. Install frontend dependencies
Navigate to the frontend directory and install the React/Vite dependencies:
```bash
cd ../frontend && npm install
```

### 4. Create environment configuration files
Copy the sample environment variable templates into live `.env` files in both the `backend/` and `frontend/` directories:
```bash
# In backend/ directory:
cp .env.example .env

# In frontend/ directory:
cd ../frontend && cp .env.example .env
```

### 5. Fill in the environment values
Open both `.env` files in your code editor and populate the credentials described in the [Where to Get Each Credential](#where-to-get-each-credential) section below.

**Backend (`backend/.env`):**
```env
PORT=3001
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
RAZORPAY_KEY_ID=rzp_test_yourKeyId
RAZORPAY_KEY_SECRET=yourKeySecret
QR_SECRET=your-64-character-hex-secret
CANCELLATION_FEE=2
```

**Frontend (`frontend/.env`):**
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_BASE_URL=http://localhost:3001/api
VITE_RAZORPAY_KEY_ID=rzp_test_yourKeyId
```

### 6. Initialize database schema in Supabase
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. In the left navigation sidebar, click on **SQL Editor** (the `>_` icon).
4. Click **New Query**, paste the complete contents of [supabase/schema.sql](file:///A:/antigravity/BUSCAMP/supabase/schema.sql), and click **Run** (or press `Ctrl+Enter`).
5. Verify that all tables (`trips`, `tickets`, `buses`, `profiles`), triggers, and the [`book_seat`](file:///A:/antigravity/BUSCAMP/supabase/schema.sql) RPC function are created successfully.

### 7. Run the backend API server
From the `backend/` directory, start the development server:
```bash
cd backend && npm run dev
```
The Express API starts on `http://localhost:3001`. You should see:
```
[BUSCAMP API] Server running on port 3001 in development mode
[BUSCAMP API] CORS enabled for origin: http://localhost:5173
[BUSCAMP API] Supabase & Razorpay clients initialized successfully
```

### 8. Run the frontend development client
Open a new terminal window or tab, navigate to `frontend/`, and launch the Vite dev server:
```bash
cd frontend && npm run dev
```
The frontend starts on `http://localhost:5173`.

### 9. Seed demo data
Open a separate terminal window to populate the database with initial routes, buses, scheduled trips, and default conductor roles:
```bash
cd supabase && node seed.js
```
The script confirms insertion of mock buses (e.g., MP-20-HA-1234), campus stops (Hall 1, Hall 4, Sadar, Railway Station), and active trips for today's booking window.

### 10. Open the application
Open your web browser and navigate to:
```
http://localhost:5173
```
You can now log in using your institutional email address or test student accounts created by the seed script.

---

## Where to Get Each Credential

Follow the exact UI navigation instructions below to locate and generate every required credential:

### Supabase

1. Open the [Supabase Dashboard](https://supabase.com/dashboard) and select your target project.
2. Click the **Project Settings** (gear icon) located at the bottom of the left sidebar.
3. Under the **Configuration** menu group, click **API**.
4. On the **API Settings** page, you will find:
   - **`SUPABASE_URL` / `VITE_SUPABASE_URL`**: Listed under **Project URL**. Copy the URL (e.g. `https://abcdefghijklm.supabase.co`).
   - **`SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`**: Listed under **Project API Keys** labeled as `anon` `public`. This key is safe to expose in the frontend client.
   - **`SUPABASE_SERVICE_ROLE_KEY`**: Listed under **Project API Keys** labeled as `service_role` `secret`.
     > [!CAUTION]
     > The `service_role` key completely bypasses PostgreSQL Row Level Security (RLS). Keep this key strictly secret. **NEVER** expose it in frontend code, git commits, or client-side bundles. It must only reside in `backend/.env`.

---

### Razorpay

1. Log in to the [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Look at the top-right header or left navigation toggle switch: ensure **Test Mode** toggle is switched **ON** (the badge should indicate `Test Mode` in orange or blue).
3. In the left sidebar, navigate to **Account & Settings** (or **Settings**).
4. Under the **API Keys & Webhooks** section, select **API Keys**.
5. Click **Generate Key** (or **Regenerate Key** if you previously had one).
6. A modal will display:
   - **`RAZORPAY_KEY_ID` / `VITE_RAZORPAY_KEY_ID`**: Starts with `rzp_test_...`
   - **`RAZORPAY_KEY_SECRET`**: A 24+ character alphanumeric secret.
7. Download or copy both strings immediately. Paste `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` into `backend/.env`, and copy `RAZORPAY_KEY_ID` into `frontend/.env` as `VITE_RAZORPAY_KEY_ID`.

---

### `QR_SECRET`

The `QR_SECRET` is a private 256-bit cryptographic key used by the backend to sign and verify tamper-evident HMAC-SHA256 QR tokens.

To generate a cryptographically strong 32-byte (64-character hex) key, execute this command in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Example output:
```
4f7a2d89b1c3e5f7a9d0c2e4b6a8f0123456789abcdef0123456789abcdef01
```
Copy this generated string and set it as `QR_SECRET` in `backend/.env`.

---

### `FRONTEND_ORIGIN`

The `FRONTEND_ORIGIN` defines the exact origin allowed by Express CORS middleware to make cross-origin API calls with credentials.

- **During Local Development**:
  ```env
  FRONTEND_ORIGIN=http://localhost:5173
  ```
  *(Important: Do NOT include a trailing slash).*
- **After Production Deployment**:
  ```env
  FRONTEND_ORIGIN=https://buscamp.vercel.app
  ```
  Set this to your live production frontend domain (e.g. Vercel or Netlify URL).

---

## How to Test Payments (Razorpay Test Mode)

When running in Test Mode, Razorpay provides simulated payment instruments. **No real money is charged.**

When the checkout modal opens during seat booking, use the official Razorpay test credentials:

### 1. Test Cards (Domestic / International)
- **Card Number**: `4111 1111 1111 1111`
- **Expiry Date**: Any future month and year (e.g. `12/28`)
- **CVV**: Any 3 digits (e.g. `123`)
- **Cardholder Name**: Any name (e.g. `IIITDM Student`)
- **OTP Screen**: On the simulated bank verification screen, click **Success** (or enter `123456`).

### 2. Test UPI (Fastest & Recommended)
- **VPA / UPI ID**: `success@razorpay`
- **Behavior**: Instantly approves the payment and redirects to signature verification.
- *(Optional: To test failure handling, use `failure@razorpay`)*.

### 3. Test Net Banking
- **Bank Selection**: Choose any listed bank (e.g., *HDFC Bank*, *State Bank of India*, *ICICI Bank*).
- **Credentials**: The simulator will open a mock net banking screen; click **Success**.

> [!NOTE]
> All transactions created with `rzp_test_` keys are purely simulated. They will appear in your Razorpay Dashboard under **Transactions → Payments** tagged as `Test`.

---

## Deployment

### Frontend → Vercel

1. Push your repository to your GitHub account:
   ```bash
   git push origin main
   ```
2. Log in to [Vercel](https://vercel.com) and click **Add New... → Project**.
3. Import your `buscamp` repository.
4. In the **Configure Project** screen:
   - **Root Directory**: Click **Edit** and select `frontend`.
   - **Framework Preset**: Vite (automatically detected).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Expand **Environment Variables** and add all `VITE_*` keys:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Public Anon Key
   - `VITE_API_BASE_URL`: `https://your-backend-service.onrender.com/api`
   - `VITE_RAZORPAY_KEY_ID`: `rzp_test_...` (or live key ID)
6. Click **Deploy**.
7. Once deployed, note down your production Vercel URL (e.g. `https://buscamp.vercel.app`).

---

### Backend → Render

1. Log in to [Render](https://render.com) and click **New + → Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name**: `buscamp-backend`
   - **Region**: Singapore or Frankfurt (choose the region closest to India for lowest latency)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free or Starter
4. Under **Environment Variables**, add the backend configuration:
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (Render defaults to port 10000)
   - `FRONTEND_ORIGIN`: `https://buscamp.vercel.app` (your actual Vercel URL without trailing slash)
   - `SUPABASE_URL`: `https://your-project-id.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase `service_role` secret key
   - `RAZORPAY_KEY_ID`: `rzp_test_...`
   - `RAZORPAY_KEY_SECRET`: Your Razorpay Secret
   - `QR_SECRET`: The 64-character hex secret string
   - `CANCELLATION_FEE`: `2`
5. Click **Create Web Service**.
6. Note down your backend URL (e.g. `https://buscamp-backend.onrender.com`).

---

### After Deployment — Update These

Once both services are deployed, update these three critical cross-service linkages:

1. **Supabase Auth Redirect URLs**:
   - Go to **Supabase Dashboard → Authentication → URL Configuration**.
   - Under **Site URL**, set your production Vercel domain: `https://buscamp.vercel.app`.
   - Under **Redirect URLs**, add `https://buscamp.vercel.app/**`.
   - Click **Save**. This ensures magic links correctly redirect users back to the production frontend.
2. **Backend CORS Configuration**:
   - In Render Dashboard → Environment Variables, update `FRONTEND_ORIGIN` to match your production Vercel domain: `https://buscamp.vercel.app`.
   - Trigger a redeploy if Render does not automatically restart the service.
3. **Frontend API Base URL**:
   - In Vercel Dashboard → Settings → Environment Variables, verify that `VITE_API_BASE_URL` is set to `https://buscamp-backend.onrender.com/api`.
   - Trigger a new deployment on Vercel to bake the updated variable into the Vite production bundle.

---

## Troubleshooting

### CORS errors
- **Symptom**: Browser console shows:
  ```
  Access to fetch at 'https://buscamp-backend.onrender.com/api/trips' from origin 'https://buscamp.vercel.app' has been blocked by CORS policy.
  ```
- **Cause**: The `FRONTEND_ORIGIN` environment variable configured on the backend does not match the actual incoming `Origin` header sent by the browser. Common mistakes include adding a trailing slash (`https://buscamp.vercel.app/`), omitting `https://`, or forgetting to update from `localhost`.
- **Fix**:
  1. Check the exact value of `FRONTEND_ORIGIN` in your backend environment variables.
  2. Ensure it strictly matches your frontend domain without any trailing slash (e.g., `https://buscamp.vercel.app`).
  3. Ensure your Express server enables credentials if headers/cookies are being passed:
     ```javascript
     app.use(cors({
       origin: process.env.FRONTEND_ORIGIN,
       credentials: true,
       methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
       allowedHeaders: ['Content-Type', 'Authorization']
     }));
     ```

---

### "permission denied for table" (RLS errors)
- **Symptom**: Supabase query returns HTTP 403 or error message:
  ```json
  { "code": "42501", "message": "permission denied for table trips" }
  ```
- **Cause**: The client or backend query is executing under PostgreSQL Row Level Security (RLS) using the anonymous public key (`anon`), but no matching permissive RLS policy exists for the operation.
- **Fix**:
  1. Sensitive transactions (such as seat decrementing, order verification, and conductor scans) **must** go through the Node.js Express backend using the privileged **`SUPABASE_SERVICE_ROLE_KEY`**.
  2. Verify that your backend Supabase client is initialized using the service role key:
     ```javascript
     // backend/src/config/supabase.js
     const { createClient } = require('@supabase/supabase-js');
     const supabaseAdmin = createClient(
       process.env.SUPABASE_URL,
       process.env.SUPABASE_SERVICE_ROLE_KEY // NOT anon key!
     );
     module.exports = supabaseAdmin;
     ```
  3. If querying directly from the frontend, verify that [supabase/schema.sql](file:///A:/antigravity/BUSCAMP/supabase/schema.sql) has public read policies defined:
     ```sql
     CREATE POLICY "Allow public read trips" ON trips FOR SELECT USING (true);
     ```

---

### Razorpay signature mismatch
- **Symptom**: Payment completes on Razorpay modal, but backend verification endpoint responds with:
  ```json
  { "error": "Invalid payment signature" }
  ```
- **Cause 1**: The `RAZORPAY_KEY_SECRET` in `backend/.env` has leading/trailing whitespaces, or does not belong to the same Razorpay account as `RAZORPAY_KEY_ID`.
- **Cause 2**: The string concatenation order for HMAC generation is inverted. Razorpay strictly mandates `order_id + "|" + payment_id`.
- **Cause 3**: The frontend checkout opened using a **Test** key (`rzp_test_...`), but the backend attempted to verify using a **Live** secret (`rzp_live_...`), or vice versa.
- **Fix**:
  1. Ensure the signature algorithm exactly matches:
     ```javascript
     const crypto = require('crypto');
     const body = razorpay_order_id + "|" + razorpay_payment_id;
     const expectedSignature = crypto
       .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET.trim())
       .update(body.toString())
       .digest('hex');

     if (expectedSignature !== razorpay_signature) {
       return res.status(400).json({ error: 'Signature mismatch' });
     }
     ```
  2. Confirm both `RAZORPAY_KEY_ID` and `VITE_RAZORPAY_KEY_ID` share the exact same key prefix (`rzp_test_` or `rzp_live_`).

---

### Magic link not arriving
- **Symptom**: Student submits email on `/login`, but no authentication email arrives.
- **Causes & Fixes**:
  1. **Spam / Promotions Folder**: Inspect the spam or junk folder in your mail client.
  2. **Email Typo**: Confirm the student email matches the institutional format (e.g. `roll_no@iiitdmj.ac.in`).
  3. **Supabase Rate Limiting**: The Supabase free-tier built-in email service limits outbound emails to **3 emails per hour per recipient** and **30 emails per hour per project**. Wait at least 60 seconds before retrying.
  4. **Inspect Delivery Logs**: Navigate to **Supabase Dashboard → Authentication → Logs** to view real-time delivery statuses, rate-limit warnings, or bounce errors.
  5. **Custom SMTP (Recommended for Production)**: In Supabase Dashboard → Settings → Auth → SMTP Settings, configure an external SMTP provider (such as Resend, SendGrid, or AWS SES) to eliminate rate limits.

---

### Seed script fails
- **Symptom**: Running `node supabase/seed.js` throws an authentication or foreign key violation error.
- **Cause**: The seed script requires administrative access to invoke `auth.admin.createUser()` and populate system roles. If `SUPABASE_SERVICE_ROLE_KEY` is missing or set to the public `anon` key, the script fails immediately.
- **Fix**:
  1. Check `backend/.env` or export `SUPABASE_SERVICE_ROLE_KEY` in your terminal prior to running the seed script:
     ```bash
     export SUPABASE_URL="https://your-project.supabase.co"
     export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
     node supabase/seed.js
     ```
  2. Ensure `supabase/schema.sql` was executed completely in the SQL Editor before running the seed script.

---

## Going Live (Swapping to Live Razorpay Keys)

When the institution is ready to transition BUSCAMP from testing to real passenger operations with actual currency, follow this deployment checklist:

1. **Switch to Live Mode in Razorpay Dashboard**:
   - Log in to [Razorpay Dashboard](https://dashboard.razorpay.com).
   - In the top header bar, toggle the switch from **Test Mode** to **Live Mode**.
2. **Generate Live API Keys**:
   - Navigate to **Account & Settings → API Keys**.
   - Click **Generate Key**.
   - Copy the Live Key ID (`rzp_live_...`) and Live Key Secret.
3. **Update Backend Production Environment**:
   - In your backend hosting provider (e.g. Render Dashboard):
     - Replace `RAZORPAY_KEY_ID` with your `rzp_live_...` key.
     - Replace `RAZORPAY_KEY_SECRET` with your Live Secret.
4. **Update Frontend Production Environment**:
   - In your frontend hosting provider (e.g. Vercel Dashboard):
     - Replace `VITE_RAZORPAY_KEY_ID` with your `rzp_live_...` key.
   - Trigger a redeployment of the frontend web application.
5. **⚠️ Live Mode Pre-Flight Verification**:
   - Live mode processes real money in Indian Rupees (INR).
   - Test a ₹15 or ₹20 seat booking using a real UPI app (e.g. Google Pay or PhonePe).
   - Test a self-service cancellation to verify that the ₹2 cancellation fee is withheld and the remaining ₹13 or ₹18 is credited back to your bank account via the Razorpay Refunds API.
6. **Set Up Razorpay Webhooks (Recommended)**:
   - In Razorpay Dashboard → **Settings → Webhooks**, add your backend webhook endpoint:
     `https://buscamp-backend.onrender.com/api/payments/webhook`
   - Select events: `payment.captured`, `payment.failed`, `refund.processed`.
   - Set a `RAZORPAY_WEBHOOK_SECRET` in Render to handle edge cases like network drops between student browsers and the API.
7. **Enable Multi-Factor Authentication (2FA)**:
   - Under Razorpay Account Settings, enable Two-Factor Authentication (TOTP via Google Authenticator or SMS OTP) for all administrative accounts with live financial access.

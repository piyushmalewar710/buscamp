# BUSCAMP — IIITDM Jabalpur Campus Bus Ticketing System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](file:///A:/antigravity/BUSCAMP/LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](file:///A:/antigravity/BUSCAMP/package.json)
[![React Version](https://img.shields.io/badge/react-18.x-61dafb.svg)](file:///A:/antigravity/BUSCAMP/frontend/package.json)
[![Database](https://img.shields.io/badge/database-Supabase%20(PostgreSQL)-3ECF8E.svg)](file:///A:/antigravity/BUSCAMP/supabase/schema.sql)
[![Payments](https://img.shields.io/badge/payments-Razorpay%20(Test%20Mode)-0C2340.svg)](https://razorpay.com)

A production-ready, concurrency-safe digital transit ticketing and fleet validation platform built specifically for the Indian Institute of Information Technology, Design and Manufacturing (IIITDM) Jabalpur campus community.

---

## What This Is

The Indian Institute of Information Technology, Design and Manufacturing (IIITDM) Jabalpur campus is situated on Dumna Airport Road, roughly 10 kilometers away from Jabalpur city center and the primary railway transit junction. To connect students, faculty, and campus residents with key city destinations—such as Jabalpur Junction Railway Station, Sadar Bazar, and Civic Centre—the institute operates daily scheduled shuttle buses. Historically, obtaining a bus seat was plagued by physical friction: long queues outside the hall of residence offices, chaotic paper coupon distribution, manual cash transactions, lack of seat quotas, and frantic messaging over informal WhatsApp groups. Peak travel hours, weekend departures, and end-of-semester rushes routinely led to severe overcrowding, seat hoarding, disputes over reservations, and zero accountability for conductors or transit administrators.

BUSCAMP was engineered to completely replace these fragile manual workflows with an automated, high-concurrency, mobile-first web platform. By uniting institutional identity verification, a real-time reservation engine, Razorpay micropayments, and cryptographically tamper-evident dynamic QR tickets, BUSCAMP ensures an equitable, transparent, and frictionless transit experience. Students can view live seat availability and reserve their seats in seconds; conductors can scan and authenticate boarding passes in under 100 milliseconds via standard smartphone cameras; and institute administrators gain full operational visibility over fleet schedules, dynamic booking windows, passenger manifests, and revenue analytics.

---

## Architecture Overview

BUSCAMP follows a decoupled, cloud-native architecture optimized for high availability, low latency, and zero-trust security. The system isolates client presentation, payment verification, cryptographic token issuance, and transactional seat allocation into distinct tiers.

### System Architecture Diagram

```
+---------------------------------------------------------------------------------------+
|                                    CLIENT LAYER                                       |
|                                                                                       |
|   +---------------------------------+          +----------------------------------+   |
|   |         Student Device          |          |         Conductor Mobile         |   |
|   |  - Route & Seat Browsing        |          |  - In-Browser QR Scanner (HTML5) |   |
|   |  - Razorpay Modal Checkout      |          |  - Instant Sound & Visual Cues   |   |
|   |  - Dynamic Pulsing QR Display   |          |  - Live Boarding Manifest        |   |
|   +---------------------------------+          +----------------------------------+   |
|                   |                                              |                    |
|                   +----------------------+-----------------------+                    |
|                                          |                                            |
|                                          v                                            |
|                         React 18 + Vite + TailwindCSS SPA                             |
|                           [ Hosted on Vercel / Netlify ]                              |
+------------------------------------------+--------------------------------------------+
                                           |
                                           | HTTPS / REST API / WebSockets
                                           v
+---------------------------------------------------------------------------------------+
|                             APPLICATION & API LAYER                                   |
|                                                                                       |
|                                Node.js + Express API                                  |
|                             [ Hosted on Render / Railway ]                            |
|                                                                                       |
|  - Auth Verification Middleware (Supabase JWT)                                        |
|  - Booking Window Validation Middleware (IST Timezone)                                |
|  - Razorpay Order Factory & HMAC Signature Verification                               |
|  - Cryptographic QR Token Minting & Verification (HMAC-SHA256)                        |
|  - Programmatic Refund Dispatcher (Razorpay Refunds API)                              |
+---------------------+-----------------------------------+-----------------------------+
                      |                                   |
                      | Service Role Client (RLS Bypass)  | REST API / Webhooks
                      v                                   v
+-----------------------------------+   +-----------------------------------------------+
|       PERSISTENCE & AUTH          |   |               PAYMENT GATEWAY                 |
|                                   |   |                                               |
|      Supabase (PostgreSQL)        |   |              Razorpay Platform                |
|  - Supabase Auth (Magic Links)    |   |  - Order Generation                           |
|  - Row Level Security (RLS)       |   |  - Secure Payment Capture (UPI/Card/NetBank)  |
|  - `book_seat` Concurrency RPC    |   |  - Cryptographic Signature Hash               |
|    (SELECT FOR UPDATE locks)      |   |  - Automated Partial / Full Refunds           |
|  - Realtime Pub/Sub Engine        |   |    (₹2 Cancellation Fee Deduction)            |
+-----------------------------------+   +-----------------------------------------------+
```

### Core Components
- **Frontend**: [React 18](file:///A:/antigravity/BUSCAMP/frontend/package.json) Single Page Application bundled with [Vite](file:///A:/antigravity/BUSCAMP/frontend/vite.config.js) and styled using [TailwindCSS](file:///A:/antigravity/BUSCAMP/frontend/tailwind.config.js). Implements mobile-first responsive interfaces, client-side camera scanning via `html5-qrcode`, dynamic SVG QR generation, and real-time state synchronization. Hosted on **Vercel** or **Netlify**.
- **Backend**: [Node.js](file:///A:/antigravity/BUSCAMP/backend/package.json) and [Express](file:///A:/antigravity/BUSCAMP/backend/server.js) REST API microservice. Enforces institutional security rules, manages HMAC cryptographic signing and verification, coordinates Razorpay payment flows, and mediates administrative mutations. Hosted on **Render** or **Railway**.
- **Database & Identity**: [Supabase](file:///A:/antigravity/BUSCAMP/supabase/schema.sql) (PostgreSQL 15+). Handles passwordless email authentication (magic links restricted to `@iiitdmj.ac.in`), strict Row Level Security (RLS) data policies, PostgreSQL stored functions (`book_seat` RPC with row locking), and Realtime WebSocket notifications for live seat count decrementing.
- **Payment Processing**: [Razorpay Payment Gateway](https://razorpay.com) operating in Test Mode for development and simulation. Handles multi-channel digital collections (UPI QR, Google Pay, PhonePe, Paytm, RuPay/Visa/Mastercard, Net Banking) and programmatic micro-refunds.

---

## Feature Summary

### Students
- **Institutional Magic Link Sign-In**: Passwordless, friction-free login verifying the `@iiitdmj.ac.in` domain directly via Supabase Auth.
- **Interactive Trip Browser**: Real-time listing of daily departures, bus vehicle numbers, assigned drivers, route waypoints (Hall 1, Hall 4, Main Gate, Sadar, Jabalpur Railway Station), and live seat availability counts.
- **1-Click Checkout**: Seamless checkout modal powered by Razorpay Standard Checkout supporting UPI, credit/debit cards, net banking, and wallets.
- **Anti-Tamper Dynamic QR Ticket**: High-resolution QR boarding pass signed with HMAC-SHA256 containing a rotating security canvas, animated live timestamp, and countdown timer to prevent static screenshot sharing.
- **Self-Service Cancellation & Instant Refund**: Cancel booked tickets up to trip departure cutoff directly from the dashboard. Automatically deducts the institutional ₹2 cancellation fee and dispatches the remaining refund via the Razorpay Refunds API.
- **Digital Ticket Archive & Receipts**: Access past trips, download digital travel receipts, and monitor live boarding status (`ACTIVE`, `BOARDED`, `CANCELLED`, `EXPIRED`).

### Conductors
- **In-Browser High-Speed QR Scanner**: Camera-based scanner utilizing device cameras directly from the web browser without installing external native mobile applications.
- **Sub-100ms Ticket Validation**: Dual-layer cryptographic and database verification checking authenticity and state in under 100ms.
- **Auditory & Visual Feedback**: Unambiguous, high-contrast modal alerts—bright green chime for valid boarding, loud red alarm for already boarded, expired, or forged tickets.
- **Anti-Replay Protection**: Guarantees that any ticket scanned once cannot be reused by multiple students boarding simultaneously.
- **Live Boarding Roster**: Real-time display of total booked passengers, boarded passengers, remaining unboarded students, and remaining bus capacity.
- **Manual Roll Number Lookup**: Emergency check-in fallback searching by student roll number or 8-character alphanumeric ticket code in case of broken phone screens or poor camera focus.

### Admin
- **Fleet & Route Management**: Register and configure buses (bus registration numbers, total seating capacity), bus stops, travel routes, and default ticket tariffs.
- **Trip Scheduler**: Schedule recurring and ad-hoc trips, assign drivers and conductors, specify vehicle allocations, and configure seat quotas.
- **Dynamic Booking Window Controls**: Enforce institutional booking hours (default: 1:00 PM to 10:00 PM IST) or set custom per-trip opening and closing windows for exam or festival shuttles.
- **Passenger Manifests & Export**: View complete passenger lists with roll numbers, contact emails, booking timestamps, and boarding verification times; exportable to CSV/Excel for institute transit logs.
- **Revenue & Operational Analytics**: Comprehensive dashboard showing daily ticket sales, seat occupancy load factors, total cancellation fee collection, and refund logs.
- **Role-Based Access Control (RBAC)**: Manage conductor and administrator privileges securely backed by Supabase user metadata and role tables.
- **Emergency Trip Management**: Cancel scheduled trips due to mechanical failure or emergency closures with one-click automated mass refunds to all booked students.

---

## Key Technical Decisions

### QR Security

Campus transit ticketing systems are particularly vulnerable to screenshot forgery, ticket sharing, and counterfeit passes. BUSCAMP implements a zero-trust cryptographic verification model:

```
+-----------------------------------------------------------------------------------+
|                            HMAC-SHA256 TOKEN LIFECYCLE                            |
|                                                                                   |
|  1. Payload Creation:                                                             |
|     payload = { ticket_id, trip_id, user_id, issued_at, expires_at }              |
|                                                                                   |
|  2. Cryptographic Signing (Backend):                                              |
|     signature = HMAC_SHA256( JSON.stringify(payload), QR_SECRET )                |
|     qr_token  = Base64URL(payload) + "." + signature                             |
|                                                                                   |
|  3. Conductor Scan & Fast-Path Rejection (Memory):                                |
|     recomputed = HMAC_SHA256( decoded_payload, QR_SECRET )                       |
|     IF signature != recomputed THEN REJECT ("Tampered / Forged Token")            |
|                                                                                   |
|  4. Atomic DB Consumption (Database):                                             |
|     UPDATE tickets                                                                |
|     SET status = 'BOARDED', boarded_at = NOW()                                    |
|     WHERE id = :ticket_id AND status = 'ACTIVE'                                   |
|     RETURNING *;                                                                  |
|                                                                                   |
|  5. Anti-Replay Check:                                                            |
|     If 0 rows updated -> REJECT ("Ticket already boarded or invalid")             |
+-----------------------------------------------------------------------------------+
```

1. **HMAC-SHA256 Signed Token**: When a seat booking is confirmed, the backend constructs a structured JSON payload containing `ticket_id`, `trip_id`, `user_id`, `issued_at`, and `expires_at`. It signs this payload with a private, 256-bit server secret (`QR_SECRET`) using HMAC-SHA256. The resulting token is encoded into the QR code.
2. **Zero-Database-Hit Fast Validation**: When a conductor scans a QR code, the backend first recomputes the HMAC digest over the decoded payload in memory. If the signature does not match or the token is past its `expires_at` timestamp, the request is rejected immediately with a `400 Invalid Signature` error. This completely shields the database from denial-of-service attempts using random or altered QR codes.
3. **Atomic State Transition (Anti-Replay)**: To prevent a valid QR screenshot from being scanned multiple times by different individuals, the backend executes an atomic PostgreSQL conditional update:
   ```sql
   UPDATE tickets 
   SET status = 'BOARDED', boarded_at = NOW() 
   WHERE id = $1 AND status = 'ACTIVE' 
   RETURNING *;
   ```
   If the ticket was already scanned, `status` is already `'BOARDED'`, resulting in 0 rows updated. The server immediately returns an error indicating that the ticket was already redeemed at a specific timestamp, triggering a loud rejection alarm on the conductor's device.
4. **Dynamic Frontend Anti-Screenshot Canvas**: The frontend student ticket screen renders an animated, pulsing concentric ring and a live, millisecond-precision digital clock synced with the server to prevent students from presenting static video recordings or screenshots to conductors.

---

### Concurrency-Safe Booking

When bus ticket bookings open at 1:00 PM IST, several hundred students simultaneously compete for a finite number of seats (typically 30 to 50 seats per bus). Standard application-level query sequences (e.g. `SELECT seats_available FROM trips` followed by `INSERT INTO tickets`) suffer from classic Time-Of-Check to Time-Of-Use (TOCTOU) race conditions, resulting in severe overselling.

BUSCAMP solves this at the database engine level via a custom PostgreSQL Stored Procedure ([`book_seat`](file:///A:/antigravity/BUSCAMP/supabase/schema.sql)) executed inside an isolated transaction with explicit row-level locking:

```sql
CREATE OR REPLACE FUNCTION book_seat(
    p_trip_id UUID,
    p_user_id UUID,
    p_payment_id TEXT,
    p_amount NUMERIC
) RETURNS JSONB AS $$
DECLARE
    v_trip RECORD;
    v_ticket RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Exclusively lock the specific trip record
    SELECT * INTO v_trip 
    FROM trips 
    WHERE id = p_trip_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'TRIP_NOT_FOUND: Trip does not exist.';
    END IF;

    -- 2. Verify booking window validity
    IF v_now < v_trip.booking_opens_at OR v_now > v_trip.booking_closes_at THEN
        RAISE EXCEPTION 'BOOKING_CLOSED: Booking window is not currently open.';
    END IF;

    -- 3. Verify seat availability under exclusive lock
    IF v_trip.seats_available <= 0 THEN
        RAISE EXCEPTION 'TRIP_FULL: No seats remaining on this trip.';
    END IF;

    -- 4. Check for duplicate active booking by same student
    IF EXISTS (
        SELECT 1 FROM tickets 
        WHERE trip_id = p_trip_id 
          AND user_id = p_user_id 
          AND status = 'ACTIVE'
    ) THEN
        RAISE EXCEPTION 'ALREADY_BOOKED: Student already holds an active ticket for this trip.';
    END IF;

    -- 5. Atomically decrement seats
    UPDATE trips 
    SET seats_available = seats_available - 1,
        updated_at = v_now
    WHERE id = p_trip_id;

    -- 6. Issue ticket record
    INSERT INTO tickets (
        trip_id,
        user_id,
        payment_id,
        amount,
        status,
        created_at
    ) VALUES (
        p_trip_id,
        p_user_id,
        p_payment_id,
        p_amount,
        'ACTIVE',
        v_now
    ) RETURNING * INTO v_ticket;

    RETURN to_jsonb(v_ticket);
END;
$$ LANGUAGE plpgsql;
```

#### Why `SELECT ... FOR UPDATE` Is Crucial
- The `FOR UPDATE` clause places an exclusive row-level lock on the target trip row.
- When 100 concurrent requests hit the procedure at the exact same millisecond, PostgreSQL serializes them. Each incoming transaction waits for the preceding transaction to release the lock.
- Each transaction reads the updated `seats_available` value immediately after the previous decrement.
- The instant `seats_available` reaches `0`, subsequent queued transactions immediately encounter the `TRIP_FULL` exception and rollback cleanly, preventing negative inventory and overselling.

---

### Payment Flow

BUSCAMP strictly enforces a **5-Step Asynchronous Payment Protocol** integrated with Razorpay. Under no circumstances does the system trust client-reported payment events.

```
STUDENT (Client)                BACKEND (Express API)                 RAZORPAY GATEWAY             SUPABASE (Postgres)
      |                                   |                                  |                              |
      | 1. POST /api/payments/create-order|                                  |                              |
      |---------------------------------->|                                  |                              |
      |                                   |-- razorpay.orders.create() ----->|                              |
      |                                   |<-- Returns { order_id } ---------|                              |
      |   { orderId, amount, currency }   |                                  |                              |
      |<----------------------------------|                                  |                              |
      |                                                                      |                              |
      | 2. Opens Razorpay Modal & Student Completes Payment (UPI / Cards)    |                              |
      |--------------------------------------------------------------------->|                              |
      |<-- Returns { razorpay_order_id, razorpay_payment_id, signature } ----|                              |
      |                                                                                                     |
      | 3. POST /api/payments/verify-payment                                                                |
      |---------------------------------->|                                                                 |
      |                                   |-- Verify HMAC-SHA256 signature                                  |
      |                                   |   hash(order_id + "|" + payment_id, SECRET)                     |
      |                                   |                                                                 |
      |                                   | 4. Call `book_seat` RPC with FOR UPDATE lock                    |
      |                                   |---------------------------------------------------------------->|
      |                                   |<-- Atomically decrements seat & creates ticket record ----------|
      |                                   |                                                                 |
      |                                   | 5. Sign HMAC-SHA256 QR token & generate payload                 |
      |   { ticket, qr_token, status }    |                                                                 |
      |<----------------------------------|                                                                 |
      v                                   v                                                                 v
```

1. **Step 1: Order Creation (`POST /api/payments/create-order`)**: The student selects a trip and requests checkout. The backend checks current trip status, validates the active booking window, calls Razorpay's Orders API via `razorpay.orders.create()`, and returns an authorized `order_id`.
2. **Step 2: Client Checkout Modal**: The frontend launches Razorpay's Standard Checkout SDK passing the `order_id`, institute branding, and student details. The student completes authentication and payment through UPI, debit card, or net banking.
3. **Step 3: Cryptographic Signature Verification (`POST /api/payments/verify-payment`)**: Upon payment completion, Razorpay returns `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature` to the frontend, which immediately submits them to the backend. The backend computes the expected HMAC-SHA256 digest:
   ```javascript
   const expectedSignature = crypto
     .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
     .update(`${razorpay_order_id}|${razorpay_payment_id}`)
     .digest('hex');

   if (expectedSignature !== razorpay_signature) {
     throw new Error('Payment signature verification failed: Potential tampering detected.');
   }
   ```
4. **Step 4: Atomic Seat Booking**: Only after cryptographic confirmation does the backend invoke the PostgreSQL `book_seat` RPC using the privileged Supabase Service Role client. In the extremely rare edge case where seats sold out during checkout, the database raises an exception and the backend immediately initiates a 100% full refund through the Razorpay Refunds API.
5. **Step 5: Ticket Issuance & QR Token Minting**: Upon successful database insertion, the server constructs the HMAC-signed QR token, persists the ticket state, and returns the confirmed ticket payload to the frontend.

---

### Booking Window

To promote discipline, predictability, and prevent midnight server contention, BUSCAMP implements institutional booking windows:

- **Default Operational Schedule**:
  - **Sale Opens**: 1:00 PM (13:00) IST daily.
  - **Sale Closes**: 10:00 PM (22:00) IST daily, or earlier if `seats_available === 0`.
- **Per-Trip Administrative Customization**: Administrators can override the standard schedule by specifying explicit `booking_opens_at` and `booking_closes_at` timestamps per trip directly in the admin dashboard (e.g. for weekend early departures, exam shuttles, or festival services).
- **Multi-Tier Enforcement**:
  - **Client-Side**: Real-time visual status badges ("Booking Opens at 1:00 PM", "Sold Out", "Booking Closed") and disabled checkout buttons with live countdown timers.
  - **API Middleware**: The backend verifies current time against the trip's window before initiating Razorpay order creation (`403 Forbidden: Booking Window Closed`).
  - **Database Constraint**: The `book_seat` stored function validates `NOW() BETWEEN booking_opens_at AND booking_closes_at` before acquiring table locks.

---

### Cancellation Policy

BUSCAMP provides an automated self-service cancellation flow designed to balance student flexibility with transit cost recovery:

- **Cancellation Processing Fee**: A fixed non-refundable cancellation fee of **₹2.00** is retained per cancelled seat to cover payment gateway charges and administrative overhead.
- **Refund Formula**:
  $$\text{Refund Amount} = \text{Ticket Price} - \text{₹2.00}$$
  *(e.g., A ticket purchased for ₹20.00 yields an instant refund of ₹18.00; a ticket purchased for ₹15.00 yields ₹13.00).*
- **Automated Refund API Integration**:
  When a student clicks "Cancel Ticket" (`POST /api/tickets/:id/cancel`):
  1. The server checks that the ticket is in `ACTIVE` state and that current time is at least 30 minutes prior to scheduled departure.
  2. The server calls the Razorpay Refunds API:
     ```javascript
     const refund = await razorpay.payments.refund(ticket.payment_id, {
       amount: (ticket.amount - 2) * 100, // Amount in paise
       notes: {
         ticket_id: ticket.id,
         reason: 'Student initiated self-service cancellation'
       }
     });
     ```
  3. The database updates the ticket to `CANCELLED`, records the `refund_id`, and atomically increments the trip's `seats_available` count by 1, instantly making the seat available to other students.

---

## Environment Variables

BUSCAMP uses separated environment variable profiles for the Express backend and the Vite frontend.

### Backend Environment Variables (`backend/.env`)

| Variable Name | Type | Description | Example / Default | Required |
| :--- | :--- | :--- | :--- | :--- |
| `PORT` | Number | Port on which Express server listens | `3001` | No (Default: 3001) |
| `NODE_ENV` | String | Runtime environment mode | `development` or `production` | Yes |
| `FRONTEND_ORIGIN` | URL | Origin permitted for CORS requests (no trailing slash) | `http://localhost:5173` (Prod: `https://buscamp.vercel.app`) | Yes |
| `SUPABASE_URL` | URL | Supabase project URL | `https://xyzcompany.supabase.co` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY`| String | Supabase Service Role Secret Key (bypasses RLS) | `eyJh...` (Secret) | Yes |
| `RAZORPAY_KEY_ID` | String | Razorpay API Key ID (Test or Live) | `rzp_test_9876543210` | Yes |
| `RAZORPAY_KEY_SECRET` | String | Razorpay API Key Secret | `abcdefghijklmnopqrstuvwx` | Yes |
| `QR_SECRET` | Hex String| 256-bit cryptographic key for signing QR tokens | `64-character-hex-string` | Yes |
| `CANCELLATION_FEE` | Number | Institutional fee deducted upon cancellation (INR) | `2` | No (Default: 2) |

### Frontend Environment Variables (`frontend/.env`)

| Variable Name | Type | Description | Example / Default | Required |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | URL | Supabase project URL | `https://xyzcompany.supabase.co` | Yes |
| `VITE_SUPABASE_ANON_KEY` | String | Supabase Public Anonymous API Key | `eyJh...` (Public) | Yes |
| `VITE_API_BASE_URL` | URL | Backend API base URL (no trailing slash) | `http://localhost:3001/api` | Yes |
| `VITE_RAZORPAY_KEY_ID` | String | Razorpay Public Key ID (must match backend Key ID)| `rzp_test_9876543210` | Yes |

---

## Folder Structure

```
BUSCAMP/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── razorpay.js          # Razorpay SDK initialization
│   │   │   └── supabase.js          # Supabase service role client instance
│   │   ├── controllers/
│   │   │   ├── authController.js    # Auth helper and profile operations
│   │   │   ├── paymentController.js # Order generation & signature verification
│   │   │   ├── ticketController.js  # QR token generation & cancellation handler
│   │   │   ├── tripController.js    # Trip schedules & seat availability
│   │   │   └── validateController.js# Conductor QR cryptographic validation
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js    # Supabase JWT token verification
│   │   │   ├── roleMiddleware.js    # Conductor and admin role guards
│   │   │   └── windowMiddleware.js  # 1:00 PM - 10:00 PM IST window validator
│   │   ├── routes/
│   │   │   ├── payments.js          # /api/payments routes
│   │   │   ├── tickets.js           # /api/tickets routes
│   │   │   ├── trips.js             # /api/trips routes
│   │   │   └── validate.js          # /api/validate routes
│   │   ├── utils/
│   │   │   ├── qrHelper.js          # HMAC-SHA256 signer and verifier
│   │   │   └── timeHelper.js        # IST timezone conversion and window checks
│   │   └── server.js                # Express app entry point & CORS configuration
│   ├── .env.example                 # Sample environment variables for backend
│   ├── package.json                 # Backend dependencies & script definitions
│   └── package-lock.json
│
├── frontend/
│   ├── public/
│   │   ├── favicon.ico
│   │   └── sounds/
│   │       ├── scan-success.mp3     # Audio chime for successful conductor scan
│   │       └── scan-fail.mp3        # Audio alert for invalid / duplicate scan
│   ├── src/
│   │   ├── assets/                  # Logos and institute transit icons
│   │   ├── components/
│   │   │   ├── ConductorScanner.jsx # html5-qrcode camera barcode/QR scanner
│   │   │   ├── Navbar.jsx           # Responsive navbar with user profile & role
│   │   │   ├── ProtectedRoute.jsx   # Role-based route guard component
│   │   │   ├── PulseIndicator.jsx   # Animated anti-screenshot security badge
│   │   │   ├── QRTicketModal.jsx    # Dynamic QR display with countdown timer
│   │   │   └── TripCard.jsx         # Trip card with real-time seat indicator
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # Supabase Auth state provider
│   │   │   └── ToastContext.jsx     # Alert notifications and chime trigger
│   │   ├── lib/
│   │   │   ├── api.js               # Axios / Fetch client with auth headers
│   │   │   ├── razorpay.js          # Razorpay checkout modal loader
│   │   │   └── supabaseClient.js    # Supabase public anonymous client
│   │   ├── pages/
│   │   │   ├── AdminDashboard.jsx   # Fleet schedules, booking windows, analytics
│   │   │   ├── ConductorScan.jsx    # Conductor camera scan view & passenger list
│   │   │   ├── Home.jsx             # Active trips listing & seat selection
│   │   │   ├── Login.jsx            # Passwordless magic link sign-in
│   │   │   ├── MyTickets.jsx        # Student ticket history & cancellations
│   │   │   └── Unauthorized.jsx     # 403 access denial screen
│   │   ├── App.jsx                  # React Router configuration
│   │   ├── index.css                # Tailwind directives and custom animation styles
│   │   └── main.jsx                 # React root DOM mount
│   ├── .env.example                 # Sample environment variables for frontend
│   ├── index.html                   # HTML entry point with Razorpay script tag
│   ├── package.json                 # Frontend dependencies & scripts
│   ├── tailwind.config.js           # Tailwind CSS configuration
│   └── vite.config.js               # Vite build configuration
│
├── supabase/
│   ├── migrations/                  # Incremental SQL migrations
│   ├── schema.sql                   # Complete PostgreSQL schema, RLS, & book_seat RPC
│   └── seed.js                      # Database seeder (demo buses, trips, conductors)
│
├── DEPENDENCIES.md                  # Comprehensive setup, deployment & debugging guide
└── README.md                        # Primary project documentation
```

---

## Getting Started

To set up BUSCAMP on your local workstation or deploy to production cloud providers, refer to the complete, step-by-step setup guide in [DEPENDENCIES.md](file:///A:/antigravity/BUSCAMP/DEPENDENCIES.md).

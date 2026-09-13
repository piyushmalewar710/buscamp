-- FULL SCHEMA: profiles, buses, trips, tickets, payments, ticket_transfers, audit_logs

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES
CREATE TABLE profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role text CHECK (role IN ('student','conductor','admin')) NOT NULL DEFAULT 'student',
    full_name text,
    roll_number text UNIQUE,
    email text,
    phone text,
    department text,
    created_at timestamptz DEFAULT now()
);

-- 2. BUSES
CREATE TABLE buses (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    bus_number text NOT NULL,
    capacity int NOT NULL,
    contractor_name text,
    created_at timestamptz DEFAULT now()
);

-- 3. TRIPS
CREATE TABLE trips (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    bus_id uuid REFERENCES buses(id),
    direction text CHECK (direction IN ('college_to_city','city_to_college')) NOT NULL,
    trip_date date NOT NULL,
    departure_time time NOT NULL,
    price numeric DEFAULT 20,
    total_seats int NOT NULL,
    seats_available int NOT NULL,
    conductor_id uuid REFERENCES profiles(id),
    sale_opens_at timestamptz NOT NULL,
    sale_closes_at timestamptz NOT NULL,
    status text CHECK (status IN ('scheduled','ongoing','completed','cancelled')) DEFAULT 'scheduled',
    created_at timestamptz DEFAULT now()
);

-- 4. PAYMENTS
CREATE TABLE payments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    razorpay_order_id text,
    razorpay_payment_id text,
    razorpay_signature text,
    amount numeric NOT NULL,
    currency text DEFAULT 'INR',
    status text CHECK (status IN ('created','paid','failed','refunded')) DEFAULT 'created',
    student_id uuid REFERENCES profiles(id),
    trip_id uuid REFERENCES trips(id),
    created_at timestamptz DEFAULT now()
);

-- 5. TICKETS
CREATE TABLE tickets (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id uuid REFERENCES trips(id),
    student_id uuid REFERENCES profiles(id),
    status text CHECK (status IN ('active','used','cancelled','transferred')) DEFAULT 'active',
    qr_token text UNIQUE,
    payment_id uuid REFERENCES payments(id),
    booked_at timestamptz DEFAULT now(),
    used_at timestamptz,
    scanned_by uuid REFERENCES profiles(id),
    manual_override boolean DEFAULT false
);

-- 6. TICKET TRANSFERS
CREATE TABLE ticket_transfers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id uuid REFERENCES tickets(id),
    from_student_id uuid REFERENCES profiles(id),
    to_roll_number text NOT NULL,
    to_student_id uuid REFERENCES profiles(id),
    status text CHECK (status IN ('pending','accepted','rejected','expired')) DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    resolved_at timestamptz
);

-- 7. AUDIT LOGS
CREATE TABLE audit_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id uuid REFERENCES profiles(id),
    action text NOT NULL,
    details jsonb,
    created_at timestamptz DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_trips_date_direction ON trips(trip_date, direction);
CREATE INDEX idx_tickets_qr_token ON tickets(qr_token);

-- RLS POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can SELECT/UPDATE their own row; admin bypasses via service key (implicit)
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Buses: public SELECT; admin can INSERT/UPDATE/DELETE (handled via service key for admin, but we can just allow SELECT for public)
CREATE POLICY "buses_public_select" ON buses FOR SELECT USING (true);

-- Trips: public SELECT (for active trips); admin can INSERT/UPDATE/DELETE
CREATE POLICY "trips_public_select" ON trips FOR SELECT USING (status != 'cancelled');

-- Tickets: students SELECT/UPDATE their own rows only; conductors can UPDATE tickets for their assigned trips; admin full access
CREATE POLICY "tickets_student_select_own" ON tickets FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "tickets_student_update_own" ON tickets FOR UPDATE USING (auth.uid() = student_id);
-- Conductors policy for tickets
CREATE POLICY "tickets_conductor_select" ON tickets FOR SELECT USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = tickets.trip_id AND trips.conductor_id = auth.uid())
);
CREATE POLICY "tickets_conductor_update" ON tickets FOR UPDATE USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = tickets.trip_id AND trips.conductor_id = auth.uid())
);

-- Payments: students SELECT their own; admin full access
CREATE POLICY "payments_student_select_own" ON payments FOR SELECT USING (auth.uid() = student_id);

-- Ticket Transfers: from/to student can SELECT; from_student can INSERT; to_student can UPDATE (accept/reject)
CREATE POLICY "transfers_select" ON ticket_transfers FOR SELECT USING (auth.uid() = from_student_id OR auth.uid() = to_student_id);
CREATE POLICY "transfers_insert_from" ON ticket_transfers FOR INSERT WITH CHECK (auth.uid() = from_student_id);
CREATE POLICY "transfers_update_to" ON ticket_transfers FOR UPDATE USING (auth.uid() = to_student_id);

-- Audit Logs: admin SELECT only; INSERT via service key only
-- (Since admin uses service key, no policies strictly needed, but let's be explicit if admin uses web UI. For backend, service key bypasses RLS).

-- RPC FUNCTIONS

-- book_seat
CREATE OR REPLACE FUNCTION book_seat(p_trip_id uuid, p_student_id uuid, p_payment_id uuid, p_qr_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seats_available int;
    v_ticket_id uuid;
BEGIN
    -- Lock trip row
    SELECT seats_available INTO v_seats_available
    FROM trips
    WHERE id = p_trip_id
    FOR UPDATE;

    IF v_seats_available <= 0 THEN
        RAISE EXCEPTION 'No seats available for this trip';
    END IF;

    -- Decrement seats
    UPDATE trips
    SET seats_available = seats_available - 1
    WHERE id = p_trip_id;

    -- Insert ticket
    INSERT INTO tickets (trip_id, student_id, payment_id, qr_token, status)
    VALUES (p_trip_id, p_student_id, p_payment_id, p_qr_token, 'active')
    RETURNING id INTO v_ticket_id;

    RETURN v_ticket_id;
END;
$$;

-- use_ticket
CREATE OR REPLACE FUNCTION use_ticket(p_qr_token text, p_trip_id uuid, p_conductor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ticket tickets%ROWTYPE;
    v_profile profiles%ROWTYPE;
    v_result jsonb;
BEGIN
    -- Find ticket
    SELECT * INTO v_ticket
    FROM tickets
    WHERE qr_token = p_qr_token FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ticket not found';
    END IF;

    IF v_ticket.status != 'active' THEN
        RAISE EXCEPTION 'Ticket is not active (current status: %)', v_ticket.status;
    END IF;

    IF v_ticket.trip_id != p_trip_id THEN
        RAISE EXCEPTION 'Ticket is for a different trip';
    END IF;

    -- Mark as used
    UPDATE tickets
    SET status = 'used',
        used_at = now(),
        scanned_by = p_conductor_id
    WHERE id = v_ticket.id;

    -- Get student profile
    SELECT * INTO v_profile
    FROM profiles
    WHERE id = v_ticket.student_id;

    v_result := jsonb_build_object(
        'ticket_id', v_ticket.id,
        'student', jsonb_build_object(
            'full_name', v_profile.full_name,
            'roll_number', v_profile.roll_number
        )
    );

    RETURN v_result;
END;
$$;

-- release_seat
CREATE OR REPLACE FUNCTION release_seat(p_ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_trip_id uuid;
BEGIN
    -- Lock ticket
    SELECT trip_id INTO v_trip_id
    FROM tickets
    WHERE id = p_ticket_id AND status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active ticket not found';
    END IF;

    -- Cancel ticket
    UPDATE tickets
    SET status = 'cancelled'
    WHERE id = p_ticket_id;

    -- Increment seats
    UPDATE trips
    SET seats_available = seats_available + 1
    WHERE id = v_trip_id;
END;
$$;

-- transfer_ticket
CREATE OR REPLACE FUNCTION transfer_ticket(p_ticket_id uuid, p_new_student_id uuid, p_new_qr_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_ticket tickets%ROWTYPE;
    v_new_ticket_id uuid;
BEGIN
    -- Lock old ticket
    SELECT * INTO v_old_ticket
    FROM tickets
    WHERE id = p_ticket_id AND status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active ticket not found';
    END IF;

    -- Set old ticket to transferred
    UPDATE tickets
    SET status = 'transferred'
    WHERE id = p_ticket_id;

    -- Create new ticket
    INSERT INTO tickets (trip_id, student_id, payment_id, qr_token, status)
    VALUES (v_old_ticket.trip_id, p_new_student_id, v_old_ticket.payment_id, p_new_qr_token, 'active')
    RETURNING id INTO v_new_ticket_id;

    RETURN v_new_ticket_id;
END;
$$;

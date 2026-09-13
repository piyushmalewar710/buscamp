import express from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { createOrder, verifySignature } from '../lib/razorpay.js';
import { generateQRToken } from '../lib/qr.js';

const router = express.Router();

const bookingLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Too many booking attempts, please try again later.' }
});

router.use(bookingLimiter);
router.use(requireAuth);

/**
 * POST /api/bookings
 * Creates a Razorpay order for a trip seat.
 * Only students can book.
 */
router.post('/', requireRole('student'), async (req, res, next) => {
    try {
        const { trip_id } = req.body;
        if (!trip_id) return res.status(400).json({ error: 'trip_id is required' });

        // 1. Fetch trip
        const { data: trip, error: tripErr } = await supabaseAdmin
            .from('trips')
            .select('*')
            .eq('id', trip_id)
            .single();

        if (tripErr || !trip) return res.status(404).json({ error: 'Trip not found' });

        // 2. Check sale window and availability
        if (trip.status === 'cancelled') return res.status(400).json({ error: 'Trip is cancelled' });
        if (trip.seats_available <= 0) return res.status(400).json({ error: 'No seats available' });

        const now = new Date();
        const opensAt = new Date(trip.sale_opens_at);
        const closesAt = new Date(trip.sale_closes_at);
        if (now < opensAt || now > closesAt) {
            return res.status(400).json({ error: 'Sale window is closed for this trip' });
        }

        // 3. Check student doesn't already have an active ticket
        const { data: existingTicket } = await supabaseAdmin
            .from('tickets')
            .select('id')
            .eq('trip_id', trip_id)
            .eq('student_id', req.user.id)
            .eq('status', 'active')
            .maybeSingle();

        if (existingTicket) {
            return res.status(400).json({ error: 'You already have an active ticket for this trip' });
        }

        // 4. Create Razorpay order (amount in paise)
        const amountPaise = Math.round(trip.price * 100);
        const order = await createOrder(amountPaise, 'INR', `trip_${trip_id}_student_${req.user.id}`);

        // 5. Record payment as 'created' in DB
        const { data: payment, error: paymentErr } = await supabaseAdmin
            .from('payments')
            .insert([{
                razorpay_order_id: order.id,
                amount: trip.price,
                currency: 'INR',
                status: 'created',
                student_id: req.user.id,
                trip_id: trip.id
            }])
            .select()
            .single();

        if (paymentErr) throw paymentErr;

        res.json({
            order_id: order.id,
            amount: amountPaise,
            currency: 'INR',
            key_id: process.env.RAZORPAY_KEY_ID,
            payment_id: payment.id   // our internal DB payment ID
        });

    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/bookings/verify  (also reachable as POST /api/payments/verify)
 *
 * Called by the frontend after Razorpay Checkout succeeds.
 * Verifies the Razorpay HMAC signature server-side FIRST.
 * Only after verification does it call book_seat (atomic SQL transaction).
 *
 * SECURITY: Never trust client-reported "payment succeeded."
 */
router.post('/verify', requireRole('student'), async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_id } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !payment_id) {
            return res.status(400).json({ error: 'Missing required payment fields' });
        }

        // --- CRITICAL: Verify Razorpay HMAC signature before touching the DB ---
        const isValid = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid payment signature. Possible tampering detected.' });
        }

        // Update payment record to 'paid'
        const { data: payment, error: updateErr } = await supabaseAdmin
            .from('payments')
            .update({
                status: 'paid',
                razorpay_payment_id,
                razorpay_signature
            })
            .eq('id', payment_id)
            .eq('student_id', req.user.id)   // ownership check
            .select('*, trips(trip_date)')
            .single();

        if (updateErr || !payment) {
            return res.status(400).json({ error: 'Payment record not found or update failed' });
        }

        // Generate a unique random placeholder token for the initial DB insert.
        // We cannot know the ticket_id (DB-generated UUID) before the INSERT,
        // so we use a random value that satisfies the UNIQUE constraint temporarily.
        const placeholderToken = `tmp_${crypto.randomUUID()}`;

        // --- CRITICAL: book_seat uses SELECT FOR UPDATE — prevents overselling ---
        const { data: ticket_id, error: rpcErr } = await supabaseAdmin.rpc('book_seat', {
            p_trip_id: payment.trip_id,
            p_student_id: req.user.id,
            p_payment_id: payment.id,
            p_qr_token: placeholderToken
        });

        if (rpcErr) {
            // Mark payment as failed for admin review (seat booking failed after charge)
            await supabaseAdmin.from('payments').update({ status: 'failed' }).eq('id', payment_id);
            return res.status(400).json({ error: 'Failed to allocate seat: ' + rpcErr.message });
        }

        // Now generate the real cryptographically-signed QR token with the actual ticket_id.
        // The QR payload includes ticket_id + trip_id + expiry — this is what the conductor verifies.
        const { token: final_qr_token } = await generateQRToken(
            ticket_id,
            payment.trip_id,
            payment.trips.trip_date
        );

        // Replace placeholder with the real signed QR token
        await supabaseAdmin
            .from('tickets')
            .update({ qr_token: final_qr_token })
            .eq('id', ticket_id);

        // Audit log
        await supabaseAdmin.from('audit_logs').insert([{
            actor_id: req.user.id,
            action: 'ticket_booked',
            details: { ticket_id, trip_id: payment.trip_id, razorpay_payment_id }
        }]);

        res.json({ ticket_id, qr_token: final_qr_token });

    } catch (err) {
        next(err);
    }
});

export default router;

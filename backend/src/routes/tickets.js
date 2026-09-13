import express from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { generateQRToken } from '../lib/qr.js';
import { createRefund } from '../lib/razorpay.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('student'));

/**
 * GET /api/tickets/mine
 */
router.get('/mine', async (req, res, next) => {
    try {
        const { data: tickets, error } = await supabaseAdmin
            .from('tickets')
            .select(`
                *,
                trips (id, trip_date, departure_time, direction, buses(bus_number))
            `)
            .eq('student_id', req.user.id)
            .order('booked_at', { ascending: false });

        if (error) throw error;

        const today = new Date();
        const todayStr = today.toLocaleString("en-CA", { timeZone: "Asia/Kolkata" }).split(',')[0];

        const categorized = {
            upcoming: [],
            past: [],
            cancelled: []
        };

        for (const t of tickets) {
            let qrDataUrl = null;
            if (t.status === 'active' && t.trips.trip_date >= todayStr) {
                // Generate QR data url
                const resQR = await generateQRToken(t.id, t.trip_id, t.trips.trip_date);
                qrDataUrl = resQR.qrDataUrl;
                // Since token might be needed if they want to display it or if it wasn't properly synced
                t.qr_data_url = qrDataUrl;
                categorized.upcoming.push(t);
            } else if (t.status === 'cancelled') {
                categorized.cancelled.push(t);
            } else {
                categorized.past.push(t);
            }
        }

        res.json(categorized);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/tickets/:id/cancel
 */
router.post('/:id/cancel', async (req, res, next) => {
    try {
        const ticketId = req.params.id;

        const { data: ticket, error: tErr } = await supabaseAdmin
            .from('tickets')
            .select('*, trips(departure_time, trip_date, price), payments(razorpay_payment_id, id)')
            .eq('id', ticketId)
            .eq('student_id', req.user.id)
            .single();

        if (tErr || !ticket) return res.status(404).json({ error: 'Ticket not found' });
        if (ticket.status !== 'active') return res.status(400).json({ error: 'Ticket is not active' });

        // Allowed to cancel anytime before departure 
        // Note: For simplicity and based on user request, just assume ₹2 fee
        const refundAmount = ticket.trips.price - 2;
        if (refundAmount < 0) return res.status(400).json({ error: 'Invalid refund amount' });

        const refundPaise = Math.round(refundAmount * 100);

        let refundId = null;
        if (ticket.payments?.razorpay_payment_id) {
            const refundRes = await createRefund(ticket.payments.razorpay_payment_id, refundPaise);
            refundId = refundRes.id;
        }

        // Call RPC
        const { error: rpcErr } = await supabaseAdmin.rpc('release_seat', { p_ticket_id: ticketId });
        if (rpcErr) throw rpcErr;

        // Update payment
        if (ticket.payments?.id) {
            await supabaseAdmin.from('payments').update({ status: 'refunded' }).eq('id', ticket.payments.id);
        }

        // Log
        await supabaseAdmin.from('audit_logs').insert([{
            actor_id: req.user.id,
            action: 'ticket_cancelled',
            details: { ticket_id: ticketId, refund_id: refundId }
        }]);

        res.json({ refund_id: refundId, refund_amount: refundAmount });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/tickets/:id/transfer
 */
router.post('/:id/transfer', async (req, res, next) => {
    try {
        const ticketId = req.params.id;
        const { to_roll_number } = req.body;

        if (!to_roll_number) return res.status(400).json({ error: 'to_roll_number required' });
        if (to_roll_number === req.user.roll_number) return res.status(400).json({ error: 'Cannot transfer to yourself' });

        const { data: ticket, error: tErr } = await supabaseAdmin
            .from('tickets')
            .select('*, trips(trip_date, departure_time)')
            .eq('id', ticketId)
            .eq('student_id', req.user.id)
            .single();

        if (tErr || !ticket) return res.status(404).json({ error: 'Ticket not found' });
        if (ticket.status !== 'active') return res.status(400).json({ error: 'Ticket is not active' });

        // Find target
        const { data: targetProfile, error: targetErr } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('roll_number', to_roll_number)
            .single();

        if (targetErr || !targetProfile) return res.status(404).json({ error: 'Target student not found' });

        // Check target doesn't already have ticket
        const { data: existingTargetTicket } = await supabaseAdmin
            .from('tickets')
            .select('id')
            .eq('trip_id', ticket.trip_id)
            .eq('student_id', targetProfile.id)
            .eq('status', 'active')
            .maybeSingle();

        if (existingTargetTicket) return res.status(400).json({ error: 'Target student already has a ticket' });

        // Check pending transfers
        const { data: pendingTransfer } = await supabaseAdmin
            .from('ticket_transfers')
            .select('id')
            .eq('ticket_id', ticketId)
            .eq('status', 'pending')
            .maybeSingle();
            
        if (pendingTransfer) return res.status(400).json({ error: 'A pending transfer already exists for this ticket' });

        // Create transfer
        const { data: transfer, error: transErr } = await supabaseAdmin
            .from('ticket_transfers')
            .insert([{
                ticket_id: ticketId,
                from_student_id: req.user.id,
                to_roll_number,
                to_student_id: targetProfile.id,
                status: 'pending'
            }])
            .select('id')
            .single();

        if (transErr) throw transErr;

        await supabaseAdmin.from('audit_logs').insert([{
            actor_id: req.user.id,
            action: 'transfer_initiated',
            details: { transfer_id: transfer.id, ticket_id: ticketId, to: to_roll_number }
        }]);

        res.json({ transfer_id: transfer.id });

    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/transfers/incoming (Mapped under /api/transfers in index.js)
 */
router.get('/incoming', async (req, res, next) => {
    try {
        const { data: transfers, error } = await supabaseAdmin
            .from('ticket_transfers')
            .select(`
                *,
                tickets(trip_id),
                profiles!from_student_id(full_name, roll_number)
            `)
            .eq('to_student_id', req.user.id)
            .eq('status', 'pending');

        if (error) throw error;
        res.json(transfers);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/transfers/:id/accept (Mapped under /api/transfers in index.js)
 */
router.post('/:id/accept', async (req, res, next) => {
    try {
        const transferId = req.params.id;
        
        const { data: transfer, error: trErr } = await supabaseAdmin
            .from('ticket_transfers')
            .select('*, tickets(trip_id, trips(trip_date))')
            .eq('id', transferId)
            .eq('to_student_id', req.user.id)
            .eq('status', 'pending')
            .single();

        if (trErr || !transfer) return res.status(404).json({ error: 'Transfer not found or not pending' });

        // Use a unique random placeholder so the UNIQUE constraint on qr_token is satisfied
        // during the RPC insert. We'll replace it with the real signed token immediately after.
        const tempPlaceholder = `tmp_${crypto.randomUUID()}`;
        const { token: new_qr_token } = { token: tempPlaceholder };

        const { data: new_ticket_id, error: rpcErr } = await supabaseAdmin.rpc('transfer_ticket', {
            p_ticket_id: transfer.ticket_id,
            p_new_student_id: req.user.id,
            p_new_qr_token: new_qr_token
        });

        if (rpcErr) return res.status(400).json({ error: rpcErr.message });

        // Update token properly
        const { token: final_qr_token } = await generateQRToken(new_ticket_id, transfer.tickets.trip_id, transfer.tickets.trips.trip_date);
        await supabaseAdmin.from('tickets').update({ qr_token: final_qr_token }).eq('id', new_ticket_id);

        await supabaseAdmin.from('ticket_transfers').update({
            status: 'accepted',
            resolved_at: new Date().toISOString()
        }).eq('id', transferId);

        await supabaseAdmin.from('audit_logs').insert([{
            actor_id: req.user.id,
            action: 'transfer_accepted',
            details: { transfer_id: transferId, old_ticket: transfer.ticket_id, new_ticket: new_ticket_id }
        }]);

        res.json({ new_ticket_id, qr_token: final_qr_token });

    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/transfers/:id/reject
 */
router.post('/:id/reject', async (req, res, next) => {
    try {
        const transferId = req.params.id;
        
        const { data: transfer, error: trErr } = await supabaseAdmin
            .from('ticket_transfers')
            .update({ status: 'rejected', resolved_at: new Date().toISOString() })
            .eq('id', transferId)
            .eq('to_student_id', req.user.id)
            .eq('status', 'pending')
            .select()
            .single();

        if (trErr || !transfer) return res.status(404).json({ error: 'Transfer not found or not pending' });

        await supabaseAdmin.from('audit_logs').insert([{
            actor_id: req.user.id,
            action: 'transfer_rejected',
            details: { transfer_id: transferId }
        }]);

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

export default router;

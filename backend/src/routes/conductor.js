import express from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { verifyQRToken } from '../lib/qr.js';

const router = express.Router();

const scanLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: 'Too many scans, please try again later.' }
});

router.use(requireAuth);
router.use(requireRole('conductor'));

/**
 * GET /api/conductor/trips/today
 */
router.get('/trips/today', async (req, res, next) => {
    try {
        const today = new Date();
        const dateStr = today.toLocaleString("en-CA", { timeZone: "Asia/Kolkata" }).split(',')[0];

        const { data: trips, error } = await supabaseAdmin
            .from('trips')
            .select(`
                *,
                buses(bus_number, capacity),
                tickets(id, status)
            `)
            .eq('conductor_id', req.user.id)
            .eq('trip_date', dateStr);

        if (error) throw error;

        const results = trips.map(t => {
            const activeTickets = t.tickets.filter(tk => tk.status === 'active').length;
            const usedTickets = t.tickets.filter(tk => tk.status === 'used').length;
            
            // Clean up tickets array from response
            const { tickets, ...tripData } = t;
            return {
                ...tripData,
                active_tickets: activeTickets,
                used_tickets: usedTickets
            };
        });

        res.json(results);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/conductor/scan
 */
router.post('/scan', scanLimiter, async (req, res, next) => {
    try {
        const { qr_token, trip_id } = req.body;
        if (!qr_token || !trip_id) return res.status(400).json({ error: 'Missing qr_token or trip_id' });

        // 1. Verify QR locally first
        const verification = verifyQRToken(qr_token);
        if (!verification.valid) {
            return res.status(400).json({ error: 'Invalid QR code: ' + verification.reason });
        }

        // 2. Check conductor assigned
        const { data: trip } = await supabaseAdmin
            .from('trips')
            .select('conductor_id')
            .eq('id', trip_id)
            .single();

        if (!trip || trip.conductor_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized for this trip' });
        }

        // 3. Call RPC
        const { data: result, error: rpcErr } = await supabaseAdmin.rpc('use_ticket', {
            p_qr_token: qr_token,
            p_trip_id: trip_id,
            p_conductor_id: req.user.id
        });

        if (rpcErr) {
            return res.status(400).json({ error: rpcErr.message });
        }

        await supabaseAdmin.from('audit_logs').insert([{
            actor_id: req.user.id,
            action: 'ticket_scanned',
            details: { ticket_id: result.ticket_id, trip_id }
        }]);

        res.json({ success: true, student: result.student });

    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/conductor/manual-verify
 */
router.post('/manual-verify', async (req, res, next) => {
    try {
        const { roll_number, trip_id } = req.body;
        if (!roll_number || !trip_id) return res.status(400).json({ error: 'Missing roll_number or trip_id' });

        // Check assigned
        const { data: trip } = await supabaseAdmin
            .from('trips')
            .select('conductor_id')
            .eq('id', trip_id)
            .single();

        if (!trip || trip.conductor_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized for this trip' });
        }

        // Find active ticket for this roll_number on this trip
        const { data: ticketData, error: tErr } = await supabaseAdmin
            .from('tickets')
            .select('id, profiles!inner(id, full_name, roll_number)')
            .eq('trip_id', trip_id)
            .eq('status', 'active')
            .eq('profiles.roll_number', roll_number)
            .maybeSingle();

        if (tErr || !ticketData) {
            return res.status(404).json({ error: 'Active ticket not found for this roll number' });
        }

        // Mark used
        const { error: updErr } = await supabaseAdmin
            .from('tickets')
            .update({
                status: 'used',
                manual_override: true,
                used_at: new Date().toISOString(),
                scanned_by: req.user.id
            })
            .eq('id', ticketData.id);

        if (updErr) throw updErr;

        await supabaseAdmin.from('audit_logs').insert([{
            actor_id: req.user.id,
            action: 'manual_override',
            details: { ticket_id: ticketData.id, trip_id, roll_number }
        }]);

        res.json({
            success: true,
            student: { full_name: ticketData.profiles.full_name, roll_number },
            ticket_id: ticketData.id
        });

    } catch (err) {
        next(err);
    }
});

export default router;

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { stringify } from 'csv-stringify';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

// Helper for audit logs
const logAdminAction = async (adminId, action, details) => {
    await supabaseAdmin.from('audit_logs').insert([{
        actor_id: adminId,
        action,
        details
    }]);
};

// --- BUSES CRUD ---

router.get('/buses', async (req, res, next) => {
    try {
        const { data, error } = await supabaseAdmin.from('buses').select('*');
        if (error) throw error;
        res.json(data);
    } catch(err) { next(err); }
});

router.post('/buses', async (req, res, next) => {
    try {
        const { bus_number, capacity, contractor_name } = req.body;
        if (!bus_number || !capacity || capacity <= 0) {
            return res.status(400).json({ error: 'Invalid bus data' });
        }

        const { data, error } = await supabaseAdmin
            .from('buses')
            .insert([{ bus_number, capacity, contractor_name }])
            .select()
            .single();

        if (error) throw error;
        await logAdminAction(req.user.id, 'create_bus', { bus_id: data.id, bus_number });
        res.status(201).json(data);
    } catch(err) { next(err); }
});

router.put('/buses/:id', async (req, res, next) => {
    try {
        const { bus_number, capacity, contractor_name } = req.body;
        const { data, error } = await supabaseAdmin
            .from('buses')
            .update({ bus_number, capacity, contractor_name })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        await logAdminAction(req.user.id, 'update_bus', { bus_id: data.id });
        res.json(data);
    } catch(err) { next(err); }
});

router.delete('/buses/:id', async (req, res, next) => {
    try {
        // Check future trips
        const { data: trips } = await supabaseAdmin
            .from('trips')
            .select('id')
            .eq('bus_id', req.params.id)
            .gte('trip_date', new Date().toISOString().split('T')[0]);
            
        if (trips && trips.length > 0) {
            return res.status(400).json({ error: 'Cannot delete bus with future trips' });
        }

        const { error } = await supabaseAdmin.from('buses').delete().eq('id', req.params.id);
        if (error) throw error;
        await logAdminAction(req.user.id, 'delete_bus', { bus_id: req.params.id });
        res.json({ success: true });
    } catch(err) { next(err); }
});

// --- TRIPS CRUD ---

router.get('/trips', async (req, res, next) => {
    try {
        let date = req.query.date;
        if (!date) {
            const today = new Date();
            date = today.toLocaleString("en-CA", { timeZone: "Asia/Kolkata" }).split(',')[0];
        }

        const { data, error } = await supabaseAdmin
            .from('trips')
            .select('*, buses(bus_number), profiles:conductor_id(full_name)')
            .eq('trip_date', date);

        if (error) throw error;
        res.json(data);
    } catch(err) { next(err); }
});

router.post('/trips', async (req, res, next) => {
    try {
        const { bus_id, direction, trip_date, departure_time, price, total_seats, conductor_id, sale_opens_at, sale_closes_at } = req.body;
        
        let opens = sale_opens_at;
        let closes = sale_closes_at;
        
        // Defaults to today 13:00 IST to 22:00 IST
        if (!opens || !closes) {
            const d = new Date(trip_date);
            const todayStr = d.toLocaleString("en-US", {timeZone: "Asia/Kolkata"});
            const todayBase = new Date(todayStr);
            
            if(!opens) {
                const so = new Date(todayBase);
                so.setHours(13, 0, 0, 0);
                opens = so.toISOString();
            }
            if(!closes) {
                const sc = new Date(todayBase);
                sc.setHours(22, 0, 0, 0);
                closes = sc.toISOString();
            }
        }

        const { data, error } = await supabaseAdmin
            .from('trips')
            .insert([{
                bus_id, direction, trip_date, departure_time, price: price || 20, 
                total_seats, seats_available: total_seats, conductor_id, 
                sale_opens_at: opens, sale_closes_at: closes
            }])
            .select()
            .single();

        if (error) throw error;
        await logAdminAction(req.user.id, 'create_trip', { trip_id: data.id });
        res.status(201).json(data);
    } catch(err) { next(err); }
});

router.put('/trips/:id', async (req, res, next) => {
    try {
        const { error } = await supabaseAdmin
            .from('trips')
            .update(req.body)
            .eq('id', req.params.id);

        if (error) throw error;
        await logAdminAction(req.user.id, 'update_trip', { trip_id: req.params.id, updates: req.body });
        res.json({ success: true });
    } catch(err) { next(err); }
});

router.delete('/trips/:id', async (req, res, next) => {
    try {
        const { data: trip } = await supabaseAdmin
            .from('trips')
            .select('status, total_seats, seats_available')
            .eq('id', req.params.id)
            .single();

        if (!trip) return res.status(404).json({ error: 'Trip not found' });
        if (trip.status !== 'scheduled') return res.status(400).json({ error: 'Only scheduled trips can be deleted' });
        if (trip.total_seats !== trip.seats_available) return res.status(400).json({ error: 'Cannot delete trip with sold tickets' });

        const { error } = await supabaseAdmin.from('trips').delete().eq('id', req.params.id);
        if (error) throw error;
        await logAdminAction(req.user.id, 'delete_trip', { trip_id: req.params.id });
        res.json({ success: true });
    } catch(err) { next(err); }
});

// --- TRAVELLERS ---

router.get('/travellers', async (req, res, next) => {
    try {
        const { date, trip_id, format } = req.query;
        let query = supabaseAdmin
            .from('tickets')
            .select(`
                id, booked_at, status,
                profiles(roll_number, full_name, department),
                trips!inner(id, trip_date, direction, departure_time)
            `)
            .eq('status', 'active');
            
        if (trip_id) query = query.eq('trip_id', trip_id);
        if (date) query = query.eq('trips.trip_date', date);

        const { data, error } = await query;
        if (error) throw error;

        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="travellers.csv"');
            
            const stringifier = stringify({
                header: true,
                columns: ['roll_number', 'full_name', 'department', 'direction', 'departure_time', 'booking_time']
            });
            
            stringifier.pipe(res);
            data.forEach(t => {
                stringifier.write([
                    t.profiles.roll_number,
                    t.profiles.full_name,
                    t.profiles.department,
                    t.trips.direction,
                    t.trips.departure_time,
                    t.booked_at
                ]);
            });
            stringifier.end();
        } else {
            res.json(data);
        }
    } catch(err) { next(err); }
});

// --- LOGS ---

router.get('/logs', async (req, res, next) => {
    try {
        const { action, limit = 50, offset = 0 } = req.query;
        let query = supabaseAdmin
            .from('audit_logs')
            .select('*, profiles:actor_id(full_name, email)')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (action) query = query.eq('action', action);

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch(err) { next(err); }
});

// --- CONDUCTORS ---

router.post('/conductors', async (req, res, next) => {
    try {
        const { email, full_name } = req.body;
        if (!email || !full_name) return res.status(400).json({ error: 'Email and full_name required' });

        const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            email_confirm: true,
            password: Math.random().toString(36).slice(-8), // random password
            user_metadata: { full_name }
        });

        if (authErr) throw authErr;

        // Profile might be created via trigger or not, we force update it
        await supabaseAdmin.from('profiles').upsert([{
            id: authData.user.id,
            email,
            full_name,
            role: 'conductor',
            roll_number: 'COND_' + Math.random().toString(36).substring(2,8) // Generate dummy roll for conductors
        }]);

        await logAdminAction(req.user.id, 'create_conductor', { conductor_id: authData.user.id, email });
        
        // We'd ideally send a magic link here, let's just return success
        res.status(201).json({ success: true, conductor_id: authData.user.id });
    } catch(err) { next(err); }
});

router.get('/conductors', async (req, res, next) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('role', 'conductor');
        if (error) throw error;
        res.json(data);
    } catch(err) { next(err); }
});

export default router;

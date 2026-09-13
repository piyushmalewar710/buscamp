import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = express.Router();

/**
 * GET /api/trips?date=YYYY-MM-DD&direction=college_to_city|city_to_college
 * Publicly accessible list of active trips for a date.
 */
router.get('/', async (req, res, next) => {
    try {
        let { date, direction } = req.query;
        
        // If date not provided, use today IST
        if (!date) {
            const today = new Date();
            date = today.toLocaleString("en-CA", { timeZone: "Asia/Kolkata" }).split(',')[0];
        }

        let query = supabaseAdmin
            .from('trips')
            .select(`
                id, direction, trip_date, departure_time, price, 
                seats_available, total_seats, status, sale_opens_at, sale_closes_at,
                buses(bus_number, capacity),
                profiles:conductor_id(full_name)
            `)
            .eq('trip_date', date)
            .neq('status', 'cancelled');
            
        if (direction) {
            query = query.eq('direction', direction);
        }

        const { data: trips, error } = await query;

        if (error) throw error;

        const now = new Date(); // UTC time of server
        
        // Filter those where now is between sale_opens_at and sale_closes_at
        const filteredTrips = trips.filter(trip => {
            const opensAt = new Date(trip.sale_opens_at);
            const closesAt = new Date(trip.sale_closes_at);
            return now >= opensAt && now <= closesAt;
        }).map(trip => ({
            id: trip.id,
            direction: trip.direction,
            trip_date: trip.trip_date,
            departure_time: trip.departure_time,
            price: trip.price,
            seats_available: trip.seats_available,
            total_seats: trip.total_seats,
            status: trip.status,
            buses: trip.buses,
            conductor_name: trip.profiles ? trip.profiles.full_name : null
        }));

        res.json(filteredTrips);

    } catch (err) {
        next(err);
    }
});

export default router;

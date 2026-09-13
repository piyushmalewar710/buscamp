import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';

import tripsRouter from './routes/trips.js';
import bookingsRouter from './routes/bookings.js';
import ticketsRouter from './routes/tickets.js';
import conductorRouter from './routes/conductor.js';
import adminRouter from './routes/admin.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS
app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    credentials: true
}));

app.use(express.json());

// Global Rate Limiter: 100 req / 15 min per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});
app.use(globalLimiter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Routers
app.use('/api/trips', tripsRouter);
app.use('/api/bookings', bookingsRouter);
// /api/payments/verify is called by the frontend after Razorpay checkout
// the verify handler lives in bookingsRouter at POST /verify
app.use('/api/payments', bookingsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/transfers', ticketsRouter);
app.use('/api/conductor', conductorRouter);
app.use('/api/admin', adminRouter);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

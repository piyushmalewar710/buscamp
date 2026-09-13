import crypto from 'crypto';
import QRCode from 'qrcode';

const SECRET = process.env.QR_SECRET || 'a_long_random_secret_for_qr_hmac_signing_change_this';

/**
 * Generate a JWT-like QR token and a QR Code Data URL.
 */
export const generateQRToken = async (ticketId, tripId, tripDate) => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    
    // Set expiration to midnight of the trip date (next day essentially)
    // Assume tripDate is a string YYYY-MM-DD
    let expDate = new Date(tripDate);
    if(isNaN(expDate.getTime())) {
        expDate = new Date(); // fallback
    }
    expDate.setHours(23, 59, 59, 999);
    const exp = Math.floor(expDate.getTime() / 1000);

    const payloadObj = { ticket_id: ticketId, trip_id: tripId, exp };
    const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
    
    const signatureInput = `${header}.${payload}`;
    const hmac = crypto.createHmac('sha256', SECRET);
    hmac.update(signatureInput);
    const signature = hmac.digest('base64url');
    
    const token = `${signatureInput}.${signature}`;
    
    // Generate QR Image Data URL
    const qrDataUrl = await QRCode.toDataURL(token);
    
    return { token, qrDataUrl };
};

/**
 * Verify the QR token.
 */
export const verifyQRToken = (token) => {
    if (!token || typeof token !== 'string') {
        return { valid: false, reason: 'Invalid token format' };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
        return { valid: false, reason: 'Malformed token' };
    }

    const [header, payload, signature] = parts;
    const signatureInput = `${header}.${payload}`;
    
    const hmac = crypto.createHmac('sha256', SECRET);
    hmac.update(signatureInput);
    const expectedSignature = hmac.digest('base64url');
    
    // Constant time comparison
    try {
        if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
            return { valid: false, reason: 'Invalid signature' };
        }
    } catch(e) {
        return { valid: false, reason: 'Invalid signature format' };
    }

    let decodedPayload;
    try {
        decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch(e) {
        return { valid: false, reason: 'Invalid payload' };
    }

    const now = Math.floor(Date.now() / 1000);
    if (decodedPayload.exp && decodedPayload.exp < now) {
        return { valid: false, reason: 'Token expired' };
    }

    return { 
        valid: true, 
        ticketId: decodedPayload.ticket_id, 
        tripId: decodedPayload.trip_id 
    };
};

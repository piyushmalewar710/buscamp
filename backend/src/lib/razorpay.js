import Razorpay from 'razorpay';
import crypto from 'crypto';
import 'dotenv/config';

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

let razorpayInstance = null;

if (key_id && key_secret) {
    razorpayInstance = new Razorpay({
        key_id,
        key_secret
    });
}

export const createOrder = async (amount, currency = 'INR', receipt) => {
    if (!razorpayInstance) throw new Error("Razorpay not configured");
    
    const options = {
        amount, // amount in smallest currency unit (paise)
        currency,
        receipt
    };
    return await razorpayInstance.orders.create(options);
};

export const verifySignature = (orderId, paymentId, signature) => {
    if (!key_secret) return false;
    
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
        .createHmac('sha256', key_secret)
        .update(body.toString())
        .digest('hex');
        
    return expectedSignature === signature;
};

export const createRefund = async (paymentId, amountPaise) => {
    if (!razorpayInstance) throw new Error("Razorpay not configured");
    
    return await razorpayInstance.payments.refund(paymentId, {
        amount: amountPaise
    });
};

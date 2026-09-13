import { supabaseAnon, supabaseAdmin } from '../lib/supabase.js';

export const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid token' });
        }

        const token = authHeader.split(' ')[1];
        
        // Verify token with Supabase
        const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        // Fetch profile
        const { data: profile, error: profileErr } = await supabaseAdmin
            .from('profiles')
            .select('id, email, role, full_name, roll_number')
            .eq('id', user.id)
            .single();

        if (profileErr || !profile) {
            return res.status(401).json({ error: 'User profile not found' });
        }

        req.user = profile;
        next();
    } catch (err) {
        next(err);
    }
};

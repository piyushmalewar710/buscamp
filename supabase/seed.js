import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: '../backend/.env.example' }); // Adjust if needed

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runSeed() {
  console.log("Starting seed...");

  try {
    // 1. Create Admin
    const { data: adminUser, error: adminErr } = await supabase.auth.admin.createUser({
      email: 'admin@buscamp.local',
      email_confirm: true,
      password: 'password123',
      user_metadata: { full_name: 'Demo Admin' }
    });
    
    if (adminErr) {
        if(adminErr.message.includes('already exists')) {
            console.log("Admin user already exists, skipping creation");
        } else {
            throw adminErr;
        }
    } else {
        console.log("Created admin user:", adminUser.user.id);
        const { error: adminProfileErr } = await supabase.from('profiles').update({
            role: 'admin',
            full_name: 'Demo Admin',
            roll_number: 'ADMIN001'
        }).eq('id', adminUser.user.id);
        
        if(adminProfileErr) console.error("Error updating admin profile:", adminProfileErr.message);
    }

    // 2. Create Conductor
    const { data: condUser, error: condErr } = await supabase.auth.admin.createUser({
      email: 'conductor@buscamp.local',
      email_confirm: true,
      password: 'password123',
      user_metadata: { full_name: 'Demo Conductor' }
    });

    let conductorId = null;
    
    if (condErr) {
         if(condErr.message.includes('already exists')) {
            console.log("Conductor user already exists, trying to fetch");
            const { data: users } = await supabase.auth.admin.listUsers();
            const existingCond = users.users.find(u => u.email === 'conductor@buscamp.local');
            if(existingCond) conductorId = existingCond.id;
        } else {
            throw condErr;
        }
    } else {
        conductorId = condUser.user.id;
        console.log("Created conductor user:", conductorId);
        const { error: condProfileErr } = await supabase.from('profiles').update({
            role: 'conductor',
            full_name: 'Demo Conductor',
            roll_number: 'COND001'
        }).eq('id', conductorId);
        if(condProfileErr) console.error("Error updating conductor profile:", condProfileErr.message);
    }

    // 3. Create Bus
    const { data: busData, error: busErr } = await supabase.from('buses').insert([{
        bus_number: 'MP09 GA 1234',
        capacity: 40,
        contractor_name: 'Demo Contractor'
    }]).select().single();

    if (busErr) throw busErr;
    console.log("Created bus:", busData.id);

    // 4. Create Trip
    const today = new Date();
    // Use IST timezone string
    const todayStr = today.toLocaleString("en-CA", { timeZone: "Asia/Kolkata" }).split(',')[0];
    const todayBase = new Date(today.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    
    const saleOpens = new Date(todayBase);
    saleOpens.setHours(13, 0, 0, 0);
    
    const saleCloses = new Date(todayBase);
    saleCloses.setHours(22, 0, 0, 0);

    const { data: tripData, error: tripErr } = await supabase.from('trips').insert([{
        bus_id: busData.id,
        direction: 'college_to_city',
        trip_date: todayStr,
        departure_time: '17:00:00',
        price: 20,
        total_seats: 40,
        seats_available: 40,
        conductor_id: conductorId, // Might be null if previous step failed differently, handle accordingly
        sale_opens_at: saleOpens.toISOString(),
        sale_closes_at: saleCloses.toISOString(),
        status: 'scheduled'
    }]).select().single();

    if (tripErr) throw tripErr;
    console.log("Created trip:", tripData.id);

    console.log("Seed completed successfully!");

  } catch (error) {
    console.error("Seed failed:", error);
  }
}

runSeed();

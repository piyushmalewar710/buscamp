import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// FIX: point at the real .env, not the .env.example template.
// .env.example should only ever contain placeholder values.
dotenv.config({ path: '../backend/.env' });

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

// Helper: does this createUser error just mean "already exists"?
function isAlreadyExistsError(err) {
  return (
    err?.code === 'email_exists' ||
    err?.status === 422 ||
    err?.message?.toLowerCase().includes('already been registered') ||
    err?.message?.toLowerCase().includes('already exists')
  );
}

async function findUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find(u => u.email === email) || null;
}

async function runSeed() {
  console.log("Starting seed...");

  try {
    // 1. Create Admin
    let adminId = null;
    const { data: adminUser, error: adminErr } = await supabase.auth.admin.createUser({
      email: 'admin@buscamp.local',
      email_confirm: true,
      password: 'password123',
      user_metadata: { full_name: 'Demo Admin' }
    });

    if (adminErr) {
      if (isAlreadyExistsError(adminErr)) {
        console.log("Admin user already exists, fetching existing user");
        const existingAdmin = await findUserByEmail('admin@buscamp.local');
        if (existingAdmin) adminId = existingAdmin.id;
      } else {
        throw adminErr;
      }
    } else {
      adminId = adminUser.user.id;
      console.log("Created admin user:", adminId);
    }

    if (adminId) {
      // Use upsert, not update: auth.admin.createUser() does NOT create a
      // matching profiles row (that only happens client-side, via the
      // profiles_insert_own RLS policy, when the user themselves logs in).
      // Service role bypasses RLS, so this insert is safe here.
      const { error: adminProfileErr } = await supabase.from('profiles').upsert({
        id: adminId,
        role: 'admin',
        full_name: 'Demo Admin',
        roll_number: 'ADMIN001'
      });

      if (adminProfileErr) console.error("Error upserting admin profile:", adminProfileErr.message);
    }

    // 2. Create Conductor
    let conductorId = null;
    const { data: condUser, error: condErr } = await supabase.auth.admin.createUser({
      email: 'conductor@buscamp.local',
      email_confirm: true,
      password: 'password123',
      user_metadata: { full_name: 'Demo Conductor' }
    });

    if (condErr) {
      if (isAlreadyExistsError(condErr)) {
        console.log("Conductor user already exists, fetching existing user");
        const existingCond = await findUserByEmail('conductor@buscamp.local');
        if (existingCond) conductorId = existingCond.id;
      } else {
        throw condErr;
      }
    } else {
      conductorId = condUser.user.id;
      console.log("Created conductor user:", conductorId);
    }

    if (conductorId) {
      const { error: condProfileErr } = await supabase.from('profiles').upsert({
        id: conductorId,
        role: 'conductor',
        full_name: 'Demo Conductor',
        roll_number: 'COND001'
      });
      if (condProfileErr) console.error("Error upserting conductor profile:", condProfileErr.message);
    }

    // 3. Create Bus (skip if one with this bus_number already exists)
    let busData;
    const { data: existingBus } = await supabase
      .from('buses')
      .select('*')
      .eq('bus_number', 'MP09 GA 1234')
      .maybeSingle();

    if (existingBus) {
      console.log("Bus already exists, reusing:", existingBus.id);
      busData = existingBus;
    } else {
      const { data: newBus, error: busErr } = await supabase.from('buses').insert([{
        bus_number: 'MP09 GA 1234',
        capacity: 40,
        contractor_name: 'Demo Contractor'
      }]).select().single();

      if (busErr) throw busErr;
      console.log("Created bus:", newBus.id);
      busData = newBus;
    }

    // 4. Create Trips (skip any that already exist for today).
    // Seeds trips in BOTH directions so the dashboard's direction toggle
    // has something to show either way. Sale window always spans a full
    // day (00:00-23:59 IST) so a trip is never accidentally seeded outside
    // its own bookable window, no matter what time you run this script.
    const today = new Date();
    const todayStr = today.toLocaleString("en-CA", { timeZone: "Asia/Kolkata" }).split(',')[0];
    const todayBase = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

    const saleOpens = new Date(todayBase);
    saleOpens.setHours(0, 0, 0, 0);

    const saleCloses = new Date(todayBase);
    saleCloses.setHours(23, 59, 0, 0);

    const tripsToSeed = [
      { direction: 'college_to_city', departure_time: '09:00:00' },
      { direction: 'college_to_city', departure_time: '17:00:00' },
      { direction: 'city_to_college', departure_time: '08:00:00' },
      { direction: 'city_to_college', departure_time: '18:00:00' },
    ];

    for (const t of tripsToSeed) {
      const { data: existingTrip } = await supabase
        .from('trips')
        .select('id')
        .eq('bus_id', busData.id)
        .eq('trip_date', todayStr)
        .eq('departure_time', t.departure_time)
        .eq('direction', t.direction)
        .maybeSingle();

      if (existingTrip) {
        console.log(`Trip already exists (${t.direction} @ ${t.departure_time}), skipping:`, existingTrip.id);
        continue;
      }

      const { data: tripData, error: tripErr } = await supabase.from('trips').insert([{
        bus_id: busData.id,
        direction: t.direction,
        trip_date: todayStr,
        departure_time: t.departure_time,
        price: 20,
        total_seats: 40,
        seats_available: 40,
        conductor_id: conductorId,
        sale_opens_at: saleOpens.toISOString(),
        sale_closes_at: saleCloses.toISOString(),
        status: 'scheduled'
      }]).select().single();

      if (tripErr) throw tripErr;
      console.log(`Created trip (${t.direction} @ ${t.departure_time}):`, tripData.id);
    }

    console.log("Seed completed successfully!");

  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

runSeed();
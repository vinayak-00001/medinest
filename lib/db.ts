import { randomUUID } from "node:crypto";

import { Pool, PoolClient, QueryResultRow } from "pg";

import { hashPassword } from "@/lib/security";

declare global {
  var medinestPool: Pool | undefined;
  var medinestBootstrapPromise: Promise<void> | undefined;
}

function getDatabaseUrl() {
  return process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/medinest";
}

function getPool() {
  if (!global.medinestPool) {
    global.medinestPool = new Pool({
      connectionString: getDatabaseUrl(),
      allowExitOnIdle: true
    });
  }

  return global.medinestPool;
}

const schemaSql = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_accounts (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password TEXT,
  password_hash TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clinics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS doctor_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  specialty TEXT NOT NULL,
  experience_years INTEGER NOT NULL DEFAULT 0,
  rating DOUBLE PRECISION NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  avatar_url TEXT,
  languages TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  consultation_modes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  fee_inr INTEGER NOT NULL DEFAULT 0,
  bio TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS doctor_clinics (
  doctor_profile_id TEXT NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  clinic_id TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  PRIMARY KEY (doctor_profile_id, clinic_id)
);

CREATE TABLE IF NOT EXISTS availability_slots (
  id TEXT PRIMARY KEY,
  doctor_profile_id TEXT NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  clinic_id TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_profile_id TEXT NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  clinic_id TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  slot_id TEXT NOT NULL REFERENCES availability_slots(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  symptoms TEXT NOT NULL,
  status TEXT NOT NULL,
  video_call_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id TEXT PRIMARY KEY,
  appointment_id TEXT NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  doctor_profile_id TEXT NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notes TEXT NOT NULL,
  medicines TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_type TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE auth_accounts ALTER COLUMN password DROP NOT NULL;
ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS appointments_active_slot_unique
ON appointments (slot_id)
WHERE status IN ('pending', 'confirmed', 'completed');

DROP INDEX IF EXISTS availability_slots_doctor_time_mode_unique;
CREATE UNIQUE INDEX IF NOT EXISTS availability_slots_doctor_time_unique
ON availability_slots (doctor_profile_id, starts_at);
`;

function baseDate() {
  return new Date();
}

function isoOffset(days: number, hours: number) {
  const now = baseDate();
  const next = new Date(now);
  next.setDate(now.getDate() + days);
  next.setHours(hours, 0, 0, 0);
  return next.toISOString();
}

async function seedDatabase() {
  const pool = getPool();
  const existing = await pool.query("SELECT COUNT(*)::int AS count FROM users");
  if (existing.rows[0]?.count > 0) {
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const users = [
      { id: "u-admin-1", name: "Anika Sharma", email: "admin@medinest.com", phone: "+91 90000 11111", role: "admin" },
      { id: "u-doc-1", name: "Dr. Aarav Mehta", email: "aarav@medinest.com", phone: "+91 90000 22221", role: "doctor" },
      { id: "u-doc-2", name: "Dr. Neha Kapoor", email: "neha@medinest.com", phone: "+91 90000 22222", role: "doctor" },
      { id: "u-patient-1", name: "Riya Patel", email: "riya@example.com", phone: "+91 90000 33331", role: "patient" },
      { id: "u-patient-2", name: "Kabir Singh", email: "kabir@example.com", phone: "+91 90000 33332", role: "patient" }
    ];

    for (const user of users) {
      await client.query(
        "INSERT INTO users (id, name, email, phone, role) VALUES ($1, $2, $3, $4, $5)",
        [user.id, user.name, user.email, user.phone, user.role]
      );
    }

    const authAccounts = [
      ["u-admin-1", "admin@medinest.com", "admin123"],
      ["u-doc-1", "aarav@medinest.com", "doctor123"],
      ["u-doc-2", "neha@medinest.com", "doctor123"],
      ["u-patient-1", "riya@example.com", "patient123"],
      ["u-patient-2", "kabir@example.com", "patient123"]
    ];

    for (const [userId, email, password] of authAccounts) {
      await client.query("INSERT INTO auth_accounts (user_id, email, password, password_hash) VALUES ($1, $2, $3, $4)", [
        userId,
        email,
        null,
        await hashPassword(password)
      ]);
    }

    const clinics = [
      ["clinic-1", "Medinest Heart & Family Care", "Mumbai", "17 Marine Health Avenue, Mumbai", "+91 22 4000 1000"],
      ["clinic-2", "Medinest Women & Wellness", "Bengaluru", "44 Cedar Residency Road, Bengaluru", "+91 80 4100 2200"]
    ];

    for (const clinic of clinics) {
      await client.query("INSERT INTO clinics (id, name, city, address, phone) VALUES ($1, $2, $3, $4, $5)", clinic);
    }

    await client.query(
      `INSERT INTO doctor_profiles
        (id, user_id, specialty, experience_years, rating, rating_count, avatar_url, languages, consultation_modes, fee_inr, bio)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8::text[], $9::text[], $10, $11),
        ($12, $13, $14, $15, $16, $17, $18, $19::text[], $20::text[], $21, $22)`,
      [
        "doc-1",
        "u-doc-1",
        "Cardiology",
        14,
        0,
        0,
        "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=600&q=80",
        ["English", "Hindi"],
        ["video", "in-person"],
        1200,
        "Prevention-first cardiologist focused on remote follow-up and practical lifestyle care.",
        "doc-2",
        "u-doc-2",
        "General Medicine",
        9,
        0,
        0,
        "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80",
        ["English", "Hindi", "Kannada"],
        ["video", "in-person"],
        900,
        "Family physician handling routine consultations, fever care, diabetes checks, and ongoing wellness."
      ]
    );

    await client.query(
      "INSERT INTO doctor_clinics (doctor_profile_id, clinic_id) VALUES ($1, $2), ($3, $4), ($5, $6)",
      ["doc-1", "clinic-1", "doc-2", "clinic-1", "doc-2", "clinic-2"]
    );

    const slots = [
      ["slot-1", "doc-1", "clinic-1", isoOffset(1, 9), "video", "available"],
      ["slot-2", "doc-1", "clinic-1", isoOffset(1, 11), "in-person", "booked"],
      ["slot-3", "doc-2", "clinic-1", isoOffset(1, 12), "video", "requested"],
      ["slot-4", "doc-2", "clinic-2", isoOffset(2, 10), "in-person", "available"],
      ["slot-5", "doc-2", "clinic-2", isoOffset(3, 14), "video", "available"]
    ];
    for (const slot of slots) {
      await client.query(
        "INSERT INTO availability_slots (id, doctor_profile_id, clinic_id, starts_at, mode, status) VALUES ($1, $2, $3, $4, $5, $6)",
        slot
      );
    }

    await client.query(
      `INSERT INTO appointments
        (id, patient_id, doctor_profile_id, clinic_id, slot_id, mode, symptoms, status, created_at, updated_at)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10),
        ($11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
      [
        "appt-1",
        "u-patient-1",
        "doc-1",
        "clinic-1",
        "slot-2",
        "in-person",
        "Chest tightness during morning walks and occasional dizziness.",
        "completed",
        isoOffset(-1, 8),
        isoOffset(-1, 14),
        "appt-2",
        "u-patient-2",
        "doc-2",
        "clinic-1",
        "slot-3",
        "video",
        "Mild fever, body pain, and dry cough for two days.",
        "pending",
        isoOffset(0, 7),
        isoOffset(0, 7)
      ]
    );

    await client.query(
      `INSERT INTO prescriptions
        (id, appointment_id, doctor_profile_id, patient_id, medicines, notes, issued_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        "rx-1",
        "appt-1",
        "doc-1",
        "u-patient-1",
        "Aspirin 75 mg once daily; lipid profile after breakfast next week.",
        "Limit high-intensity activity for three days. Book a repeat ECG if dizziness continues.",
        isoOffset(-1, 15)
      ]
    );

    const notifications = [
      [randomUUID(), "u-admin-1", "appointment-requested", "Kabir Singh requested a video consult with Dr. Neha Kapoor."],
      [randomUUID(), "u-patient-2", "appointment-requested", "Your appointment request is pending confirmation."],
      [randomUUID(), "u-doc-1", "prescription-issued", "Prescription created for Riya Patel."],
      [randomUUID(), "u-patient-1", "prescription-issued", "Your prescription from Dr. Aarav Mehta is ready to review."]
    ];
    for (const notification of notifications) {
      await client.query(
        "INSERT INTO notifications (id, user_id, type, message) VALUES ($1, $2, $3, $4)",
        notification
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function migrateLegacyAuthAccounts() {
  const pool = getPool();
  const result = await pool.query("SELECT user_id, password FROM auth_accounts WHERE COALESCE(password, '') <> ''");

  for (const row of result.rows) {
    const legacyPassword = String(row.password ?? "");
    if (!legacyPassword) {
      continue;
    }

    await pool.query("UPDATE auth_accounts SET password_hash = $1, password = NULL WHERE user_id = $2", [
      await hashPassword(legacyPassword),
      String(row.user_id)
    ]);
  }
}

async function deleteExpiredSessions() {
  const pool = getPool();
  await pool.query("DELETE FROM sessions WHERE expires_at <= NOW()");
}

async function normalizeDoctorRatings() {
  const pool = getPool();
  await pool.query("UPDATE doctor_profiles SET rating = 0 WHERE COALESCE(rating_count, 0) = 0");
}

async function refreshDemoAvailabilitySlots() {
  const pool = getPool();
  const refreshes = [
    { id: "slot-1", startsAt: isoOffset(1, 9), status: "available" },
    { id: "slot-2", startsAt: isoOffset(1, 11), status: "booked" },
    { id: "slot-3", startsAt: isoOffset(1, 12), status: "requested" },
    { id: "slot-4", startsAt: isoOffset(2, 10), status: "available" },
    { id: "slot-5", startsAt: isoOffset(3, 14), status: "available" }
  ];

  for (const refresh of refreshes) {
    await pool.query(
      `UPDATE availability_slots
       SET starts_at = $2, status = $3
       WHERE id = $1
         AND starts_at <= NOW()
         AND NOT EXISTS (
           SELECT 1
           FROM appointments a
           WHERE a.slot_id = availability_slots.id
             AND a.status IN ('pending', 'confirmed')
         )`,
      [refresh.id, refresh.startsAt, refresh.status]
    );
  }
}

export async function initDatabase() {
  if (!global.medinestBootstrapPromise) {
    global.medinestBootstrapPromise = (async () => {
      const pool = getPool();
      await pool.query(schemaSql);
      await migrateLegacyAuthAccounts();
      await deleteExpiredSessions();
      await normalizeDoctorRatings();
      await seedDatabase();
      await refreshDemoAvailabilitySlots();
    })();
  }

  return global.medinestBootstrapPromise;
}

export async function dbQuery<T extends QueryResultRow>(text: string, params?: unknown[]) {
  await initDatabase();
  return getPool().query<T>(text, params);
}

export async function dbTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  await initDatabase();
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

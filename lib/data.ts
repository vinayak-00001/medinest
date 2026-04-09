import { randomUUID } from "node:crypto";

import { dbQuery, dbTransaction } from "@/lib/db";
import { insertNotifications, runNotificationHooks } from "@/lib/notifications";
import { createSessionToken, hashPassword, hashSessionToken, SESSION_DURATION_SECONDS, verifyPassword } from "@/lib/security";
import {
  AppointmentRequest,
  AppointmentStatus,
  AppointmentView,
  AvailabilitySlot,
  Clinic,
  ConsultationMode,
  DashboardData,
  DoctorDirectoryItem,
  DoctorProfile,
  Notification,
  NotificationType,
  Prescription,
  Role,
  Session,
  SlotStatus,
  User
} from "@/lib/types";
import { normalizeEmail, validateEmail, validatePassword, validatePhone } from "@/lib/validation";
import {
  canAccessRoleProtectedResource,
  validateAppointmentStatusTransition,
  validateBookingRequest,
  validateDoctorAdminInput,
  validatePrescriptionSubmission
} from "@/lib/workflow-rules";

type DoctorWithUser = DoctorProfile & { user: User };

function mapUser(row: Record<string, unknown>, prefix = ""): User {
  return {
    id: String(row[`${prefix}id`]),
    name: String(row[`${prefix}name`]),
    email: String(row[`${prefix}email`]),
    phone: String(row[`${prefix}phone`]),
    role: row[`${prefix}role`] as Role
  };
}

function mapClinic(row: Record<string, unknown>, prefix = ""): Clinic {
  return {
    id: String(row[`${prefix}id`]),
    name: String(row[`${prefix}name`]),
    city: String(row[`${prefix}city`]),
    address: String(row[`${prefix}address`]),
    phone: String(row[`${prefix}phone`])
  };
}

function mapDoctorProfile(row: Record<string, unknown>, prefix = ""): DoctorProfile {
  return {
    id: String(row[`${prefix}id`]),
    userId: String(row[`${prefix}user_id`]),
    clinicIds: [],
    specialty: String(row[`${prefix}specialty`]),
    experienceYears: Number(row[`${prefix}experience_years`] ?? 0),
    rating: Number(row[`${prefix}rating`] ?? 0),
    ratingCount: Number(row[`${prefix}rating_count`] ?? 0),
    avatarUrl: row[`${prefix}avatar_url`] ? String(row[`${prefix}avatar_url`]) : undefined,
    languages: ((row[`${prefix}languages`] as string[] | null) ?? []).map(String),
    consultationModes: ((row[`${prefix}consultation_modes`] as ConsultationMode[] | null) ?? []).map(
      (mode) => mode as ConsultationMode
    ),
    feeInr: Number(row[`${prefix}fee_inr`] ?? 0),
    bio: String(row[`${prefix}bio`] ?? "")
  };
}

function mapSlot(row: Record<string, unknown>, prefix = ""): AvailabilitySlot {
  return {
    id: String(row[`${prefix}id`]),
    doctorProfileId: String(row[`${prefix}doctor_profile_id`]),
    clinicId: String(row[`${prefix}clinic_id`]),
    startsAt: new Date(String(row[`${prefix}starts_at`])).toISOString(),
    mode: row[`${prefix}mode`] as ConsultationMode,
    status: row[`${prefix}status`] as SlotStatus
  };
}

function mapPrescription(row: Record<string, unknown>, prefix = ""): Prescription {
  return {
    id: String(row[`${prefix}id`]),
    appointmentId: String(row[`${prefix}appointment_id`]),
    doctorProfileId: String(row[`${prefix}doctor_profile_id`]),
    patientId: String(row[`${prefix}patient_id`]),
    notes: String(row[`${prefix}notes`] ?? ""),
    medicines: String(row[`${prefix}medicines`] ?? ""),
    attachmentUrl: row[`${prefix}attachment_url`] ? String(row[`${prefix}attachment_url`]) : undefined,
    attachmentName: row[`${prefix}attachment_name`] ? String(row[`${prefix}attachment_name`]) : undefined,
    attachmentType: row[`${prefix}attachment_type`] ? String(row[`${prefix}attachment_type`]) : undefined,
    issuedAt: new Date(String(row[`${prefix}issued_at`])).toISOString()
  };
}

export function buildInternalConsultationLink(appointmentId: string) {
  return `/consultation/${appointmentId}`;
}

export function buildJitsiRoomName(appointmentId: string) {
  return `MediNest-${appointmentId}`;
}

export function buildJitsiUrl(appointmentId: string) {
  return `https://meet.jit.si/${buildJitsiRoomName(appointmentId)}`;
}

export function buildAudioCallLink(appointmentId: string) {
  return `/call/${appointmentId}`;
}

export function buildAudioJitsiUrl(appointmentId: string) {
  return `${buildJitsiUrl(appointmentId)}#config.startWithVideoMuted=true&config.startAudioOnly=true`;
}

export async function getUsers(): Promise<User[]> {
  const result = await dbQuery("SELECT id, name, email, phone, role FROM users ORDER BY created_at ASC");
  return result.rows.map((row: Record<string, unknown>) => mapUser(row));
}

export async function getUserById(userId: string) {
  const result = await dbQuery("SELECT id, name, email, phone, role FROM users WHERE id = $1 LIMIT 1", [userId]);
  return result.rows[0] ? mapUser(result.rows[0]) : undefined;
}

export async function getClinics(): Promise<Clinic[]> {
  const result = await dbQuery("SELECT id, name, city, address, phone FROM clinics ORDER BY name ASC");
  return result.rows.map((row: Record<string, unknown>) => mapClinic(row));
}

export async function saveClinic(input: {
  clinicId?: string;
  name: string;
  city: string;
  address: string;
  phone: string;
}) {
  const name = input.name.trim();
  const city = input.city.trim();
  const address = input.address.trim();
  const phone = input.phone.trim();

  if (!name || !city || !address || !phone) {
    throw new Error("Please fill in all clinic fields.");
  }

  if (!validatePhone(phone)) {
    throw new Error("Please enter a valid clinic phone number.");
  }

  const clinicId = input.clinicId?.trim() || randomUUID();

  if (input.clinicId?.trim()) {
    const existing = await dbQuery("SELECT 1 FROM clinics WHERE id = $1 LIMIT 1", [clinicId]);
    if (!existing.rows[0]) {
      throw new Error("Clinic not found.");
    }

    await dbQuery("UPDATE clinics SET name = $1, city = $2, address = $3, phone = $4 WHERE id = $5", [
      name,
      city,
      address,
      phone,
      clinicId
    ]);
  } else {
    await dbQuery("INSERT INTO clinics (id, name, city, address, phone) VALUES ($1, $2, $3, $4, $5)", [
      clinicId,
      name,
      city,
      address,
      phone
    ]);
  }

  const result = await dbQuery("SELECT id, name, city, address, phone FROM clinics WHERE id = $1 LIMIT 1", [clinicId]);
  return mapClinic(result.rows[0]);
}

export async function authenticateUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const result = await dbQuery(
    `SELECT u.id, u.name, u.email, u.phone, u.role, a.user_id, a.password_hash
     FROM auth_accounts a
     JOIN users u ON u.id = a.user_id
     WHERE LOWER(a.email) = LOWER($1)
     LIMIT 1`,
    [normalizedEmail]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const passwordHash = row.password_hash ? String(row.password_hash) : "";
  if (!passwordHash) {
    return null;
  }

  const isValid = await verifyPassword(password, passwordHash);
  return isValid ? mapUser(row) : null;
}

export async function createSession(userId: string, role: Role) {
  const token = createSessionToken();
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString();

  await dbQuery("INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)", [
    sessionId,
    userId,
    hashSessionToken(token),
    expiresAt
  ]);

  return {
    token,
    session: {
      id: sessionId,
      userId,
      role,
      expiresAt
    } satisfies Session
  };
}

export async function getSessionByToken(token: string) {
  const result = await dbQuery(
    `SELECT s.id, s.user_id, s.expires_at, u.role
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
     LIMIT 1`,
    [hashSessionToken(token)]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const expiresAt = new Date(String(row.expires_at));
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    await dbQuery("DELETE FROM sessions WHERE id = $1", [String(row.id)]);
    return null;
  }

  return {
    id: String(row.id),
    userId: String(row.user_id),
    role: row.role as Role,
    expiresAt: expiresAt.toISOString()
  } satisfies Session;
}

export async function deleteSessionByToken(token: string) {
  await dbQuery("DELETE FROM sessions WHERE token_hash = $1", [hashSessionToken(token)]);
}

async function getAdminUsers() {
  const result = await dbQuery("SELECT id, name, email, phone, role FROM users WHERE role = 'admin'");
  return result.rows.map((row: Record<string, unknown>) => mapUser(row));
}

function createFutureStarts(days: number[], hours: number[]) {
  const now = new Date();
  return days.map((day, index) => {
    const next = new Date(now);
    next.setDate(now.getDate() + day);
    next.setHours(hours[index] ?? 9, 0, 0, 0);
    return next.toISOString();
  });
}

async function createDoctorStarterSlots(doctorProfileId: string, clinicId: string) {
  const starts = createFutureStarts([2, 2, 3], [9, 12, 15]);
  const rows = [
    [randomUUID(), doctorProfileId, clinicId, starts[0], "video", "available"],
    [randomUUID(), doctorProfileId, clinicId, starts[1], "in-person", "available"],
    [randomUUID(), doctorProfileId, clinicId, starts[2], "video", "available"]
  ];

  for (const row of rows) {
    await dbQuery(
      "INSERT INTO availability_slots (id, doctor_profile_id, clinic_id, starts_at, mode, status) VALUES ($1, $2, $3, $4, $5, $6)",
      row
    );
  }
}

export async function registerUser(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
  clinicId?: string;
  specialty?: string;
}) {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const phone = input.phone.trim();
  const password = input.password.trim();

  if (!name || !email || !phone || !password) {
    throw new Error("Please fill in all required fields.");
  }

  if (!validateEmail(email)) {
    throw new Error("Please enter a valid email address.");
  }

  if (!validatePhone(phone)) {
    throw new Error("Please enter a valid phone number.");
  }

  if (!validatePassword(password)) {
    throw new Error("Password must be at least 8 characters and include a letter and a number.");
  }

  const existing = await dbQuery("SELECT 1 FROM auth_accounts WHERE LOWER(email) = LOWER($1) LIMIT 1", [email]);
  if (existing.rows.length) {
    throw new Error("An account with this email already exists.");
  }

  let clinicId = "";
  let specialty = "";

  if (input.role === "doctor") {
    clinicId = input.clinicId?.trim() || "";
    specialty = input.specialty?.trim() || "";

    const clinicCheck = clinicId ? await dbQuery("SELECT 1 FROM clinics WHERE id = $1 LIMIT 1", [clinicId]) : { rows: [] };
    if (!clinicId || !clinicCheck.rows.length) {
      throw new Error("Please choose a valid clinic for the doctor account.");
    }
    if (!specialty) {
      throw new Error("Please provide a specialty for the doctor account.");
    }
  }

  const userId = randomUUID();
  await dbQuery("INSERT INTO users (id, name, email, phone, role) VALUES ($1, $2, $3, $4, $5)", [
    userId,
    name,
    email,
    phone,
    input.role
  ]);
  await dbQuery("INSERT INTO auth_accounts (user_id, email, password, password_hash) VALUES ($1, $2, $3, $4)", [
    userId,
    email,
    null,
    await hashPassword(password)
  ]);

  if (input.role === "doctor") {
    const doctorProfileId = randomUUID();
    await dbQuery(
      `INSERT INTO doctor_profiles
       (id, user_id, specialty, experience_years, rating, rating_count, languages, consultation_modes, fee_inr, bio)
       VALUES ($1, $2, $3, $4, $5, $6, $7::text[], $8::text[], $9, $10)`,
      [
        doctorProfileId,
        userId,
        specialty,
        5,
        0,
        0,
        ["English", "Hindi"],
        ["video", "in-person"],
        800,
        "New doctor profile created from registration."
      ]
    );
    await dbQuery("INSERT INTO doctor_clinics (doctor_profile_id, clinic_id) VALUES ($1, $2)", [doctorProfileId, clinicId]);
    await createDoctorStarterSlots(doctorProfileId, clinicId);
  }

  const welcomeMessage =
    input.role === "patient"
      ? "Welcome to MediNest Care. You can now request your first appointment."
      : input.role === "doctor"
        ? "Doctor account created. Review your dashboard and starter slots."
        : "Admin account created. You can now review appointment requests.";

  const welcomeNotifications = await dbTransaction(async (client) => {
    return insertNotifications(client, [
      {
        userId,
        type: "appointment-confirmed",
        message: welcomeMessage
      }
    ]);
  });

  await runNotificationHooks(welcomeNotifications);

  return getUserById(userId) as Promise<User>;
}

export async function getDoctorDirectory(): Promise<DoctorDirectoryItem[]> {
  const [doctorResult, clinicLinkResult, clinicResult, slotResult] = await Promise.all([
    dbQuery(
      `SELECT
         dp.id,
         dp.user_id,
         dp.specialty,
         dp.experience_years,
         dp.rating,
         dp.rating_count,
         dp.avatar_url,
         dp.languages,
         dp.consultation_modes,
         dp.fee_inr,
         dp.bio,
         u.id AS user_id_ref,
         u.name AS user_name,
         u.email AS user_email,
         u.phone AS user_phone,
         u.role AS user_role
       FROM doctor_profiles dp
       JOIN users u ON u.id = dp.user_id
       ORDER BY u.name ASC`
    ),
    dbQuery("SELECT doctor_profile_id, clinic_id FROM doctor_clinics"),
    dbQuery("SELECT id, name, city, address, phone FROM clinics"),
    dbQuery(
      `SELECT id, doctor_profile_id, clinic_id, starts_at, mode, status
       FROM availability_slots
       WHERE status = 'available'
         AND starts_at > NOW()
       ORDER BY starts_at ASC`
    )
  ]);

  const clinics = clinicResult.rows.map((row: Record<string, unknown>) => mapClinic(row));
  const clinicsById = new Map(clinics.map((clinic: Clinic) => [clinic.id, clinic]));
  const clinicIdsByDoctor = new Map<string, string[]>();
  for (const row of clinicLinkResult.rows) {
    const list = clinicIdsByDoctor.get(String(row.doctor_profile_id)) ?? [];
    list.push(String(row.clinic_id));
    clinicIdsByDoctor.set(String(row.doctor_profile_id), list);
  }

  const slotsByDoctor = new Map<string, AvailabilitySlot[]>();
  for (const row of slotResult.rows) {
    const slot = mapSlot(row);
    const list = slotsByDoctor.get(slot.doctorProfileId) ?? [];
    if (list.length < 3) {
      list.push(slot);
      slotsByDoctor.set(slot.doctorProfileId, list);
    }
  }

  return doctorResult.rows.map((row: Record<string, unknown>) => {
    const doctor = mapDoctorProfile(row);
    const clinicIds = clinicIdsByDoctor.get(doctor.id) ?? [];
    const user: User = {
      id: String(row.user_id_ref),
      name: String(row.user_name),
      email: String(row.user_email),
      phone: String(row.user_phone),
      role: row.user_role as Role
    };

    return {
      doctor: { ...doctor, clinicIds, user },
      clinics: clinicIds.map((id) => clinicsById.get(id)).filter(Boolean) as Clinic[],
      nextSlots: slotsByDoctor.get(doctor.id) ?? []
    };
  });
}

export async function getDoctorProfileByUserId(userId: string) {
  const result = await dbQuery(
    `SELECT
       dp.id,
       dp.user_id,
       dp.specialty,
       dp.experience_years,
       dp.rating,
       dp.rating_count,
       dp.avatar_url,
       dp.languages,
       dp.consultation_modes,
       dp.fee_inr,
       dp.bio,
       u.id AS user_id_ref,
       u.name AS user_name,
       u.email AS user_email,
       u.phone AS user_phone,
       u.role AS user_role
     FROM doctor_profiles dp
     JOIN users u ON u.id = dp.user_id
     WHERE dp.user_id = $1
     LIMIT 1`,
    [userId]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const clinicLinkResult = await dbQuery("SELECT doctor_profile_id, clinic_id FROM doctor_clinics WHERE doctor_profile_id = $1", [String(row.id)]);
  const clinicIds = clinicLinkResult.rows.map((clinicRow) => String(clinicRow.clinic_id));
  const doctor = mapDoctorProfile(row);

  return {
    ...doctor,
    clinicIds,
    user: {
      id: String(row.user_id_ref),
      name: String(row.user_name),
      email: String(row.user_email),
      phone: String(row.user_phone),
      role: row.user_role as Role
    }
  };
}

export async function getAvailabilityForDoctor(doctorProfileId: string) {
  const result = await dbQuery(
    `SELECT id, doctor_profile_id, clinic_id, starts_at, mode, status
     FROM availability_slots
     WHERE doctor_profile_id = $1
     ORDER BY starts_at ASC`,
    [doctorProfileId]
  );

  return result.rows.map((row: Record<string, unknown>) => mapSlot(row));
}

export async function updateDoctorProfile(input: {
  actorUserId: string;
  avatarUrl?: string;
  bio?: string;
  specialty?: string;
  experienceYears?: number;
  feeInr?: number;
  languages?: string[];
}) {
  const profileResult = await dbQuery("SELECT id FROM doctor_profiles WHERE user_id = $1 LIMIT 1", [input.actorUserId]);
  if (!profileResult.rows[0]) {
    throw new Error("Doctor profile not found.");
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (typeof input.avatarUrl === "string") {
    const avatarUrl = input.avatarUrl.trim();
    if (avatarUrl) {
      try {
        const parsed = new URL(avatarUrl);
        if (!["http:", "https:"].includes(parsed.protocol) && !avatarUrl.startsWith("/")) {
          throw new Error("invalid");
        }
      } catch {
        throw new Error("Profile picture must be a valid image URL.");
      }
      values.push(avatarUrl);
    } else {
      values.push(null);
    }
    updates.push(`avatar_url = $${values.length}`);
  }

  if (typeof input.bio === "string") {
    const bio = input.bio.trim();
    if (!bio) {
      throw new Error("Bio cannot be empty.");
    }
    values.push(bio);
    updates.push(`bio = $${values.length}`);
  }

  if (typeof input.specialty === "string") {
    const specialty = input.specialty.trim();
    if (!specialty) {
      throw new Error("Specialty cannot be empty.");
    }
    values.push(specialty);
    updates.push(`specialty = $${values.length}`);
  }

  if (typeof input.experienceYears === "number") {
    if (!Number.isFinite(input.experienceYears) || input.experienceYears < 0 || input.experienceYears > 60) {
      throw new Error("Experience must be between 0 and 60 years.");
    }
    values.push(Math.floor(input.experienceYears));
    updates.push(`experience_years = $${values.length}`);
  }

  if (typeof input.feeInr === "number") {
    if (!Number.isFinite(input.feeInr) || input.feeInr < 0 || input.feeInr > 100000) {
      throw new Error("Consultation fee must be between 0 and 100000.");
    }
    values.push(Math.floor(input.feeInr));
    updates.push(`fee_inr = $${values.length}`);
  }

  if (Array.isArray(input.languages)) {
    const languages = input.languages
      .map((language) => language.trim())
      .filter(Boolean)
      .filter((language, index, list) => list.findIndex((item) => item.toLowerCase() === language.toLowerCase()) === index);

    if (!languages.length) {
      throw new Error("Please add at least one language.");
    }

    if (languages.length > 10) {
      throw new Error("Please keep languages to 10 or fewer entries.");
    }

    values.push(languages);
    updates.push(`languages = $${values.length}::text[]`);
  }

  if (!updates.length) {
    throw new Error("No doctor profile updates were provided.");
  }

  values.push(input.actorUserId);
  await dbQuery(`UPDATE doctor_profiles SET ${updates.join(", ")} WHERE user_id = $${values.length}`, values);

  const refreshed = await getDoctorProfileByUserId(input.actorUserId);
  if (!refreshed) {
    throw new Error("Doctor profile was updated but could not be reloaded.");
  }

  return refreshed;
}

export async function adminUpdateDoctor(input: {
  doctorUserId: string;
  name: string;
  phone: string;
  specialty: string;
  experienceYears: number;
  feeInr: number;
  bio: string;
  clinicIds: string[];
}) {
  const clinicIds = input.clinicIds
    .map((clinicId) => clinicId.trim())
    .filter(Boolean)
    .filter((clinicId, index, list) => list.indexOf(clinicId) === index);
  const validationError = validateDoctorAdminInput({
    name: input.name,
    phone: input.phone,
    specialty: input.specialty,
    experienceYears: input.experienceYears,
    feeInr: input.feeInr,
    bio: input.bio,
    clinicIds
  });
  if (validationError) {
    throw new Error(validationError);
  }

  const doctor = await getDoctorProfileByUserId(input.doctorUserId);
  if (!doctor) {
    throw new Error("Doctor profile not found.");
  }

  const clinicCheck = await dbQuery("SELECT id FROM clinics WHERE id = ANY($1::text[])", [clinicIds]);
  if (clinicCheck.rows.length !== clinicIds.length) {
    throw new Error("One or more selected clinics are invalid.");
  }

  await dbTransaction(async (client) => {
    await client.query("UPDATE users SET name = $1, phone = $2 WHERE id = $3 AND role = 'doctor'", [
      input.name.trim(),
      input.phone.trim(),
      input.doctorUserId
    ]);
    await client.query(
      `UPDATE doctor_profiles
       SET specialty = $1, experience_years = $2, fee_inr = $3, bio = $4
       WHERE user_id = $5`,
      [input.specialty.trim(), Math.floor(input.experienceYears), Math.floor(input.feeInr), input.bio.trim(), input.doctorUserId]
    );
    await client.query("DELETE FROM doctor_clinics WHERE doctor_profile_id = $1", [doctor.id]);

    for (const clinicId of clinicIds) {
      await client.query("INSERT INTO doctor_clinics (doctor_profile_id, clinic_id) VALUES ($1, $2)", [doctor.id, clinicId]);
    }
  });

  const refreshed = await getDoctorProfileByUserId(input.doctorUserId);
  if (!refreshed) {
    throw new Error("Doctor was updated but could not be reloaded.");
  }

  return refreshed;
}

export async function getAppointmentViews(): Promise<AppointmentView[]> {
  const result = await dbQuery(
    `SELECT
       a.id AS appointment_id,
       a.patient_id,
       a.doctor_profile_id,
       a.clinic_id,
       a.slot_id,
       a.mode AS appointment_mode,
       a.symptoms,
       a.status AS appointment_status,
       a.video_call_link,
       a.created_at AS appointment_created_at,
       a.updated_at AS appointment_updated_at,
       c.id AS clinic_id_ref,
       c.name AS clinic_name,
       c.city AS clinic_city,
       c.address AS clinic_address,
       c.phone AS clinic_phone,
       dp.id AS doctor_id,
       dp.user_id AS doctor_user_id,
       dp.specialty AS doctor_specialty,
       dp.experience_years AS doctor_experience_years,
       dp.rating AS doctor_rating,
       dp.rating_count AS doctor_rating_count,
       dp.avatar_url AS doctor_avatar_url,
       dp.languages AS doctor_languages,
       dp.consultation_modes AS doctor_consultation_modes,
       dp.fee_inr AS doctor_fee_inr,
       dp.bio AS doctor_bio,
       du.id AS doctor_user_id_ref,
       du.name AS doctor_user_name,
       du.email AS doctor_user_email,
       du.phone AS doctor_user_phone,
       du.role AS doctor_user_role,
       pu.id AS patient_id_ref,
       pu.name AS patient_name,
       pu.email AS patient_email,
       pu.phone AS patient_phone,
       pu.role AS patient_role,
       s.id AS slot_id_ref,
       s.doctor_profile_id AS slot_doctor_profile_id,
       s.clinic_id AS slot_clinic_id,
       s.starts_at AS slot_starts_at,
       s.mode AS slot_mode,
       s.status AS slot_status
     FROM appointments a
     JOIN clinics c ON c.id = a.clinic_id
     JOIN doctor_profiles dp ON dp.id = a.doctor_profile_id
     JOIN users du ON du.id = dp.user_id
     JOIN users pu ON pu.id = a.patient_id
     JOIN availability_slots s ON s.id = a.slot_id
     ORDER BY s.starts_at DESC`
  );
  const prescriptionResult = await dbQuery(
    `SELECT
       id,
       appointment_id,
       doctor_profile_id,
       patient_id,
       notes,
       medicines,
       attachment_url,
       attachment_name,
       attachment_type,
       issued_at
     FROM prescriptions`
  );

  const clinicLinkResult = await dbQuery("SELECT doctor_profile_id, clinic_id FROM doctor_clinics");
  const clinicIdsByDoctor = new Map<string, string[]>();
  for (const row of clinicLinkResult.rows) {
    const list = clinicIdsByDoctor.get(String(row.doctor_profile_id)) ?? [];
    list.push(String(row.clinic_id));
    clinicIdsByDoctor.set(String(row.doctor_profile_id), list);
  }
  const prescriptionsByAppointmentId = new Map<string, Prescription>();
  for (const row of prescriptionResult.rows) {
    const prescription = mapPrescription(row);
    prescriptionsByAppointmentId.set(prescription.appointmentId, prescription);
  }

  return result.rows.map((row: Record<string, unknown>) => {
    const doctor = mapDoctorProfile({
      doctor_id: row.doctor_id,
      doctor_user_id: row.doctor_user_id,
      doctor_specialty: row.doctor_specialty,
      doctor_experience_years: row.doctor_experience_years,
      doctor_rating: row.doctor_rating,
      doctor_rating_count: row.doctor_rating_count,
      doctor_avatar_url: row.doctor_avatar_url,
      doctor_languages: row.doctor_languages,
      doctor_consultation_modes: row.doctor_consultation_modes,
      doctor_fee_inr: row.doctor_fee_inr,
      doctor_bio: row.doctor_bio
    }, "doctor_");

    return {
      id: String(row.appointment_id),
      patientId: String(row.patient_id),
      doctorProfileId: String(row.doctor_profile_id),
      clinicId: String(row.clinic_id),
      slotId: String(row.slot_id),
      mode: row.appointment_mode as ConsultationMode,
      symptoms: String(row.symptoms),
      status: row.appointment_status as AppointmentStatus,
      videoCallLink: row.video_call_link ? String(row.video_call_link) : undefined,
      createdAt: new Date(String(row.appointment_created_at)).toISOString(),
      updatedAt: new Date(String(row.appointment_updated_at)).toISOString(),
      clinic: mapClinic({
        clinic_id: row.clinic_id_ref,
        clinic_name: row.clinic_name,
        clinic_city: row.clinic_city,
        clinic_address: row.clinic_address,
        clinic_phone: row.clinic_phone
      }, "clinic_"),
      doctor: {
        ...doctor,
        clinicIds: clinicIdsByDoctor.get(doctor.id) ?? [],
        user: {
          id: String(row.doctor_user_id_ref),
          name: String(row.doctor_user_name),
          email: String(row.doctor_user_email),
          phone: String(row.doctor_user_phone),
          role: row.doctor_user_role as Role
        }
      },
      patient: {
        id: String(row.patient_id_ref),
        name: String(row.patient_name),
        email: String(row.patient_email),
        phone: String(row.patient_phone),
        role: row.patient_role as Role
      },
      slot: mapSlot(
        {
          slot_id: row.slot_id_ref,
          slot_doctor_profile_id: row.slot_doctor_profile_id,
          slot_clinic_id: row.slot_clinic_id,
          slot_starts_at: row.slot_starts_at,
          slot_mode: row.slot_mode,
          slot_status: row.slot_status
        },
        "slot_"
      ),
      prescription: prescriptionsByAppointmentId.get(String(row.appointment_id))
    };
  });
}

export async function getAppointmentViewById(appointmentId: string) {
  const appointments = await getAppointmentViews();
  return appointments.find((appointment) => appointment.id === appointmentId);
}

export async function getNotificationsForUser(userId: string) {
  const result = await dbQuery(
    "SELECT id, user_id, type, message, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return result.rows.map<Notification>((row: Record<string, unknown>) => ({
    id: String(row.id),
    userId: String(row.user_id),
    type: row.type as NotificationType,
    message: String(row.message),
    createdAt: new Date(String(row.created_at)).toISOString()
  }));
}

export async function buildDashboardData(session: Session): Promise<DashboardData> {
  const user = await getUserById(session.userId);
  if (!user) {
    throw new Error("User not found");
  }

  const [appointments, notifications, doctors, clinics] = await Promise.all([
    getAppointmentViews(),
    getNotificationsForUser(session.userId),
    getDoctorDirectory(),
    getClinics()
  ]);

  return {
    session,
    user,
    doctors,
    appointments: appointments.filter((appointment: AppointmentView) => {
      if (session.role === "patient") {
        return appointment.patientId === session.userId;
      }
      if (session.role === "doctor") {
        return appointment.doctor.user.id === session.userId;
      }
      return true;
    }),
    notifications,
    clinics
  };
}

export async function findRoleForUser(userId: string): Promise<Role | undefined> {
  return (await getUserById(userId))?.role;
}

export async function createAppointment(input: {
  patientId: string;
  doctorProfileId: string;
  clinicId: string;
  slotId: string;
  mode: ConsultationMode;
  symptoms: string;
}) {
  const patient = await getUserById(input.patientId);
  if (!patient || patient.role !== "patient") {
    throw new Error("Only patients can create appointments.");
  }

  const appointmentId = randomUUID();
  const now = new Date().toISOString();
  let createdNotifications;
  try {
    createdNotifications = await dbTransaction(async (client) => {
      const slotResult = await client.query(
        "SELECT id, doctor_profile_id, clinic_id, starts_at, mode, status FROM availability_slots WHERE id = $1 FOR UPDATE",
        [input.slotId]
      );
      const slot = slotResult.rows[0] ? mapSlot(slotResult.rows[0]) : null;
      if (!slot) {
        throw new Error("Selected time slot was not found.");
      }
    const bookingError = validateBookingRequest({
      slotStatus: slot.status,
      slotDoctorProfileId: slot.doctorProfileId,
      slotClinicId: slot.clinicId,
      slotMode: slot.mode,
      doctorProfileId: input.doctorProfileId,
      clinicId: input.clinicId,
      mode: input.mode
    });
    if (bookingError) {
      throw new Error(bookingError);
    }
      if (new Date(slot.startsAt).getTime() <= Date.now()) {
        throw new Error("Please choose a future time slot.");
      }
      if (!input.symptoms.trim()) {
        throw new Error("Please tell the doctor the reason for your appointment.");
      }

      const existingAppointment = await client.query(
        "SELECT id FROM appointments WHERE slot_id = $1 AND status IN ('pending', 'confirmed', 'completed') LIMIT 1",
        [input.slotId]
      );
      if (existingAppointment.rows[0]) {
        throw new Error("Selected time slot is no longer available.");
      }

      await client.query(
        `INSERT INTO appointments
          (id, patient_id, doctor_profile_id, clinic_id, slot_id, mode, symptoms, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9)`,
        [appointmentId, input.patientId, input.doctorProfileId, input.clinicId, input.slotId, input.mode, input.symptoms.trim(), now, now]
      );
      await client.query("UPDATE availability_slots SET status = 'requested' WHERE id = $1", [input.slotId]);

      const doctorResult = await client.query(
        `SELECT u.id, u.name, u.email, u.phone, u.role
         FROM doctor_profiles dp
         JOIN users u ON u.id = dp.user_id
         WHERE dp.id = $1
         LIMIT 1`,
        [input.doctorProfileId]
      );
      const adminResult = await client.query("SELECT id, name, email, phone, role FROM users WHERE role = 'admin'");
      const doctor = mapUser(doctorResult.rows[0]);
      const admins = adminResult.rows.map((row: Record<string, unknown>) => mapUser(row));

      return insertNotifications(client, [
        {
          userId: input.patientId,
          type: "appointment-requested",
          message: "Your appointment request was submitted and is waiting for confirmation."
        },
        {
          userId: doctor.id,
          type: "appointment-requested",
          message: `${patient.name} requested a new ${input.mode} appointment with you.`
        },
        ...admins.map((admin) => ({
          userId: admin.id,
          type: "appointment-requested" as NotificationType,
          message: `${patient.name} requested ${input.mode} care with ${doctor.name}.`
        }))
      ]);
    });
  } catch (error) {
    const databaseError = error as Error & { code?: string };
    if (databaseError.code === "23505") {
      throw new Error("Selected time slot is no longer available.");
    }
    throw error;
  }

  await runNotificationHooks(createdNotifications);

  const created = await getAppointmentViewById(appointmentId);
  if (!created) {
    throw new Error("Appointment was created but could not be reloaded.");
  }
  return created;
}

export async function updateAppointmentStatus(input: {
  appointmentId: string;
  actorRole: Role;
  actorUserId: string;
  status: Extract<AppointmentStatus, "confirmed" | "rejected" | "cancelled" | "completed">;
  videoCallLink?: string;
}) {
  const appointment = await getAppointmentViewById(input.appointmentId);
  if (!appointment) {
    throw new Error("Appointment not found.");
  }

  const statusError = validateAppointmentStatusTransition({
    actorRole: input.actorRole,
    actorUserId: input.actorUserId,
    doctorUserId: appointment.doctor.user.id,
    patientId: appointment.patientId,
    currentStatus: appointment.status,
    nextStatus: input.status
  });
  if (statusError) {
    throw new Error(statusError);
  }
  if (input.status === "completed" && new Date(appointment.slot.startsAt).getTime() > Date.now()) {
    throw new Error("Appointments can only be marked completed after the scheduled start time.");
  }

  const videoCallLink =
    input.status === "confirmed" && appointment.mode === "video"
      ? buildInternalConsultationLink(appointment.id)
      : ["rejected", "cancelled"].includes(input.status)
        ? null
        : appointment.videoCallLink ?? null;

  const createdNotifications = await dbTransaction(async (client) => {
    const appointmentResult = await client.query(
      `SELECT a.id, a.status, a.slot_id, a.mode, a.patient_id, dp.user_id AS doctor_user_id
       FROM appointments a
       JOIN doctor_profiles dp ON dp.id = a.doctor_profile_id
       WHERE a.id = $1
       FOR UPDATE`,
      [input.appointmentId]
    );

    const lockedAppointment = appointmentResult.rows[0];
    if (!lockedAppointment) {
      throw new Error("Appointment not found.");
    }

    const slotResult = await client.query(
      "SELECT id, status, starts_at FROM availability_slots WHERE id = $1 FOR UPDATE",
      [String(lockedAppointment.slot_id)]
    );
    const lockedSlot = slotResult.rows[0];
    if (!lockedSlot) {
      throw new Error("Associated slot was not found.");
    }

    if ((input.status === "confirmed" || input.status === "rejected") && String(lockedAppointment.status) !== "pending") {
      throw new Error("Only pending appointments can be reviewed.");
    }
    if (input.status === "completed" && String(lockedAppointment.status) !== "confirmed") {
      throw new Error("Only confirmed appointments can be marked as completed.");
    }
    if (input.status === "cancelled" && !["pending", "confirmed"].includes(String(lockedAppointment.status))) {
      throw new Error("Only pending or confirmed appointments can be cancelled.");
    }

    await client.query("UPDATE appointments SET status = $1, updated_at = NOW(), video_call_link = $2 WHERE id = $3", [
      input.status,
      videoCallLink,
      input.appointmentId
    ]);

    if (input.status === "confirmed") {
      await client.query("UPDATE availability_slots SET status = 'booked' WHERE id = $1", [String(lockedAppointment.slot_id)]);
    }

    if (input.status === "rejected" || input.status === "cancelled") {
      await client.query("UPDATE availability_slots SET status = 'available' WHERE id = $1", [String(lockedAppointment.slot_id)]);
    }
    if (input.status === "confirmed") {
      return insertNotifications(client, [
        {
          userId: appointment.patientId,
          type: "appointment-confirmed",
          message: `Your appointment with ${appointment.doctor.user.name} has been confirmed.`
        },
        {
          userId: appointment.doctor.user.id,
          type: "appointment-confirmed",
          message: `Appointment with ${appointment.patient.name} is confirmed.`
        }
      ]);
    }

    if (input.status === "rejected") {
      return insertNotifications(client, [
        {
          userId: appointment.patientId,
          type: "appointment-rejected",
          message: "Your appointment request was declined. Please choose another slot."
        },
        {
          userId: appointment.doctor.user.id,
          type: "appointment-rejected",
          message: `Appointment request from ${appointment.patient.name} was rejected.`
        }
      ]);
    }

    if (input.status === "cancelled") {
      const actorLabel =
        input.actorRole === "patient" ? appointment.patient.name : input.actorRole === "doctor" ? appointment.doctor.user.name : "The clinic";

      return insertNotifications(client, [
        {
          userId: appointment.patientId,
          type: "appointment-cancelled",
          message: `${actorLabel} cancelled the appointment.`
        },
        {
          userId: appointment.doctor.user.id,
          type: "appointment-cancelled",
          message: `${actorLabel} cancelled the appointment with ${appointment.patient.name}.`
        }
      ]);
    }

    if (input.status === "completed") {
      return insertNotifications(client, [
        {
          userId: appointment.patientId,
          type: "appointment-completed",
          message: `Consultation with ${appointment.doctor.user.name} was marked as completed.`
        }
      ]);
    }

    return [];
  });

  await runNotificationHooks(createdNotifications);

  const updated = await getAppointmentViewById(input.appointmentId);
  if (!updated) {
    throw new Error("Appointment was updated but could not be reloaded.");
  }
  return updated;
}

export async function createDoctorAvailability(input: {
  actorUserId: string;
  clinicId: string;
  startsAt: string;
  mode: ConsultationMode;
}) {
  const doctor = await getDoctorProfileByUserId(input.actorUserId);
  if (!doctor) {
    throw new Error("Doctor profile not found.");
  }

  if (!doctor.clinicIds.includes(input.clinicId)) {
    throw new Error("Doctors can only add availability for their assigned clinics.");
  }

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    throw new Error("Please choose a valid date and time.");
  }
  if (startsAt.getTime() <= Date.now()) {
    throw new Error("Availability must be scheduled in the future.");
  }

  const normalizedMode = input.mode === "in-person" ? "in-person" : "video";
  const slotId = randomUUID();

  try {
    await dbQuery(
      `INSERT INTO availability_slots (id, doctor_profile_id, clinic_id, starts_at, mode, status)
       VALUES ($1, $2, $3, $4, $5, 'available')`,
      [slotId, doctor.id, input.clinicId, startsAt.toISOString(), normalizedMode]
    );
  } catch (error) {
    const databaseError = error as Error & { code?: string };
    if (databaseError.code === "23505") {
      throw new Error("A matching availability slot already exists for that time.");
    }
    throw error;
  }

  const created = await dbQuery(
    "SELECT id, doctor_profile_id, clinic_id, starts_at, mode, status FROM availability_slots WHERE id = $1 LIMIT 1",
    [slotId]
  );
  return mapSlot(created.rows[0]);
}

export async function createPrescription(input: {
  appointmentId: string;
  doctorUserId: string;
  medicines: string;
  notes: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
}) {
  const appointment = await getAppointmentViewById(input.appointmentId);
  if (!appointment) {
    throw new Error("Appointment not found.");
  }
  if (appointment.status !== "completed") {
    throw new Error("Prescriptions can only be issued after the consultation is completed.");
  }
  if (appointment.doctor.user.id !== input.doctorUserId) {
    throw new Error("Only the assigned doctor can issue the prescription.");
  }

  const medicines = input.medicines.trim();
  const notes = input.notes.trim();
  const hasAttachment = Boolean(input.attachmentUrl);
  const prescriptionError = validatePrescriptionSubmission({ medicines, notes, hasAttachment });
  if (prescriptionError) {
    throw new Error(prescriptionError);
  }

  const createdNotifications = await dbTransaction(async (client) => {
    const existing = await client.query("SELECT id FROM prescriptions WHERE appointment_id = $1 LIMIT 1", [input.appointmentId]);
    if (existing.rows[0]) {
      await client.query(
        `UPDATE prescriptions
         SET medicines = $1, notes = $2, attachment_url = $3, attachment_name = $4, attachment_type = $5, issued_at = NOW()
         WHERE appointment_id = $6`,
        [medicines, notes, input.attachmentUrl ?? null, input.attachmentName ?? null, input.attachmentType ?? null, input.appointmentId]
      );
    } else {
      await client.query(
        `INSERT INTO prescriptions
         (id, appointment_id, doctor_profile_id, patient_id, notes, medicines, attachment_url, attachment_name, attachment_type, issued_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          randomUUID(),
          input.appointmentId,
          appointment.doctorProfileId,
          appointment.patientId,
          notes,
          medicines,
          input.attachmentUrl ?? null,
          input.attachmentName ?? null,
          input.attachmentType ?? null
        ]
      );
    }

    return insertNotifications(client, [
      {
        userId: appointment.patientId,
        type: "prescription-issued",
        message: hasAttachment
          ? "Your prescription is ready with notes and/or an attached file."
          : "Your typed prescription is ready to review."
      },
      {
        userId: input.doctorUserId,
        type: "prescription-issued",
        message: "Prescription saved successfully."
      }
    ]);
  });

  await runNotificationHooks(createdNotifications);

  const refreshed = await getAppointmentViewById(input.appointmentId);
  if (!refreshed?.prescription) {
    throw new Error("Prescription was saved but could not be reloaded.");
  }
  return refreshed.prescription;
}

export async function getPrescriptionFileAccess(input: {
  prescriptionId: string;
  actorUserId: string;
  actorRole: Role;
}) {
  const appointments = await getAppointmentViews();
  const match = appointments.find((appointment) => appointment.prescription?.id === input.prescriptionId);

  if (!match?.prescription) {
    throw new Error("Prescription file not found.");
  }

  if (
    !canAccessRoleProtectedResource({
      actorRole: input.actorRole,
      actorUserId: input.actorUserId,
      patientId: match.patientId,
      doctorUserId: match.doctor.user.id
    })
  ) {
    throw new Error("You do not have access to this prescription file.");
  }

  if (!match.prescription.attachmentUrl) {
    throw new Error("This prescription does not have an uploaded file.");
  }

  return {
    prescription: match.prescription,
    appointment: match
  };
}

export function getSlotStatusTone(status: SlotStatus | AppointmentStatus) {
  if (status === "confirmed" || status === "booked" || status === "completed") {
    return "pill";
  }
  if (status === "pending" || status === "requested") {
    return "pill pill--gold";
  }
  return "pill pill--warm";
}

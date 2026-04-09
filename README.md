# MediNest Care

Medical appointment website starter built with Next.js and TypeScript.

## Included in this starter

- Public landing page for a medical booking platform
- Doctor directory with slot-based appointment request flow
- Email/password login for patient, doctor, and admin roles
- Self-registration for patient and doctor roles
- Role-based dashboards
- Secure database-backed sessions with expiry and logout
- Admin approval flow for appointment requests
- Doctor completion and prescription workflow
- PostgreSQL-backed persistence for users, doctors, clinics, slots, appointments, prescriptions, notifications, and sessions

## Run locally

1. Create a PostgreSQL database named `medinest`
2. Copy `.env.example` to `.env.local`
3. Update `DATABASE_URL` if your PostgreSQL credentials are different
4. Add Cloudinary credentials for file storage
5. Install dependencies and start the app

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

The schema and initial seed data are created automatically on first run.

## File storage

Uploads now use Cloudinary instead of writing to `public/uploads`.

Add these variables to `.env.local`:

```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_UPLOAD_FOLDER=medinest
```

The database stores only the uploaded file URL plus file metadata.

## Database setup

Default connection string:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/medinest
```

Tables created automatically:

- `users`
- `auth_accounts`
- `sessions`
- `clinics`
- `doctor_profiles`
- `doctor_clinics`
- `availability_slots`
- `appointments`
- `prescriptions`
- `notifications`

## Seeded credentials

- Admin: `admin@medinest.com`
- Doctor: `aarav@medinest.com`, `neha@medinest.com`
- Patient: `riya@example.com`, `kabir@example.com`

Passwords:

- Admin: `admin123`
- Doctors: `doctor123`
- Patients: `patient123`

You can also create your own patient or doctor account from the login page.

## Next implementation steps

- Add real authentication and protected API middleware
- Add SMS/email integrations for notification delivery

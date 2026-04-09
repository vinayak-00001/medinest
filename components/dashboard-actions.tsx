"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Clinic, ConsultationMode, SlotStatus } from "@/lib/types";

interface StatusActionProps {
  appointmentId: string;
  action: "confirmed" | "rejected" | "completed" | "cancelled";
  buttonLabel: string;
}

export function StatusAction({ appointmentId, action, buttonLabel }: StatusActionProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/appointments/${appointmentId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action })
    });
    const payload = await response.json();
    setPending(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not update appointment.");
      return;
    }

    router.refresh();
  }

  return (
    <>
      <button className="ghost-button" disabled={pending} onClick={submit} type="button">
        {pending ? "Saving..." : buttonLabel}
      </button>
      {error ? <p className="pill pill--warm">{error}</p> : null}
    </>
  );
}

interface PrescriptionFormProps {
  appointmentId: string;
}

export function PrescriptionForm({ appointmentId }: PrescriptionFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/appointments/${appointmentId}/prescription`, {
      method: "POST",
      body: form
    });

    const payload = await response.json();
    setPending(false);

    if (!response.ok) {
      setError(payload.error ?? "Unable to save prescription.");
      return;
    }

    setMessage("Prescription saved.");
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form className="record" onSubmit={onSubmit}>
      <h3>Add prescription</h3>
      <div className="field">
        <label htmlFor={`medicines-${appointmentId}`}>Medicines</label>
        <textarea
          id={`medicines-${appointmentId}`}
          name="medicines"
          placeholder="Type medicines here if you want a text prescription."
          rows={4}
        />
      </div>
      <div className="field">
        <label htmlFor={`notes-${appointmentId}`}>Care notes</label>
        <textarea id={`notes-${appointmentId}`} name="notes" placeholder="Type follow-up notes or instructions." rows={4} />
      </div>
      <div className="field">
        <label htmlFor={`attachment-${appointmentId}`}>Upload PDF or image</label>
        <input accept=".pdf,image/png,image/jpeg,image/webp" id={`attachment-${appointmentId}`} name="attachmentFile" type="file" />
      </div>
      <p className="tiny muted">You can type the prescription, upload a PDF/image, or do both. At least one option is required.</p>
      <div className="inline-actions">
        <button className="button" disabled={pending} type="submit">
          {pending ? "Saving..." : "Save prescription"}
        </button>
      </div>
      {error ? <p className="pill pill--warm">{error}</p> : null}
      {message ? <p className="pill">{message}</p> : null}
    </form>
  );
}

interface DoctorProfileFormProps {
  currentAvatarUrl?: string;
  currentBio: string;
  currentSpecialty: string;
  currentExperienceYears: number;
  currentFeeInr: number;
  currentLanguages: string[];
  currentRating: number;
  currentRatingCount: number;
}

export function DoctorProfileForm({
  currentAvatarUrl,
  currentBio,
  currentSpecialty,
  currentExperienceYears,
  currentFeeInr,
  currentLanguages,
  currentRating,
  currentRatingCount
}: DoctorProfileFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/doctor/profile", {
      method: "POST",
      body: form
    });

    const payload = await response.json();
    setPending(false);

    if (!response.ok) {
      setError(payload.error ?? "Unable to update doctor profile.");
      return;
    }

    setMessage(payload.message ?? "Doctor profile updated.");
    router.refresh();
  }

  return (
    <form className="record" onSubmit={onSubmit}>
      <h3>Doctor profile</h3>
      <div className="doctor-upload-row">
        {currentAvatarUrl ? <img alt="Doctor profile" className="doctor-avatar doctor-avatar--large" src={currentAvatarUrl} /> : null}
        <div className="field">
          <label htmlFor="doctor-avatar-file">Profile picture</label>
          <input accept="image/png,image/jpeg,image/webp" id="doctor-avatar-file" name="avatarFile" type="file" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="doctor-specialty">Specialty</label>
        <input defaultValue={currentSpecialty} id="doctor-specialty" name="specialty" required type="text" />
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="doctor-experience">Experience</label>
          <input defaultValue={currentExperienceYears} id="doctor-experience" min={0} name="experienceYears" required type="number" />
        </div>
        <div className="field">
          <label htmlFor="doctor-fee">Consultation fee (INR)</label>
          <input defaultValue={currentFeeInr} id="doctor-fee" min={0} name="feeInr" required type="number" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="doctor-bio">Short bio</label>
        <textarea defaultValue={currentBio} id="doctor-bio" name="bio" required />
      </div>
      <div className="field">
        <label htmlFor="doctor-languages">Languages</label>
        <input
          defaultValue={currentLanguages.join(", ")}
          id="doctor-languages"
          name="languages"
          placeholder="English, Hindi"
          required
          type="text"
        />
        <p className="tiny muted">Separate languages with commas.</p>
      </div>
      <div className="record">
        <strong>Patient rating</strong>
        <p className="tiny muted">
          {currentRating.toFixed(1)} rating from {currentRatingCount} {currentRatingCount === 1 ? "person" : "people"}
        </p>
        <p className="tiny muted">Doctors cannot edit ratings directly. Ratings should come from patient reviews.</p>
      </div>
      <div className="inline-actions">
        <button className="button" disabled={pending} type="submit">
          {pending ? "Saving..." : "Save profile"}
        </button>
      </div>
      {error ? <p className="pill pill--warm">{error}</p> : null}
      {message ? <p className="pill">{message}</p> : null}
    </form>
  );
}

interface AvailabilityFormProps {
  clinics: Clinic[];
  consultationModes: ConsultationMode[];
}

export function AvailabilityForm({ clinics, consultationModes }: AvailabilityFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setPending(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/doctor/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinicId: String(formData.get("clinicId") || ""),
        startsAt: String(formData.get("startsAt") || ""),
        mode: String(formData.get("mode") || "")
      })
    });

    const payload = await response.json();
    setPending(false);

    if (!response.ok) {
      setError(payload.error ?? "Unable to add availability.");
      return;
    }

    setMessage("Availability added.");
    form.reset();
    router.refresh();
  }

  return (
    <form className="record" onSubmit={onSubmit}>
      <h3>Define availability</h3>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="availability-clinic">Clinic</label>
          <select defaultValue={clinics[0]?.id ?? ""} id="availability-clinic" name="clinicId" required>
            {clinics.map((clinic) => (
              <option key={clinic.id} value={clinic.id}>
                {clinic.name} ({clinic.city})
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="availability-mode">Mode</label>
          <select defaultValue={consultationModes[0] ?? "video"} id="availability-mode" name="mode" required>
            {consultationModes.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="availability-starts-at">Date and time</label>
        <input id="availability-starts-at" name="startsAt" required type="datetime-local" />
      </div>
      <div className="inline-actions">
        <button className="button" disabled={pending} type="submit">
          {pending ? "Saving..." : "Add slot"}
        </button>
      </div>
      {error ? <p className="pill pill--warm">{error}</p> : null}
      {message ? <p className="pill">{message}</p> : null}
    </form>
  );
}

interface AvailabilityListProps {
  slots: Array<{
    id: string;
    startsAt: string;
    mode: ConsultationMode;
    status: SlotStatus;
    clinicName: string;
  }>;
}

export function AvailabilityList({ slots }: AvailabilityListProps) {
  return (
    <div className="record">
      <strong>Upcoming availability</strong>
      <div className="record-list">
        {slots.length ? (
          slots.map((slot) => (
            <div className="record" key={slot.id}>
              <strong>{slot.clinicName}</strong>
              <p className="tiny muted">
                {new Intl.DateTimeFormat("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short"
                }).format(new Date(slot.startsAt))}{" "}
                • {slot.mode} • {slot.status}
              </p>
            </div>
          ))
        ) : (
          <div className="empty">No future slots yet. Add your first availability block above.</div>
        )}
      </div>
    </div>
  );
}

interface AdminClinicFormProps {
  clinic?: Clinic;
}

export function AdminClinicForm({ clinic }: AdminClinicFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/clinics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinicId: clinic?.id,
        name: String(formData.get("name") || ""),
        city: String(formData.get("city") || ""),
        address: String(formData.get("address") || ""),
        phone: String(formData.get("phone") || "")
      })
    });

    const payload = await response.json();
    setPending(false);

    if (!response.ok) {
      setError(payload.error ?? "Unable to save clinic.");
      return;
    }

    setMessage(clinic ? "Clinic updated." : "Clinic added.");
    if (!clinic) {
      event.currentTarget.reset();
    }
    router.refresh();
  }

  return (
    <form className="record" onSubmit={onSubmit}>
      <strong>{clinic ? clinic.name : "Add clinic"}</strong>
      <div className="form-grid">
        <div className="field">
          <label>Name</label>
          <input defaultValue={clinic?.name ?? ""} name="name" required type="text" />
        </div>
        <div className="field">
          <label>City</label>
          <input defaultValue={clinic?.city ?? ""} name="city" required type="text" />
        </div>
      </div>
      <div className="field">
        <label>Address</label>
        <input defaultValue={clinic?.address ?? ""} name="address" required type="text" />
      </div>
      <div className="field">
        <label>Phone</label>
        <input defaultValue={clinic?.phone ?? ""} name="phone" required type="tel" />
      </div>
      <div className="inline-actions">
        <button className="button" disabled={pending} type="submit">
          {pending ? "Saving..." : clinic ? "Save clinic" : "Add clinic"}
        </button>
      </div>
      {error ? <p className="pill pill--warm">{error}</p> : null}
      {message ? <p className="pill">{message}</p> : null}
    </form>
  );
}

interface AdminDoctorFormProps {
  doctor: {
    id: string;
    userId: string;
    specialty: string;
    experienceYears: number;
    feeInr: number;
    bio: string;
    clinicIds: string[];
    user: {
      name: string;
      phone: string;
      email: string;
    };
  };
  clinics: Clinic[];
}

export function AdminDoctorForm({ doctor, clinics }: AdminDoctorFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setMessage(null);

    const selectedClinicIds = clinics
      .filter((clinic) => formData.get(clinic.id) === "on")
      .map((clinic) => clinic.id);

    const response = await fetch("/api/admin/doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doctorUserId: doctor.userId,
        name: String(formData.get("name") || ""),
        phone: String(formData.get("phone") || ""),
        specialty: String(formData.get("specialty") || ""),
        experienceYears: Number(formData.get("experienceYears") || 0),
        feeInr: Number(formData.get("feeInr") || 0),
        bio: String(formData.get("bio") || ""),
        clinicIds: selectedClinicIds
      })
    });

    const payload = await response.json();
    setPending(false);

    if (!response.ok) {
      setError(payload.error ?? "Unable to save doctor.");
      return;
    }

    setMessage("Doctor updated.");
    router.refresh();
  }

  return (
    <form className="record" onSubmit={onSubmit}>
      <strong>{doctor.user.name}</strong>
      <p className="tiny muted">{doctor.user.email}</p>
      <div className="form-grid">
        <div className="field">
          <label>Name</label>
          <input defaultValue={doctor.user.name} name="name" required type="text" />
        </div>
        <div className="field">
          <label>Phone</label>
          <input defaultValue={doctor.user.phone} name="phone" required type="tel" />
        </div>
      </div>
      <div className="form-grid">
        <div className="field">
          <label>Specialty</label>
          <input defaultValue={doctor.specialty} name="specialty" required type="text" />
        </div>
        <div className="field">
          <label>Experience</label>
          <input defaultValue={doctor.experienceYears} min={0} name="experienceYears" required type="number" />
        </div>
      </div>
      <div className="field">
        <label>Fee (INR)</label>
        <input defaultValue={doctor.feeInr} min={0} name="feeInr" required type="number" />
      </div>
      <div className="field">
        <label>Bio</label>
        <textarea defaultValue={doctor.bio} name="bio" required rows={3} />
      </div>
      <div className="field">
        <label>Assigned clinics</label>
        <div className="record-list">
          {clinics.map((clinic) => (
            <label className="tiny muted" key={clinic.id}>
              <input defaultChecked={doctor.clinicIds.includes(clinic.id)} name={clinic.id} type="checkbox" /> {clinic.name} ({clinic.city})
            </label>
          ))}
        </div>
      </div>
      <div className="inline-actions">
        <button className="button" disabled={pending} type="submit">
          {pending ? "Saving..." : "Save doctor"}
        </button>
      </div>
      {error ? <p className="pill pill--warm">{error}</p> : null}
      {message ? <p className="pill">{message}</p> : null}
    </form>
  );
}

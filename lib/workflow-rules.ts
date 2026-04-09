import { AppointmentStatus, ConsultationMode, Role } from "./types";
import { validateEmail, validatePassword, validatePhone } from "./validation";

export function validateLoginInput(input: { email: string; password: string }) {
  if (!validateEmail(input.email)) {
    return "Please enter a valid email address.";
  }

  if (!validatePassword(input.password)) {
    return "Password must be at least 8 characters and include a letter and a number.";
  }

  return null;
}

export function validateSignupInput(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
  clinicId?: string;
  specialty?: string;
}) {
  if (!input.name.trim() || !input.email.trim() || !input.phone.trim() || !input.password.trim()) {
    return "Please fill in all required fields.";
  }

  if (!validateEmail(input.email)) {
    return "Please enter a valid email address.";
  }

  if (!validatePhone(input.phone)) {
    return "Please enter a valid phone number.";
  }

  if (!validatePassword(input.password)) {
    return "Password must be at least 8 characters and include a letter and a number.";
  }

  if (input.role === "doctor") {
    if (!input.clinicId?.trim()) {
      return "Please choose a valid clinic for the doctor account.";
    }

    if (!input.specialty?.trim()) {
      return "Please provide a specialty for the doctor account.";
    }
  }

  return null;
}

export function validateBookingRequest(input: {
  slotStatus: "available" | "requested" | "booked";
  slotDoctorProfileId: string;
  slotClinicId: string;
  slotMode: ConsultationMode;
  doctorProfileId: string;
  clinicId: string;
  mode: ConsultationMode;
}) {
  if (input.slotStatus !== "available") {
    return "Selected time slot is no longer available.";
  }

  if (
    input.slotDoctorProfileId !== input.doctorProfileId ||
    input.slotClinicId !== input.clinicId ||
    input.slotMode !== input.mode
  ) {
    return "Appointment details do not match the chosen slot.";
  }

  return null;
}

export function validateAppointmentStatusTransition(input: {
  actorRole: Role;
  actorUserId: string;
  doctorUserId: string;
  patientId: string;
  currentStatus: AppointmentStatus;
  nextStatus: Extract<AppointmentStatus, "confirmed" | "rejected" | "cancelled" | "completed">;
}) {
  const isAssignedDoctor = input.doctorUserId === input.actorUserId;
  const isPatient = input.patientId === input.actorUserId;

  if (input.nextStatus === "confirmed" || input.nextStatus === "rejected") {
    if (!["doctor", "admin"].includes(input.actorRole)) {
      return "Only doctors or admins can review appointment requests.";
    }
    if (input.actorRole === "doctor" && !isAssignedDoctor) {
      return "Only the assigned doctor can review this appointment.";
    }
    if (input.currentStatus !== "pending") {
      return "Only pending appointments can be reviewed.";
    }
  }

  if (input.nextStatus === "completed") {
    if (input.actorRole !== "doctor") {
      return "Only doctors can mark appointments as completed.";
    }
    if (!isAssignedDoctor) {
      return "Only the assigned doctor can complete this appointment.";
    }
    if (input.currentStatus !== "confirmed") {
      return "Only confirmed appointments can be marked as completed.";
    }
  }

  if (input.nextStatus === "cancelled") {
    if (!["admin", "patient", "doctor"].includes(input.actorRole)) {
      return "Only admins, patients, or the assigned doctor can cancel appointments.";
    }
    if (input.actorRole === "patient" && !isPatient) {
      return "You can only cancel your own appointments.";
    }
    if (input.actorRole === "doctor" && !isAssignedDoctor) {
      return "You can only cancel your own scheduled appointments.";
    }
    if (!["pending", "confirmed"].includes(input.currentStatus)) {
      return "Only pending or confirmed appointments can be cancelled.";
    }
  }

  return null;
}

export function validatePrescriptionSubmission(input: {
  medicines: string;
  notes: string;
  hasAttachment: boolean;
}) {
  const hasTypedPrescription = Boolean(input.medicines.trim() || input.notes.trim());
  if (!hasTypedPrescription && !input.hasAttachment) {
    return "Add typed prescription details, upload a PDF/image, or do both.";
  }

  return null;
}

export function validatePrescriptionAttachment(input: { type: string; size: number }) {
  const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
  if (!allowedTypes.has(input.type)) {
    return "Prescription file must be PDF, JPG, PNG, or WEBP.";
  }

  if (input.size > 8 * 1024 * 1024) {
    return "Prescription file must be 8 MB or smaller.";
  }

  return null;
}

export function validateDoctorAdminInput(input: {
  name: string;
  phone: string;
  specialty: string;
  experienceYears: number;
  feeInr: number;
  bio: string;
  clinicIds: string[];
}) {
  if (!input.name.trim() || !input.phone.trim() || !input.specialty.trim() || !input.bio.trim()) {
    return "Please complete all doctor fields.";
  }

  if (!validatePhone(input.phone)) {
    return "Please enter a valid doctor phone number.";
  }

  if (!input.clinicIds.length) {
    return "Assign at least one clinic to the doctor.";
  }

  if (!Number.isFinite(input.experienceYears) || input.experienceYears < 0 || input.experienceYears > 60) {
    return "Experience must be between 0 and 60 years.";
  }

  if (!Number.isFinite(input.feeInr) || input.feeInr < 0 || input.feeInr > 100000) {
    return "Consultation fee must be between 0 and 100000.";
  }

  return null;
}

export function canAccessRoleProtectedResource(input: {
  actorRole: Role;
  actorUserId: string;
  patientId: string;
  doctorUserId: string;
}) {
  return input.actorRole === "admin" || input.actorUserId === input.patientId || input.actorUserId === input.doctorUserId;
}

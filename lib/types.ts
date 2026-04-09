export type Role = "patient" | "doctor" | "admin";

export type ConsultationMode = "video" | "in-person";
export type SlotStatus = "available" | "requested" | "booked";
export type AppointmentStatus = "pending" | "confirmed" | "rejected" | "cancelled" | "completed";
export type NotificationType =
  | "appointment-requested"
  | "appointment-confirmed"
  | "appointment-rejected"
  | "appointment-cancelled"
  | "appointment-completed"
  | "prescription-issued";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
}

export interface AuthAccount {
  userId: string;
  email: string;
  passwordHash: string;
}

export interface Clinic {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  clinicIds: string[];
  specialty: string;
  experienceYears: number;
  rating: number;
  ratingCount: number;
  avatarUrl?: string;
  languages: string[];
  consultationModes: ConsultationMode[];
  feeInr: number;
  bio: string;
}

export interface AvailabilitySlot {
  id: string;
  doctorProfileId: string;
  clinicId: string;
  startsAt: string;
  mode: ConsultationMode;
  status: SlotStatus;
}

export interface AppointmentRequest {
  id: string;
  patientId: string;
  doctorProfileId: string;
  clinicId: string;
  slotId: string;
  mode: ConsultationMode;
  symptoms: string;
  status: AppointmentStatus;
  videoCallLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Prescription {
  id: string;
  appointmentId: string;
  doctorProfileId: string;
  patientId: string;
  notes: string;
  medicines: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  issuedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  role: Role;
  expiresAt: string;
}

export interface AppointmentView extends AppointmentRequest {
  clinic: Clinic;
  doctor: DoctorProfile & { user: User };
  patient: User;
  slot: AvailabilitySlot;
  prescription?: Prescription;
}

export interface DoctorDirectoryItem {
  doctor: DoctorProfile & { user: User };
  clinics: Clinic[];
  nextSlots: AvailabilitySlot[];
}

export interface DashboardData {
  session: Session;
  user: User;
  doctors: DoctorDirectoryItem[];
  appointments: AppointmentView[];
  notifications: Notification[];
  clinics: Clinic[];
}

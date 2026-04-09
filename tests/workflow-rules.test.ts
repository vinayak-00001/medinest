import test from "node:test";
import assert from "node:assert/strict";

import {
  canAccessRoleProtectedResource,
  validateAppointmentStatusTransition,
  validateBookingRequest,
  validateDoctorAdminInput,
  validateLoginInput,
  validatePrescriptionAttachment,
  validatePrescriptionSubmission,
  validateSignupInput
} from "../lib/workflow-rules";

test("login and signup validation covers expected auth cases", () => {
  assert.equal(validateLoginInput({ email: "bad-email", password: "Password1" }), "Please enter a valid email address.");
  assert.equal(
    validateLoginInput({ email: "patient@example.com", password: "short" }),
    "Password must be at least 8 characters and include a letter and a number."
  );
  assert.equal(validateLoginInput({ email: "patient@example.com", password: "Password1" }), null);

  assert.equal(
    validateSignupInput({
      name: "Dr. Test",
      email: "doctor@example.com",
      phone: "+91 99999 11111",
      password: "Password1",
      role: "doctor",
      clinicId: "",
      specialty: ""
    }),
    "Please choose a valid clinic for the doctor account."
  );

  assert.equal(
    validateSignupInput({
      name: "Riya Patel",
      email: "riya@example.com",
      phone: "+91 99999 11111",
      password: "Password1",
      role: "patient"
    }),
    null
  );
});

test("booking flow validation enforces slot availability and matching slot details", () => {
  assert.equal(
    validateBookingRequest({
      slotStatus: "requested",
      slotDoctorProfileId: "doc-1",
      slotClinicId: "clinic-1",
      slotMode: "video",
      doctorProfileId: "doc-1",
      clinicId: "clinic-1",
      mode: "video"
    }),
    "Selected time slot is no longer available."
  );

  assert.equal(
    validateBookingRequest({
      slotStatus: "available",
      slotDoctorProfileId: "doc-1",
      slotClinicId: "clinic-1",
      slotMode: "video",
      doctorProfileId: "doc-2",
      clinicId: "clinic-1",
      mode: "video"
    }),
    "Appointment details do not match the chosen slot."
  );

  assert.equal(
    validateBookingRequest({
      slotStatus: "available",
      slotDoctorProfileId: "doc-1",
      slotClinicId: "clinic-1",
      slotMode: "video",
      doctorProfileId: "doc-1",
      clinicId: "clinic-1",
      mode: "video"
    }),
    null
  );
});

test("admin confirmation and status transition rules protect appointment review flow", () => {
  assert.equal(
    validateAppointmentStatusTransition({
      actorRole: "admin",
      actorUserId: "u-admin-1",
      doctorUserId: "u-doc-1",
      patientId: "u-patient-1",
      currentStatus: "pending",
      nextStatus: "confirmed"
    }),
    null
  );

  assert.equal(
    validateAppointmentStatusTransition({
      actorRole: "patient",
      actorUserId: "u-patient-1",
      doctorUserId: "u-doc-1",
      patientId: "u-patient-1",
      currentStatus: "pending",
      nextStatus: "confirmed"
    }),
    "Only doctors or admins can review appointment requests."
  );

  assert.equal(
    validateAppointmentStatusTransition({
      actorRole: "doctor",
      actorUserId: "u-doc-1",
      doctorUserId: "u-doc-1",
      patientId: "u-patient-1",
      currentStatus: "confirmed",
      nextStatus: "completed"
    }),
    null
  );
});

test("prescription rules cover typed, upload, and attachment validation", () => {
  assert.equal(
    validatePrescriptionSubmission({
      medicines: "",
      notes: "",
      hasAttachment: false
    }),
    "Add typed prescription details, upload a PDF/image, or do both."
  );
  assert.equal(
    validatePrescriptionSubmission({
      medicines: "Paracetamol 650mg",
      notes: "",
      hasAttachment: false
    }),
    null
  );
  assert.equal(
    validatePrescriptionSubmission({
      medicines: "",
      notes: "",
      hasAttachment: true
    }),
    null
  );

  assert.equal(validatePrescriptionAttachment({ type: "application/pdf", size: 1024 }), null);
  assert.equal(
    validatePrescriptionAttachment({ type: "application/x-msdownload", size: 1024 }),
    "Prescription file must be PDF, JPG, PNG, or WEBP."
  );
  assert.equal(
    validatePrescriptionAttachment({ type: "image/png", size: 9 * 1024 * 1024 }),
    "Prescription file must be 8 MB or smaller."
  );
});

test("doctor profile update validation checks clinic assignment and field bounds", () => {
  assert.equal(
    validateDoctorAdminInput({
      name: "Dr. Aarav Mehta",
      phone: "invalid-phone",
      specialty: "Cardiology",
      experienceYears: 14,
      feeInr: 1200,
      bio: "Experienced cardiologist",
      clinicIds: ["clinic-1"]
    }),
    "Please enter a valid doctor phone number."
  );

  assert.equal(
    validateDoctorAdminInput({
      name: "Dr. Aarav Mehta",
      phone: "+91 90000 22221",
      specialty: "Cardiology",
      experienceYears: 14,
      feeInr: 1200,
      bio: "Experienced cardiologist",
      clinicIds: []
    }),
    "Assign at least one clinic to the doctor."
  );

  assert.equal(
    validateDoctorAdminInput({
      name: "Dr. Aarav Mehta",
      phone: "+91 90000 22221",
      specialty: "Cardiology",
      experienceYears: 14,
      feeInr: 1200,
      bio: "Experienced cardiologist",
      clinicIds: ["clinic-1"]
    }),
    null
  );
});

test("role-based access protection allows only admin, patient, or assigned doctor", () => {
  assert.equal(
    canAccessRoleProtectedResource({
      actorRole: "admin",
      actorUserId: "u-admin-1",
      patientId: "u-patient-1",
      doctorUserId: "u-doc-1"
    }),
    true
  );
  assert.equal(
    canAccessRoleProtectedResource({
      actorRole: "patient",
      actorUserId: "u-patient-1",
      patientId: "u-patient-1",
      doctorUserId: "u-doc-1"
    }),
    true
  );
  assert.equal(
    canAccessRoleProtectedResource({
      actorRole: "doctor",
      actorUserId: "u-doc-1",
      patientId: "u-patient-1",
      doctorUserId: "u-doc-1"
    }),
    true
  );
  assert.equal(
    canAccessRoleProtectedResource({
      actorRole: "patient",
      actorUserId: "u-patient-2",
      patientId: "u-patient-1",
      doctorUserId: "u-doc-1"
    }),
    false
  );
});

import Link from "next/link";

import {
  AdminClinicForm,
  AdminDoctorForm,
  AvailabilityForm,
  AvailabilityList,
  DoctorProfileForm,
  PrescriptionForm,
  StatusAction
} from "@/components/dashboard-actions";
import {
  buildAudioCallLink,
  buildDashboardData,
  buildInternalConsultationLink,
  buildJitsiUrl,
  getAvailabilityForDoctor,
  getSlotStatusTone
} from "@/lib/data";
import { requireSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { AppointmentStatus, AppointmentView, Clinic } from "@/lib/types";

export const dynamic = "force-dynamic";

const adminStatusFilters: Array<{ label: string; value: "all" | AppointmentStatus }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Completed", value: "completed" }
];

function isUpcomingAppointment(appointment: AppointmentView) {
  if (["completed", "cancelled", "rejected"].includes(appointment.status)) {
    return false;
  }

  return new Date(appointment.slot.startsAt).getTime() >= Date.now();
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const { session } = await requireSession();
  const params = searchParams ? await searchParams : undefined;
  const data = await buildDashboardData(session);
  const pendingCount = data.appointments.filter((appointment) => appointment.status === "pending").length;
  const confirmedCount = data.appointments.filter((appointment) => appointment.status === "confirmed").length;
  const completedCount = data.appointments.filter((appointment) => appointment.status === "completed").length;
  const currentDoctor = session.role === "doctor" ? data.doctors.find((entry) => entry.doctor.user.id === session.userId)?.doctor : undefined;
  const clinicsById = new Map(data.clinics.map((clinic) => [clinic.id, clinic]));
  const currentDoctorClinics = currentDoctor
    ? currentDoctor.clinicIds
        .map((clinicId) => clinicsById.get(clinicId))
        .filter((clinic): clinic is Clinic => Boolean(clinic))
    : [];
  const doctorAvailability = currentDoctor ? await getAvailabilityForDoctor(currentDoctor.id) : [];
  const upcomingAvailability = doctorAvailability
    .filter((slot) => new Date(slot.startsAt).getTime() >= Date.now())
    .map((slot) => ({
      ...slot,
      clinicName: clinicsById.get(slot.clinicId)?.name ?? "Clinic"
    }));
  const upcomingAppointments = data.appointments.filter(isUpcomingAppointment);
  const pastAppointments = data.appointments.filter((appointment) => !isUpcomingAppointment(appointment));
  const requestedStatus = params?.status;
  const selectedAdminStatus =
    requestedStatus && ["pending", "confirmed", "completed"].includes(requestedStatus) ? (requestedStatus as AppointmentStatus) : "all";
  const adminAppointments =
    session.role === "admin"
      ? data.appointments.filter((appointment) => (selectedAdminStatus === "all" ? true : appointment.status === selectedAdminStatus))
      : [];
  const prescriptionHistory =
    session.role === "patient"
      ? data.appointments
          .filter((appointment) => appointment.prescription)
          .sort((left, right) => {
            const leftDate = left.prescription ? new Date(left.prescription.issuedAt).getTime() : 0;
            const rightDate = right.prescription ? new Date(right.prescription.issuedAt).getTime() : 0;
            return rightDate - leftDate;
          })
      : [];

  const patientNextConfirmed = session.role === "patient" ? upcomingAppointments.find((appointment) => appointment.status === "confirmed") : undefined;
  const patientPendingCount = session.role === "patient" ? data.appointments.filter((appointment) => appointment.status === "pending").length : 0;

  function getPatientStatusCopy(appointment: AppointmentView) {
    if (appointment.status === "pending") {
      return "Waiting for clinic confirmation.";
    }
    if (appointment.status === "confirmed" && appointment.mode === "video") {
      return "Call links are ready below.";
    }
    if (appointment.status === "confirmed") {
      return "Your visit is confirmed.";
    }
    if (appointment.status === "completed") {
      return appointment.prescription ? "Prescription is available below." : "Visit completed.";
    }
    if (appointment.status === "cancelled") {
      return "This appointment was cancelled.";
    }
    if (appointment.status === "rejected") {
      return "This request was not approved.";
    }

    return "";
  }

  function renderAppointmentCard(appointment: AppointmentView) {
    const patientStatusCopy = session.role === "patient" ? getPatientStatusCopy(appointment) : null;

    return (
      <div className="appointment-card" key={appointment.id}>
        <div className="split">
          <div>
            <strong>{session.role === "patient" ? appointment.doctor.user.name : `${appointment.patient.name} with ${appointment.doctor.user.name}`}</strong>
            <p className="tiny muted">
              {appointment.clinic.name} • {appointment.mode} • {formatDateTime(appointment.slot.startsAt)}
            </p>
          </div>
          <span className={getSlotStatusTone(appointment.status)}>{appointment.status}</span>
        </div>

        <p className="tiny muted appointment-reason">{session.role === "patient" ? `Reason: ${appointment.symptoms}` : appointment.symptoms}</p>
        {patientStatusCopy ? <p className="tiny muted">{patientStatusCopy}</p> : null}
        {session.role === "admin" ? (
          <div className="record">
            <strong>Patient details</strong>
            <p className="tiny muted">
              {appointment.patient.name} • {appointment.patient.email} • {appointment.patient.phone}
            </p>
            <strong>Doctor details</strong>
            <p className="tiny muted">
              {appointment.doctor.user.name} • {appointment.doctor.specialty} • {appointment.doctor.user.email} • {appointment.doctor.user.phone}
            </p>
          </div>
        ) : null}
        {appointment.status === "confirmed" && appointment.mode === "video" ? (
          <div className="inline-actions">
            <Link className="button" href={buildInternalConsultationLink(appointment.id)}>
              Join consultation
            </Link>
            <Link className="ghost-button" href={buildAudioCallLink(appointment.id)}>
              Start audio call
            </Link>
            <a className="ghost-button" href={buildJitsiUrl(appointment.id)} rel="noreferrer" target="_blank">
              Backup link
            </a>
          </div>
        ) : null}

        {appointment.prescription ? (
          <div className="record">
            <strong>Prescription</strong>
            {appointment.prescription.medicines ? <p className="tiny muted">{appointment.prescription.medicines}</p> : null}
            {appointment.prescription.notes ? <p className="tiny muted">{appointment.prescription.notes}</p> : null}
            {appointment.prescription.attachmentUrl ? (
              <div className="inline-actions">
                <a
                  className="ghost-button"
                  href={`/api/prescriptions/${appointment.prescription.id}/file`}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open attached prescription
                </a>
                <a className="ghost-button" href={`/api/prescriptions/${appointment.prescription.id}/file?download=1`}>
                  Download file
                </a>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="inline-actions">
          {["doctor", "admin"].includes(session.role) && appointment.status === "pending" ? (
            <>
              <StatusAction action="confirmed" appointmentId={appointment.id} buttonLabel="Confirm" />
              <StatusAction action="rejected" appointmentId={appointment.id} buttonLabel="Reject" />
            </>
          ) : null}

          {session.role === "doctor" && appointment.status === "confirmed" ? (
            <>
              <StatusAction action="completed" appointmentId={appointment.id} buttonLabel="Mark completed" />
              <StatusAction action="cancelled" appointmentId={appointment.id} buttonLabel="Cancel appointment" />
            </>
          ) : null}

          {session.role === "patient" && ["pending", "confirmed"].includes(appointment.status) ? (
            <StatusAction
              action="cancelled"
              appointmentId={appointment.id}
              buttonLabel={appointment.status === "pending" ? "Cancel request" : "Cancel appointment"}
            />
          ) : null}

          {session.role === "admin" && ["pending", "confirmed"].includes(appointment.status) ? (
            <StatusAction action="cancelled" appointmentId={appointment.id} buttonLabel="Cancel" />
          ) : null}
        </div>

        {session.role === "doctor" && appointment.status === "completed" ? <PrescriptionForm appointmentId={appointment.id} /> : null}
      </div>
    );
  }

  return (
    <main className="dashboard">
      <div className="dashboard-shell">
        <section className="dashboard-banner">
          <div className="dashboard-banner__content">
            <span className="eyebrow">{session.role} workspace</span>
            <h1 className="page-title">Hello, {data.user.name.split(" ")[0]}.</h1>
            <p className="muted dashboard-copy">
              {session.role === "patient"
                ? "Track requests, join confirmed visits, and view your prescriptions."
                : session.role === "doctor"
                  ? "Your schedule and follow-up actions."
                  : "Review bookings and manage clinic flow."}
            </p>
          </div>
          <div className="dashboard-banner__stats">
            <div className="summary-grid">
              <div>
                <span className="tiny muted">Pending</span>
                <div className="metric-value">{pendingCount}</div>
              </div>
              <div>
                <span className="tiny muted">Confirmed</span>
                <div className="metric-value">{confirmedCount}</div>
              </div>
              <div>
                <span className="tiny muted">Completed</span>
                <div className="metric-value">{completedCount}</div>
              </div>
              <div>
                <span className="tiny muted">Notifications</span>
                <div className="metric-value">{data.notifications.length}</div>
              </div>
            </div>
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="stack">
            <article className="dashboard-card">
              <h3>Notifications</h3>
              <div className="record-list">
                {data.notifications.length ? (
                  data.notifications.slice(0, 4).map((item) => (
                    <div className="record" key={item.id}>
                      <strong>{item.message}</strong>
                      <p className="tiny muted">{formatDateTime(item.createdAt)}</p>
                    </div>
                  ))
                ) : (
                  <div className="empty">No notifications yet.</div>
                )}
              </div>
            </article>

            <article className="dashboard-card">
              <h3>{session.role === "admin" ? "Clinic network" : "Platform snapshot"}</h3>
              <div className="record-list">
                {data.clinics.slice(0, session.role === "admin" ? data.clinics.length : 2).map((clinic) => (
                  <div className="record" key={clinic.id}>
                    <strong>{clinic.name}</strong>
                    <p className="tiny muted">
                      {clinic.city} • {clinic.phone}
                    </p>
                  </div>
                ))}
              </div>
            </article>

            {session.role === "admin" ? (
              <article className="dashboard-card">
                <h3>Manage clinics</h3>
                <div className="record-list">
                  <AdminClinicForm />
                  {data.clinics.map((clinic) => (
                    <AdminClinicForm clinic={clinic} key={clinic.id} />
                  ))}
                </div>
              </article>
            ) : null}

            {session.role === "patient" ? (
              <article className="dashboard-card">
                <h3>Next steps</h3>
                <div className="record-list">
                  {patientNextConfirmed ? (
                    <div className="record">
                      <strong>Next confirmed visit</strong>
                      <p className="tiny muted">
                        {patientNextConfirmed.doctor.user.name} • {formatDateTime(patientNextConfirmed.slot.startsAt)}
                      </p>
                      <p className="tiny muted">
                        {patientNextConfirmed.mode === "video" ? "Open the call from your appointment card below." : "Visit the clinic at the scheduled time."}
                      </p>
                    </div>
                  ) : null}
                  {patientPendingCount ? (
                    <div className="record">
                      <strong>{patientPendingCount} request waiting</strong>
                      <p className="tiny muted">We will show the final status here as soon as the clinic reviews it.</p>
                    </div>
                  ) : null}
                  <div className="inline-actions">
                    <Link className="button" href="/doctors">
                      Book another appointment
                    </Link>
                  </div>
                </div>
              </article>
            ) : null}

            {session.role === "patient" ? (
              <article className="dashboard-card">
                <h3>Prescription history</h3>
                <div className="record-list">
                  {prescriptionHistory.length ? (
                    prescriptionHistory.map((appointment) => (
                      <div className="record" key={appointment.prescription?.id}>
                        <strong>{appointment.doctor.user.name}</strong>
                        <p className="tiny muted">
                          {appointment.doctor.specialty} • {formatDateTime(appointment.prescription?.issuedAt ?? appointment.updatedAt)}
                        </p>
                        {appointment.prescription?.medicines ? <p className="tiny muted">{appointment.prescription.medicines}</p> : null}
                        {appointment.prescription?.notes ? <p className="tiny muted">{appointment.prescription.notes}</p> : null}
                        {appointment.prescription?.attachmentUrl ? (
                          <div className="inline-actions">
                            <a className="ghost-button" href={`/api/prescriptions/${appointment.prescription.id}/file`} target="_blank" rel="noreferrer">
                              Open file
                            </a>
                            <a className="ghost-button" href={`/api/prescriptions/${appointment.prescription.id}/file?download=1`}>
                              Download file
                            </a>
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="empty">Your prescriptions will appear here after a doctor issues them.</div>
                  )}
                </div>
              </article>
            ) : null}

            {currentDoctor ? (
              <article className="dashboard-card">
                <div className="doctor-profile-panel">
                  {currentDoctor.avatarUrl ? (
                    <img alt={currentDoctor.user.name} className="doctor-avatar doctor-avatar--large" src={currentDoctor.avatarUrl} />
                  ) : (
                    <div className="doctor-avatar doctor-avatar--large doctor-avatar--fallback">{currentDoctor.specialty.slice(0, 2).toUpperCase()}</div>
                  )}
                  <div>
                    <h3>{currentDoctor.user.name}</h3>
                    <p className="tiny muted">
                      {currentDoctor.specialty} • {currentDoctor.experienceYears} yrs exp • {currentDoctor.rating.toFixed(1)} rating
                      {" • "}
                      {currentDoctor.ratingCount} {currentDoctor.ratingCount === 1 ? "person rated" : "people rated"}
                    </p>
                  </div>
                </div>
                <DoctorProfileForm
                  currentAvatarUrl={currentDoctor.avatarUrl}
                  currentBio={currentDoctor.bio}
                  currentSpecialty={currentDoctor.specialty}
                  currentExperienceYears={currentDoctor.experienceYears}
                  currentFeeInr={currentDoctor.feeInr}
                  currentLanguages={currentDoctor.languages}
                  currentRating={currentDoctor.rating}
                  currentRatingCount={currentDoctor.ratingCount}
                />
                <AvailabilityForm clinics={currentDoctorClinics} consultationModes={currentDoctor.consultationModes} />
                <AvailabilityList slots={upcomingAvailability} />
              </article>
            ) : null}

            {session.role === "admin" ? (
              <article className="dashboard-card">
                <h3>Manage doctors</h3>
                <div className="record-list">
                  {data.doctors.map(({ doctor }) => (
                    <AdminDoctorForm clinics={data.clinics} doctor={doctor} key={doctor.id} />
                  ))}
                </div>
              </article>
            ) : null}
          </section>

          <section className="stack">
            {session.role === "admin" ? (
              <article className="dashboard-card">
                <h3>Appointment requests</h3>
                <div className="inline-actions">
                  {adminStatusFilters.map((filter) => (
                    <Link
                      className={selectedAdminStatus === filter.value ? "button" : "ghost-button"}
                      href={filter.value === "all" ? "/dashboard" : `/dashboard?status=${filter.value}`}
                      key={filter.value}
                    >
                      {filter.label}
                    </Link>
                  ))}
                </div>
                <div className="record-list">
                  {adminAppointments.length ? (
                    adminAppointments.map((appointment) => renderAppointmentCard(appointment))
                  ) : (
                    <div className="empty">No appointments in this filter.</div>
                  )}
                </div>
              </article>
            ) : (
              <>
                <article className="dashboard-card">
                  <h3>Upcoming appointments</h3>
                  <div className="record-list">
                    {upcomingAppointments.length ? (
                      upcomingAppointments.map((appointment) => renderAppointmentCard(appointment))
                    ) : (
                      <div className="empty">
                        {session.role === "patient"
                          ? "No upcoming appointments yet. Browse doctors and request your first slot."
                          : "No upcoming appointments right now."}
                      </div>
                    )}
                  </div>
                </article>

                <article className="dashboard-card">
                  <h3>Past appointments</h3>
                  <div className="record-list">
                    {pastAppointments.length ? (
                      pastAppointments.map((appointment) => renderAppointmentCard(appointment))
                    ) : (
                      <div className="empty">No past appointments yet.</div>
                    )}
                  </div>
                </article>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

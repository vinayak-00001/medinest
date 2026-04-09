import { BookingForm } from "@/components/booking-form";
import { getDoctorDirectory } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

function getSpecialtyBadge(specialty: string) {
  if (specialty.toLowerCase().includes("cardio")) {
    return "CR";
  }
  if (specialty.toLowerCase().includes("general")) {
    return "GM";
  }
  return specialty.slice(0, 2).toUpperCase();
}

export default async function DoctorsPage() {
  const doctors = await getDoctorDirectory();

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div className="page-hero__content">
          <span className="eyebrow">Doctor directory</span>
          <h1 className="page-title">Choose a doctor and request a slot.</h1>
          <p className="muted">Compare specialty, fees, clinic, and next available time.</p>
        </div>
        <div className="page-hero__aside">
          <h3>How booking works</h3>
          <div className="pill-row">
            <span className="pill">1. Pick doctor</span>
            <span className="pill">2. Request slot</span>
            <span className="pill">3. Clinic confirms</span>
          </div>
        </div>
      </section>

      <div className="directory-layout">
        {doctors.map(({ doctor, clinics, nextSlots }) => (
          <article className="doctor-showcase" key={doctor.id}>
            <div className="doctor-header">
              <div className="doctor-identity">
                {doctor.avatarUrl ? (
                  <img alt={doctor.user.name} className="doctor-avatar" src={doctor.avatarUrl} />
                ) : (
                  <div className="doctor-avatar doctor-avatar--fallback">{getSpecialtyBadge(doctor.specialty)}</div>
                )}
                <div>
                  <div className="doctor-rating-row">
                    <span className="specialty-icon">{getSpecialtyBadge(doctor.specialty)}</span>
                    <span className="tiny muted">
                      {doctor.rating.toFixed(1)} rating • {doctor.ratingCount} {doctor.ratingCount === 1 ? "person" : "people"}
                    </span>
                  </div>
                  <h3>{doctor.user.name}</h3>
                  <p className="muted">{doctor.specialty}</p>
                </div>
              </div>
              <span className="pill pill--gold">{formatCurrency(doctor.feeInr)}</span>
            </div>

            <div className="pill-row">
              <span className="pill">{doctor.experienceYears} yrs exp</span>
              {doctor.consultationModes.map((mode) => (
                <span className="pill" key={mode}>
                  {mode}
                </span>
              ))}
            </div>
            <p className="tiny muted">{clinics.map((clinic) => `${clinic.name}, ${clinic.city}`).join(" • ")}</p>
            <p className="tiny muted">{doctor.bio}</p>

            {nextSlots.length ? (
              <div className="record-list">
                <p className="tiny muted">Available slots</p>
                {nextSlots.map((slot) => {
                  const clinic = clinics.find((entry) => entry.id === slot.clinicId)!;
                  return (
                    <div className="slot-card" key={slot.id}>
                      <div className="split">
                        <div>
                          <strong>{formatDateTime(slot.startsAt)}</strong>
                          <p className="tiny muted">
                            {clinic.name} • {slot.mode}
                          </p>
                        </div>
                        <span className="pill">{slot.status}</span>
                      </div>
                      <BookingForm doctorProfileId={doctor.id} clinicId={slot.clinicId} slotId={slot.id} mode={slot.mode} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty">No available slots right now for this doctor.</div>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}

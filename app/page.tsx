import Link from "next/link";

import { getAppointmentPreviews, getDoctorDirectory } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const revalidate = 60;

function getSpecialtyBadge(specialty: string) {
  if (specialty.toLowerCase().includes("cardio")) {
    return "CR";
  }
  if (specialty.toLowerCase().includes("general")) {
    return "GM";
  }
  return specialty.slice(0, 2).toUpperCase();
}

export default async function HomePage() {
  const [doctors, highlightedAppointments] = await Promise.all([getDoctorDirectory(), getAppointmentPreviews(2)]);
  const metrics = [
    { label: "Video visits", value: "Available" },
    { label: "Clinic visits", value: "Available" },
    { label: "Review time", value: "Fast" }
  ];

  return (
    <main>
      <section className="hero">
        <div className="hero-stage">
          <div className="hero__copy">
            <span className="eyebrow">Online medical appointments</span>
            <h1>Book a doctor in minutes.</h1>
            <p className="hero-lead">Sign up, request a slot, join the visit, and view your prescription in one place.</p>
            <div className="hero__actions">
              <Link className="button" href="/login?next=%2Fdoctors">
                Book now
              </Link>
              <Link className="ghost-button" href="/login">
                Sign in
              </Link>
            </div>
            <div className="metrics-band">
              {metrics.map((metric) => (
                <div className="metric-tile" key={metric.label}>
                  <span className="tiny muted">{metric.label}</span>
                  <span className="metric-value">{metric.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero__panel">
            <div className="highlight-card card">
              <span className="eyebrow">How it works</span>
              <h3>Simple from booking to follow-up.</h3>
              <div className="hero-timeline">
                <div className="timeline-item">
                  <span className="timeline-step">1</span>
                  <div>
                    <strong>Choose doctor</strong>
                    <p className="tiny muted">Browse by specialty, fee, and slot.</p>
                  </div>
                </div>
                <div className="timeline-item">
                  <span className="timeline-step">2</span>
                  <div>
                    <strong>Request slot</strong>
                    <p className="tiny muted">Track the status in your dashboard.</p>
                  </div>
                </div>
                <div className="timeline-item">
                  <span className="timeline-step">3</span>
                  <div>
                    <strong>Join visit</strong>
                    <p className="tiny muted">Call links and prescriptions stay online.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3>Upcoming care</h3>
              <div className="record-list">
                {highlightedAppointments.map((appointment) => (
                  <div className="record" key={appointment.id}>
                    <div className="split">
                      <strong>{appointment.patientName}</strong>
                      <span className="pill">{appointment.status}</span>
                    </div>
                    <p className="tiny muted">
                      {appointment.doctorName} • {appointment.mode} • {formatDateTime(appointment.startsAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <div className="section__header">
          <div>
            <span className="eyebrow">Why it works</span>
            <h2 className="page-title">Simple, fast, professional.</h2>
          </div>
        </div>
        <div className="feature-grid">
          <article className="card feature-card">
            <h3>Quick booking</h3>
            <p>Choose a doctor and request a slot fast.</p>
          </article>
          <article className="card feature-card">
            <h3>Video or clinic</h3>
            <p>Consult from home or visit the clinic.</p>
          </article>
          <article className="card feature-card">
            <h3>Digital prescription</h3>
            <p>Prescriptions stay available after the visit.</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section__header">
          <div>
            <span className="eyebrow">Featured doctors</span>
            <h2 className="page-title">Available now.</h2>
          </div>
          <Link className="ghost-button" href="/doctors">
            See all
          </Link>
        </div>
        <div className="grid grid--two">
          {doctors.map(({ doctor, clinics, nextSlots }) => (
            <article className="card doctor-showcase" key={doctor.id}>
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
                {doctor.languages.map((language) => (
                  <span className="pill" key={language}>
                    {language}
                  </span>
                ))}
              </div>
              <p className="tiny muted">
                {clinics.map((clinic) => clinic.name).join(", ")}
              </p>
              <p className="tiny muted">
                {nextSlots.length ? `Next available: ${formatDateTime(nextSlots[0]!.startsAt)}` : "New slots coming soon"}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

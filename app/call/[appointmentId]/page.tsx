import Link from "next/link";
import { notFound } from "next/navigation";

import { CallLauncher } from "@/components/call-launcher";
import { requireSession } from "@/lib/auth";
import { buildAudioJitsiUrl, buildJitsiRoomName, getAppointmentViewById } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CallPage({
  params
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { session } = await requireSession();
  const { appointmentId } = await params;
  const appointment = await getAppointmentViewById(appointmentId);

  if (!appointment) {
    notFound();
  }

  const canAccess =
    session.role === "admin" ||
    appointment.patientId === session.userId ||
    appointment.doctor.userId === session.userId;

  if (!canAccess) {
    notFound();
  }

  if (!["confirmed", "completed"].includes(appointment.status)) {
    return (
      <main className="page-shell">
        <span className="eyebrow">Doctor call</span>
        <h1 className="page-title">Call room is not available yet.</h1>
        <p className="muted">Calls open for confirmed or completed appointments only.</p>
        <div className="inline-actions">
          <Link className="button" href="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const callUrl = buildAudioJitsiUrl(appointment.id);
  const roomName = `${buildJitsiRoomName(appointment.id)}-audio`;

  return (
    <main className="page-shell">
      <span className="eyebrow">Doctor call</span>
      <h1 className="page-title">Start an audio call.</h1>
      <p className="muted">Use this for a quick voice conversation with the doctor without opening a full video meeting.</p>

      <section className="consultation-layout">
        <article className="card consultation-card consultation-card--primary">
          <span className="eyebrow">Ready to connect</span>
          <h3>{appointment.patient.name} with {appointment.doctor.user.name}</h3>
          <p className="tiny muted">
            {appointment.clinic.name} • {formatDateTime(appointment.slot.startsAt)}
          </p>
          <CallLauncher callUrl={callUrl} />
          <p className="tiny muted">Allow microphone access when your browser asks.</p>
        </article>

        <article className="card consultation-card">
          <h3>Call details</h3>
          <div className="record-list">
            <div className="record">
              <strong>Doctor</strong>
              <p className="tiny muted">
                {appointment.doctor.user.name} • {appointment.doctor.experienceYears} years experience
              </p>
            </div>
            <div className="record">
              <strong>Room ID</strong>
              <p className="tiny muted">{roomName}</p>
            </div>
            <div className="record">
              <strong>Phone fallback</strong>
              <p className="tiny muted">{appointment.doctor.user.phone}</p>
            </div>
          </div>
          <div className="inline-actions">
            <a className="ghost-button" href={`tel:${appointment.doctor.user.phone.replace(/\s+/g, "")}`}>
              Call doctor phone
            </a>
          </div>
        </article>

        <article className="card consultation-card">
          <h3>When to use this</h3>
          <div className="record-list">
            <div className="record">
              <strong>Quick follow-up</strong>
              <p className="tiny muted">Useful for short clarifications and check-ins.</p>
            </div>
            <div className="record">
              <strong>Low bandwidth</strong>
              <p className="tiny muted">Good fallback when video is unstable.</p>
            </div>
            <div className="record">
              <strong>Need video instead?</strong>
              <p className="tiny muted">Return to dashboard and use the consultation room.</p>
            </div>
          </div>
          <div className="inline-actions">
            <Link className="ghost-button" href="/dashboard">
              Back to dashboard
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}

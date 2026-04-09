import Link from "next/link";
import { notFound } from "next/navigation";

import { ConsultationLauncher } from "@/components/consultation-launcher";
import { requireSession } from "@/lib/auth";
import { buildJitsiRoomName, buildJitsiUrl, getAppointmentViewById } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ConsultationPage({
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

  if (appointment.mode !== "video" || appointment.status !== "confirmed") {
    return (
      <main className="page-shell">
        <span className="eyebrow">Consultation room</span>
        <h1 className="page-title">This video room is not available yet.</h1>
        <p className="muted">
          Video rooms open only for confirmed video appointments. Return to your dashboard and check the appointment status.
        </p>
        <div className="inline-actions">
          <Link className="button" href="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const jitsiUrl = buildJitsiUrl(appointment.id);
  const roomName = buildJitsiRoomName(appointment.id);

  return (
    <main className="page-shell">
      <span className="eyebrow">Video consultation</span>
      <h1 className="page-title">Join your appointment room.</h1>
      <p className="muted">Tap the main button below to open the call. If your browser blocks it, use the backup option.</p>

      <section className="consultation-layout">
        <article className="card consultation-card consultation-card--primary">
          <span className="eyebrow">Ready to join</span>
          <h3>{appointment.patient.name} with {appointment.doctor.user.name}</h3>
          <p className="tiny muted">
            {appointment.clinic.name} • {formatDateTime(appointment.slot.startsAt)}
          </p>
          <ConsultationLauncher jitsiUrl={jitsiUrl} />
          <p className="tiny muted">Allow camera and microphone permissions when your browser asks.</p>
        </article>

        <article className="card consultation-card">
          <h3>Meeting details</h3>
          <div className="record-list">
            <div className="record">
              <strong>Room ID</strong>
              <p className="tiny muted">{roomName}</p>
            </div>
            <div className="record">
              <strong>Direct room link</strong>
              <p className="tiny muted">{jitsiUrl}</p>
            </div>
          </div>
          <div className="inline-actions">
            <Link className="ghost-button" href="/dashboard">
              Back to dashboard
            </Link>
          </div>
        </article>

        <article className="card consultation-card">
          <h3>If video does not open</h3>
          <div className="record-list">
            <div className="record">
              <strong>1. Retry Join call</strong>
              <p className="tiny muted">Use the main button first. It opens in the current tab for better reliability.</p>
            </div>
            <div className="record">
              <strong>2. Use backup tab</strong>
              <p className="tiny muted">If the first attempt is blocked, open the backup tab instead.</p>
            </div>
            <div className="record">
              <strong>3. Check permissions</strong>
              <p className="tiny muted">Allow camera and microphone access in the browser.</p>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}

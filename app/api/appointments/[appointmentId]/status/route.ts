import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { updateAppointmentStatus } from "@/lib/data";
import { AppointmentStatus } from "@/lib/types";

type AllowedStatus = Extract<AppointmentStatus, "confirmed" | "rejected" | "cancelled" | "completed">;

const allowedStatuses = new Set<AllowedStatus>(["confirmed", "rejected", "cancelled", "completed"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please log in to update appointments." }, { status: 401 });
    }

    const { appointmentId } = await context.params;
    const body = await request.json();
    const status = body.status as AllowedStatus;

    if (!allowedStatuses.has(status)) {
      return NextResponse.json({ error: "Unsupported appointment status." }, { status: 400 });
    }

    const appointment = await updateAppointmentStatus({
      appointmentId,
      actorRole: session.role,
      actorUserId: session.userId,
      status,
      videoCallLink: body.videoCallLink ? String(body.videoCallLink) : undefined
    });

    return NextResponse.json({ appointment });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update appointment." }, { status: 400 });
  }
}
